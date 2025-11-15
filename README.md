# Kasa Speaker Controller

Desktop application to control Kasa smart plug speakers with automatic startup and shutdown capabilities.

## Features

- 🔌 Control Kasa smart strip plugs (turn on/off individual speakers)
- 🚀 Auto-start speakers on application launch
- 🛑 Hybrid shutdown: Manual "Turn Off & Shutdown" button + automatic before-quit detection
- 💾 Persistent settings and logs
- 🎛️ System tray integration for background operation
- 📊 Real-time status monitoring
- 🔄 Connection retry logic with automatic reconnection

## Tech Stack

- **Electron** - Cross-platform desktop framework
- **React + TypeScript** - Modern UI with type safety
- **Vite** - Fast build tool
- **tplink-smarthome-api** - Kasa device control
- **electron-store** - Persistent configuration

## Prerequisites

- Node.js 18+ and npm
- Kasa smart strip on local network
- **Windows**: Use PowerShell or CMD (Git Bash has issues with Electron module loading)

## IMPORTANT: Git Bash Issues on Windows

**⚠️ Do NOT use Git Bash to run this application on Windows!**

Git Bash/MSYS2 has a known issue where `require('electron')` returns a string path instead of the Electron API object. This causes the application to crash with:

```
TypeError: Cannot read properties of undefined (reading 'whenReady')
```

**Solutions:**
1. ✅ Use PowerShell (recommended)
2. ✅ Use Command Prompt (cmd.exe)
3. ✅ Use Windows Terminal with PowerShell
4. ✅ Run the packaged installer after building

## Installation

```powershell
# Clone the repository
git clone <repository-url>
cd kasa-speaker-auto

# Install dependencies (can be done in Git Bash)
npm install
```

## Running the Application

**In PowerShell or CMD:**

```powershell
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

## Building for Distribution

### Creating a Windows Installer (.exe)

**Important**: Close the app before building to avoid file locking issues.

1. **Build the installer:**
   ```powershell
   npm run package:win
   ```

2. **Find your builds:**
   - **Installer**: `installer/Kasa Speaker Controller Setup 1.0.1.exe` (~77 MB)
   - **Portable**: `installer/Kasa Speaker Controller-1.0.1-portable.exe` (~77 MB)

3. **Installation Options:**

   **Standard Install** (recommended):
   - Double-click the Setup `.exe` file
   - During installation, you'll be asked if you want a Desktop shortcut
   - Installs to `C:\Program Files\Kasa Speaker Controller\`
   - Creates Start Menu shortcut
   - Settings stored in `%APPDATA%\kasa-speaker-controller`
   - Easy uninstall from Windows Settings

   **Portable Mode** (no installation):
   - Extract the portable `.exe` to any folder (e.g., USB drive, Dropbox)
   - Create a text file named `portable.txt` in the same folder as the `.exe`
   - Run the `.exe` directly - no installation needed
   - All settings stored in the same folder as the app
   - Perfect for running from USB drives or keeping everything in one place

**Troubleshooting Build Issues:**

If you get the error: `The process cannot access the file because it is being used by another process`

1. **Close the app completely:**
   - Right-click the system tray icon → "Quit"
   - Or open Task Manager (`Ctrl+Shift+Esc`) and end all "Kasa Speaker Controller" and "electron.exe" processes

2. **Delete locked folders:**
   ```powershell
   Remove-Item -Recurse -Force installer -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force release -ErrorAction SilentlyContinue
   ```

3. **Wait a few seconds**, then rebuild:
   ```powershell
   npm run package:win
   ```

**Other tips:**
- Run in PowerShell (not Git Bash) for best results
- If still stuck, restart your computer to release all file locks

**Advanced Options:**
```powershell
# Build for all platforms (Windows, Linux, Mac)
npm run package

# Build without code signing (faster, but shows security warning)
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run package:win
```

## Adding to Windows Startup

To automatically launch the app when Windows starts:

### Method 1: Startup Folder (Recommended)

1. **Open the Startup folder:**
   - Press `Win + R`
   - Type: `shell:startup`
   - Press Enter

2. **Create a shortcut:**
   - Find your installed app at: `C:\Program Files\Kasa Speaker Controller\Kasa Speaker Controller.exe`
   - Right-click the `.exe` file → "Create shortcut"
   - Move the shortcut to the Startup folder you opened in step 1

3. **Verify:**
   - Restart your computer
   - The app should launch automatically and minimize to system tray

### Method 2: Task Scheduler (Advanced)

For more control (delayed start, run as admin, etc.):

1. Open Task Scheduler (`Win + R` → `taskschd.msc`)
2. Click "Create Basic Task"
3. Name: "Kasa Speaker Controller"
4. Trigger: "When I log on"
5. Action: "Start a program"
6. Program: `C:\Program Files\Kasa Speaker Controller\Kasa Speaker Controller.exe`
7. Finish and test by logging out/in

## Configuration

On first run, configure:
- Kasa strip IP address
- Plug indices for your speakers
- Auto-start preferences
- Log retention settings

## Project Structure

```
src/
├── main/
│   ├── main.ts          # Electron main process
│   ├── kasaManager.ts   # Kasa device communication
│   └── preload.ts       # Secure IPC bridge
├── renderer/
│   ├── App.tsx          # React main component
│   └── components/      # UI components
└── shared/
    ├── types.ts         # TypeScript interfaces
    └── constants.ts     # App constants
```

## Docker Support

See [DOCKER.md](DOCKER.md) for containerized deployment options.

**Note**: Docker successfully runs the app in Linux environments (proving the code is correct), but has limitations:
- No GUI display without X11 forwarding
- Network connectivity issues on Windows + WSL2
- Best suited for headless/server deployment

## Troubleshooting

### "Cannot read properties of undefined (reading 'whenReady')"
- **Cause**: Running in Git Bash on Windows
- **Solution**: Use PowerShell or CMD instead

### "Cannot find module electron/cli.js"
- **Cause**: Corrupted electron installation
- **Solution**: Remove and reinstall electron
  ```powershell
  Remove-Item -Recurse -Force node_modules\electron
  npm install electron@28.0.0
  ```

### Network Connection Fails
- Verify Kasa device IP address
- Ensure device is on the same network
- Check firewall settings

## License

MIT
