// scripts/build-sidecar.js
// Prepare Next.js standalone build for Tauri bundling

const fs = require('fs');
const path = require('path');

console.log('Preparing Next.js standalone build for Tauri...');

const standalonePath = path.join(__dirname, '..', '.next', 'standalone');
const staticPath = path.join(__dirname, '..', '.next', 'static');
const publicPath = path.join(__dirname, '..', 'public');
const resourcesPath = path.join(__dirname, '..', 'src-tauri', 'resources');
const serverPath = path.join(resourcesPath, 'server');

// Remove old resources
if (fs.existsSync(serverPath)) {
  fs.rmSync(serverPath, { recursive: true, force: true });
}

// Create resources directory
fs.mkdirSync(serverPath, { recursive: true });

// Copy standalone build - ONLY necessary files
if (fs.existsSync(standalonePath)) {
  console.log('✓ Copying Next.js standalone build...');
  
  // Only copy these specific files/folders from standalone
  const filesToCopy = [
    'server.js',           // Next.js server entry
    '.next',               // Compiled Next.js app
    'node_modules',        // Dependencies
  ];
  
  filesToCopy.forEach(item => {
    const srcPath = path.join(standalonePath, item);
    const destPath = path.join(serverPath, item);
    
    if (fs.existsSync(srcPath)) {
      copyRecursiveSync(srcPath, destPath);
      console.log(`  ✓ Copied ${item}`);
    } else {
      console.warn(`  ⚠ ${item} not found in standalone build`);
    }
  });
  
  // Copy static files (separately from standalone .next)
  if (fs.existsSync(staticPath)) {
    const targetStaticPath = path.join(serverPath, '.next', 'static');
    fs.mkdirSync(path.dirname(targetStaticPath), { recursive: true });
    copyRecursiveSync(staticPath, targetStaticPath);
    console.log('  ✓ Copied static files');
  }
  
  // Copy public files
  if (fs.existsSync(publicPath)) {
    const targetPublicPath = path.join(serverPath, 'public');
    copyRecursiveSync(publicPath, targetPublicPath);
    console.log('  ✓ Copied public files');
  }
  
  // Fix hardcoded paths in server.js
  const serverJsPath = path.join(serverPath, 'server.js');
  if (fs.existsSync(serverJsPath)) {
    let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');
    // Replace absolute path with __dirname (relative path)
    const absolutePathPattern = /"outputFileTracingRoot":"[^"]+"/g;
    serverJsContent = serverJsContent.replace(absolutePathPattern, '"outputFileTracingRoot":__dirname');
    // Fix turbopack root path
    const turbopackRootPattern = /"turbopack":\{"root":"[^"]+"\}/g;
    serverJsContent = serverJsContent.replace(turbopackRootPattern, '"turbopack":{"root":__dirname}');
    // Fix default port from 3000 to 3002
    serverJsContent = serverJsContent.replace(
      /const currentPort = parseInt\(process\.env\.PORT, 10\) \|\| 3000/,
      'const currentPort = parseInt(process.env.PORT, 10) || 3002'
    );
    fs.writeFileSync(serverJsPath, serverJsContent);
    console.log('  ✓ Fixed hardcoded paths and default port in server.js');
  }
  
  console.log('✓ Next.js build prepared for bundling');
  console.log(`✓ Total size: ${getFolderSize(serverPath)} MB`);
  console.log('Note: Node.js runtime is still required on the target system.');
} else {
  console.error('✗ Next.js standalone build not found. Run npm run build first.');
  process.exit(1);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function getFolderSize(folderPath) {
  let totalSize = 0;
  
  function calculateSize(itemPath) {
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      fs.readdirSync(itemPath).forEach(child => {
        calculateSize(path.join(itemPath, child));
      });
    } else {
      totalSize += stats.size;
    }
  }
  
  calculateSize(folderPath);
  return (totalSize / 1024 / 1024).toFixed(2);
}

console.log('Done!');
