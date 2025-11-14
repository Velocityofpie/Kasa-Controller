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

```powershell
# Build Windows installer
npm run package:win

# The installer will be in the release/ folder
```

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
