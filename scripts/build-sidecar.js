// scripts/build-sidecar.js
// Prepare Next.js standalone build for Tauri sidecar

const fs = require('fs');
const path = require('path');

console.log('Preparing Next.js standalone build for sidecar...');

const standalonePath = path.join(__dirname, '..', '.next', 'standalone');
const sidecarPath = path.join(__dirname, '..', 'src-tauri', 'binaries');

// Create sidecar directory if it doesn't exist
if (!fs.existsSync(sidecarPath)) {
  fs.mkdirSync(sidecarPath, { recursive: true });
}

// Copy standalone build
if (fs.existsSync(standalonePath)) {
  console.log('✓ Next.js standalone build found');
  console.log('Note: You need to manually package Node.js with the standalone build for production.');
  console.log('For now, the application requires Node.js to be installed on the target system.');
} else {
  console.error('✗ Next.js standalone build not found. Run npm run build first.');
  process.exit(1);
}
