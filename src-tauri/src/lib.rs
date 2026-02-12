use std::process::{Command, Child};
use std::sync::{Mutex, Arc};
use std::thread;
use std::time::Duration;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use tauri::{Manager, Emitter};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

struct AppState {
    server_process: Mutex<Option<Child>>,
    server_logs: Arc<Mutex<Vec<String>>>,
}

#[tauri::command]
fn get_server_logs(state: tauri::State<AppState>) -> Vec<String> {
    state.server_logs.lock().unwrap().clone()
}

#[tauri::command]
fn get_server_status(state: tauri::State<AppState>) -> bool {
    state.server_process.lock().unwrap().is_some()
}

// Find Node.js executable
fn find_node_executable() -> Result<PathBuf, String> {
    // Try 'node' command first
    if let Ok(output) = Command::new("node").arg("--version").output() {
        if output.status.success() {
            return Ok(PathBuf::from("node"));
        }
    }
    
    // On Windows, try common installation paths
    #[cfg(target_os = "windows")]
    {
        let common_paths = vec![
            r"C:\Program Files\nodejs\node.exe",
            r"C:\Program Files (x86)\nodejs\node.exe",
        ];
        
        for path in common_paths {
            let node_path = PathBuf::from(path);
            if node_path.exists() {
                if let Ok(output) = Command::new(&node_path).arg("--version").output() {
                    if output.status.success() {
                        let version = String::from_utf8_lossy(&output.stdout);
                        log_to_file(&format!("Found Node.js at {}: {}", path, version.trim()));
                        return Ok(node_path);
                    }
                }
            }
        }
        
        // Try to find from PATH environment
        if let Ok(path_env) = std::env::var("PATH") {
            for path in path_env.split(';') {
                let node_path = PathBuf::from(path).join("node.exe");
                if node_path.exists() {
                    if let Ok(output) = Command::new(&node_path).arg("--version").output() {
                        if output.status.success() {
                            return Ok(node_path);
                        }
                    }
                }
            }
        }
    }
    
    Err("Node.js not found. Please ensure Node.js is installed and in PATH.".to_string())
}

// Simple file logger
fn log_to_file(message: &str) {
    let log_path = std::env::temp_dir().join("cworker_debug.log");
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let _ = writeln!(file, "[{}] {}", timestamp, message);
    }
}

fn start_next_server(app_handle: &tauri::AppHandle) -> Result<Child, Box<dyn std::error::Error>> {
    log_to_file("=== Starting Next.js server ===");
    let _ = app_handle.emit("startup-status", "Locating Node.js...");
    
    // Use resolve to get the correct resource path
    let server_path = match app_handle
        .path()
        .resolve("resources/server", tauri::path::BaseDirectory::Resource) {
        Ok(path) => path,
        Err(e) => {
            let err_msg = format!("Failed to resolve server path: {}", e);
            log_to_file(&err_msg);
            eprintln!("[ERROR] {}", err_msg);
            return Err(err_msg.into());
        }
    };
    
    let server_js = server_path.join("server.js");
    
    log_to_file(&format!("Server path: {:?}", server_path));
    log_to_file(&format!("Server JS path: {:?}", server_js));
    
    println!("[INFO] Server path: {:?}", server_path);
    println!("[INFO] Server JS path: {:?}", server_js);
    
    if !server_js.exists() {
        let error_msg = format!("Server file not found at: {:?}", server_js);
        log_to_file(&format!("ERROR: {}", error_msg));
        eprintln!("[ERROR] {}", error_msg);
        
        // List available files for debugging
        if let Ok(entries) = fs::read_dir(&server_path) {
            log_to_file("Files in server_path:");
            eprintln!("[DEBUG] Files in server_path:");
            for entry in entries {
                if let Ok(entry) = entry {
                    let entry_path = format!("  - {:?}", entry.path());
                    log_to_file(&entry_path);
                    eprintln!("{}", entry_path);
                }
            }
        }
        
        return Err("Next.js server not found".into());
    }

    // Find Node.js executable
    let _ = app_handle.emit("startup-status", "Searching for Node.js executable...");
    let node_path = match find_node_executable() {
        Ok(path) => {
            log_to_file(&format!("Node.js found: {:?}", path));
            let _ = app_handle.emit("startup-status", format!("Found Node.js: {:?}", path));
            path
        }
        Err(e) => {
            log_to_file(&format!("ERROR: {}", e));
            let _ = app_handle.emit("startup-status", format!("Error: {}", e));
            return Err(e.into());
        }
    };

    log_to_file("Starting Node.js server process...");
    println!("[INFO] Starting Node.js server...");
    let _ = app_handle.emit("startup-status", "Starting server process...");
    
    let mut cmd = Command::new(&node_path);
    cmd.arg(server_js.to_str().unwrap())
        .current_dir(server_path)
        .env("PORT", "3002");
    
    // Hide console window on Windows
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    let child = cmd.spawn()?;

    let pid_msg = format!("Server process started with PID: {}", child.id());
    log_to_file(&pid_msg);
    println!("[INFO] {}", pid_msg);
    
    Ok(child)
}

fn wait_for_server(max_retries: u32, app_handle: &tauri::AppHandle) -> bool {
    log_to_file("Waiting for server to be ready...");
    println!("[INFO] Waiting for server to be ready...");
    let _ = app_handle.emit("startup-status", "Waiting for server to respond...");
    
    for i in 0..max_retries {
        thread::sleep(Duration::from_millis(500));
        
        if i % 4 == 0 {
            let _ = app_handle.emit("startup-status", format!("Server starting... ({}/30s)", i/2));
        }
        
        match ureq::get("http://localhost:3002").call() {
            Ok(response) => {
                if response.status() == 200 {
                    let success_msg = format!("Server is ready after {} retries", i + 1);
                    log_to_file(&format!("SUCCESS: {}", success_msg));
                    println!("[SUCCESS] {}", success_msg);
                    return true;
                }
            }
            Err(e) => {
                if i % 10 == 0 {  // Log every 5 seconds
                    let retry_msg = format!("Retry {}/{}: {}", i + 1, max_retries, e);
                    log_to_file(&retry_msg);
                    println!("[DEBUG] {}", retry_msg);
                }
            }
        }
    }
    
    let error_msg = format!("Server failed to start after {} retries", max_retries);
    log_to_file(&format!("ERROR: {}", error_msg));
    eprintln!("[ERROR] {}", error_msg);
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  log_to_file("=== CWorker application starting ===");
  log_to_file(&format!("Debug mode: {}", cfg!(debug_assertions)));
  
  tauri::Builder::default()
    .register_asynchronous_uri_scheme_protocol("app", move |_app, request, responder| {
      // Proxy all requests to localhost:3002
      let uri_str = request.uri().to_string();
      let url = uri_str.replace("app://localhost", "http://localhost:3002");
      
      tauri::async_runtime::spawn(async move {
        match ureq::get(&url).call() {
          Ok(response) => {
            let status = response.status();
            
            // Extract headers before consuming response
            let content_type = response.header("Content-Type")
              .unwrap_or("application/octet-stream")
              .to_string();
            
            let cache_control = response.header("Cache-Control")
              .map(|s| s.to_string());
            
            // Now consume response to read body
            let mut reader = response.into_reader();
            let mut body = Vec::new();
            let _ = std::io::Read::read_to_end(&mut reader, &mut body);
            
            // Build response with headers
            let mut http_response = tauri::http::Response::builder()
              .status(status)
              .header("Content-Type", content_type)
              .header("Access-Control-Allow-Origin", "*");
            
            // Add cache-control if present
            if let Some(cc) = cache_control {
              http_response = http_response.header("Cache-Control", cc);
            }
            
            responder.respond(http_response.body(body).unwrap());
          }
          Err(e) => {
            log_to_file(&format!("Proxy error for {}: {}", url, e));
            responder.respond(
              tauri::http::Response::builder()
                .status(500)
                .body(format!("Proxy error: {}", e).into_bytes())
                .unwrap()
            );
          }
        }
      });
    })
    .invoke_handler(tauri::generate_handler![get_server_logs, get_server_status])
    .setup(|app| {
      log_to_file("Tauri setup phase started");
      
      // Create and show splash window with embedded HTML
      let _splash_window = if !cfg!(debug_assertions) {
          log_to_file("Creating splash window...");
          
          use tauri::WebviewWindowBuilder;
          use tauri::WebviewUrl;
          
          // Embed splash HTML as data URL
          let splash_html = include_str!("../static/splash.html");
          let data_url = format!("data:text/html;base64,{}", 
              base64::Engine::encode(&base64::engine::general_purpose::STANDARD, splash_html.as_bytes())
          );
          
          log_to_file("Creating splash window with data URL");
          
          match WebviewWindowBuilder::new(app, "splash", WebviewUrl::External(data_url.parse().unwrap()))
              .title("CWorker - Starting")
              .inner_size(500.0, 380.0)
              .center()
              .resizable(false)
              .decorations(false)
              .always_on_top(true)
              .build() {
              Ok(window) => {
                  log_to_file("Splash window created successfully");
                  Some(window)
              }
              Err(e) => {
                  log_to_file(&format!("Failed to create splash window: {}", e));
                  None
              }
          }
      } else {
          None
      };
      
      // Always enable logging regardless of build mode
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(log::LevelFilter::Info)
          .build(),
      )?;
      
      log_to_file("Log plugin initialized");
      
      // Start Next.js server in production mode
      if !cfg!(debug_assertions) {
          log_to_file("Production mode: Starting embedded Next.js server");
          println!("[INFO] Production mode: Starting embedded Next.js server");
          
          let server_logs = Arc::new(Mutex::new(Vec::<String>::new()));
          server_logs.lock().unwrap().push("Server starting...".to_string());
          
          match start_next_server(&app.handle()) {
              Ok(child) => {
                  log_to_file("Server started successfully, managing state...");
                  server_logs.lock().unwrap().push(format!("Server process started with PID: {}", child.id()));
                  
                  app.manage(AppState {
                      server_process: Mutex::new(Some(child)),
                      server_logs: server_logs.clone(),
                  });
                  
                  // Wait for server to be ready (max 30 seconds)
                  if !wait_for_server(60, &app.handle()) {
                      log_to_file("ERROR: Server startup timeout");
                      server_logs.lock().unwrap().push("ERROR: Server startup timeout".to_string());
                      let _ = app.handle().emit("startup-status", "ERROR: Server startup timeout");
                      eprintln!("[ERROR] Failed to start Next.js server - timeout");
                      eprintln!("[ERROR] Please ensure Node.js is installed and in PATH");
                      eprintln!("[ERROR] Required: Node.js v18 or higher");
                      
                      return Err("Server startup timeout - check if Node.js is installed".into());
                  }
                  
                  log_to_file("Server is ready, setup complete");
                  server_logs.lock().unwrap().push("Server is ready!".to_string());
                  let _ = app.handle().emit("startup-status", "Server ready! Loading application...");
                  
                  // Wait a moment to show the "ready" message, then show main window and close splash
                  let app_handle = app.handle().clone();
                  thread::spawn(move || {
                      thread::sleep(Duration::from_millis(1000));
                      
                      log_to_file("Opening main window...");
                      eprintln!("[DEBUG] Opening main window...");
                      
                      // Create and show main window with Next.js URL via custom protocol
                      use tauri::WebviewWindowBuilder;
                      use tauri::WebviewUrl;
                      
                      let main_url = WebviewUrl::App("app://localhost/".into());
                      log_to_file(&format!("Main window URL: {:?}", main_url));
                      
                      match WebviewWindowBuilder::new(&app_handle, "main", main_url)
                          .title("CWorker")
                          .inner_size(1280.0, 860.0)
                          .center()
                          .resizable(true)
                          .visible(true)  // Explicitly set visible
                          .build() {
                          Ok(window) => {
                              log_to_file("Main window created successfully");
                              eprintln!("[DEBUG] Main window created successfully");
                              let _ = window.show();
                              let _ = window.set_focus();
                              log_to_file("Main window shown and focused");
                              
                              // Close splash after main window is shown
                              thread::sleep(Duration::from_millis(500));
                              if let Some(splash) = app_handle.get_webview_window("splash") {
                                  log_to_file("Closing splash window...");
                                  eprintln!("[DEBUG] Closing splash window...");
                                  let _ = splash.close();
                                  log_to_file("Splash window closed");
                              } else {
                                  log_to_file("Splash window not found (may have already closed)");
                              }
                          }
                          Err(e) => {
                              let err_msg = format!("Failed to create main window: {}", e);
                              log_to_file(&format!("ERROR: {}", err_msg));
                              eprintln!("[ERROR] {}", err_msg);
                              
                              // Try to close splash anyway
                              if let Some(splash) = app_handle.get_webview_window("splash") {
                                  let _ = splash.close();
                              }
                          }
                      }
                  });
              }
              Err(e) => {
                  let error_msg = format!("Failed to start server: {}", e);
                  log_to_file(&format!("ERROR: {}", error_msg));
                  let _ = app.handle().emit("startup-status", format!("ERROR: {}", error_msg));
                  eprintln!("[ERROR] {}", error_msg);
                  eprintln!("[ERROR] Please check:");
                  eprintln!("[ERROR]   1. Node.js is installed (node --version)");
                  eprintln!("[ERROR]   2. Server files are in the correct location");
                  
                  return Err(e.to_string().into());
              }
          }
      } else {
          log_to_file("Debug mode: Expecting Next.js dev server at http://localhost:3002");
          println!("[INFO] Debug mode: Expecting Next.js dev server at http://localhost:3002");
          
          let server_logs = Arc::new(Mutex::new(Vec::<String>::new()));
          server_logs.lock().unwrap().push("Debug mode: Using dev server".to_string());
          
          app.manage(AppState {
              server_process: Mutex::new(None),
              server_logs,
          });
          
          // In debug mode, show main window immediately
          if let Some(main) = app.get_webview_window("main") {
              let _ = main.show();
              let _ = main.set_focus();
          }
      }
      
      log_to_file("Setup phase completed successfully");
      Ok(())
    })
    .on_page_load(|window, _payload| {
        // Additional initialization if needed
        println!("[INFO] Page loaded in window: {}", window.label());
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
