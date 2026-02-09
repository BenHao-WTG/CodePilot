using Microsoft.Web.WebView2.Core;
using System;
using System.Threading.Tasks;
using System.Windows;

namespace CodePilot
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private readonly IApiServer _apiServer;

        public MainWindow(IApiServer apiServer)
        {
            InitializeComponent();
            _apiServer = apiServer;
            
            Loaded += MainWindow_Loaded;
            Closing += MainWindow_Closing;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                // Initialize WebView2
                await InitializeWebView2Async();
                
                // Start the API server
                await _apiServer.StartAsync();
                
                // Navigate to the Next.js application
                webView.Source = new Uri($"http://localhost:{_apiServer.Port}");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to initialize application: {ex.Message}", 
                    "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                Application.Current.Shutdown();
            }
        }

        private async Task InitializeWebView2Async()
        {
            var env = await CoreWebView2Environment.CreateAsync(null, 
                System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                    "CodePilot", "WebView2Cache"));
            
            await webView.EnsureCoreWebView2Async(env);
            
            // Configure WebView2 settings
            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            webView.CoreWebView2.Settings.AreDefaultScriptDialogsEnabled = true;
            
            // Add message passing capability
            webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        }

        private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            // Handle messages from the web content
            var message = e.TryGetWebMessageAsString();
            Console.WriteLine($"Message from web: {message}");
            
            // You can send messages back using:
            // webView.CoreWebView2.PostWebMessageAsString("response");
        }

        private async void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            try
            {
                await _apiServer.StopAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error stopping API server: {ex.Message}");
            }
        }
    }
}
