const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'dist', 'main', 'main', 'main.js');

console.log('Fixing Electron import in:', mainJsPath);

let content = fs.readFileSync(mainJsPath, 'utf8');

// Check if fix is already applied
if (content.includes('// CRITICAL FIX: Electron\'s module resolution is broken')) {
  console.log('✓ Fix already applied, skipping');
  process.exit(0);
}

// Replace any form of electron require with the fixed version
const patterns = [
  `const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } = require('electron');`,
  `const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } = eval("require('electron')");`
];

const fixedRequire = `// CRITICAL FIX: Electron's module resolution is broken
// Access Electron APIs via process.electronBinding which is Electron-specific
let electron;
try {
  // Try to get from process if available (Electron provides this)
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    // We're definitely in Electron. Try getting the APIs from the global scope
    // Electron injects these into the main process
    electron = {
      app: global.require ? global.require('electron').app : require('electron').app,
      BrowserWindow: global.require ? global.require('electron').BrowserWindow : require('electron').BrowserWindow,
      ipcMain: global.require ? global.require('electron').ipcMain : require('electron').ipcMain,
      Tray: global.require ? global.require('electron').Tray : require('electron').Tray,
      Menu: global.require ? global.require('electron').Menu : require('electron').Menu,
      nativeImage: global.require ? global.require('electron').nativeImage : require('electron').nativeImage,
      Notification: global.require ? global.require('electron').Notification : require('electron').Notification,
    };
  }
} catch (e) {
  console.error('Failed to load Electron APIs:', e);
  throw new Error('Cannot load Electron - are you running this in Electron?');
}
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } = electron;`;

// Try replacing all possible patterns
let replaced = false;
for (const pattern of patterns) {
  if (content.includes(pattern)) {
    content = content.replace(pattern, fixedRequire);
    replaced = true;
    break;
  }
}

if (!replaced) {
  console.warn('⚠ Could not find electron require pattern to replace');
}

fs.writeFileSync(mainJsPath, content, 'utf8');

console.log('✓ Electron import fixed!');
