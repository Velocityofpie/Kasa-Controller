# Auto-Update Documentation

This document explains how the auto-update feature works and how to publish updates for the Kasa Speaker Controller.

![Dashboard](docs/Kasa_Speaker_Controller_U6fLMdWyok.png)

## How It Works

The app uses `electron-updater` to check for and download updates from GitHub Releases. When a new version is available:

1. The app automatically checks for updates 5 seconds after startup
2. Users can manually check via **Settings > About & Updates > Check for Updates**
3. If an update is found, users can download it
4. Once downloaded, users can restart to install

## Setup Requirements

### 1. Configure GitHub Repository

Update the `publish` section in `package.json` with your GitHub details:

```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_GITHUB_USERNAME",
    "repo": "KASA-Speaker-Auto",
    "releaseType": "release"
  }
]
```

Replace:
- `YOUR_GITHUB_USERNAME` with your actual GitHub username
- `KASA-Speaker-Auto` with your repository name (if different)

### 2. GitHub Token (for publishing)

To publish releases, you need a GitHub Personal Access Token:

1. Go to GitHub > Settings > Developer settings > Personal access tokens
2. Generate a new token with `repo` scope
3. Set it as an environment variable:
   ```bash
   # Windows PowerShell
   $env:GH_TOKEN = "your-token-here"

   # Windows CMD
   set GH_TOKEN=your-token-here
   ```

## Publishing an Update

### Step 1: Bump the Version

Update the version in `package.json`:

```json
{
  "version": "1.0.4"
}
```

Follow semantic versioning:
- **Patch** (1.0.x): Bug fixes
- **Minor** (1.x.0): New features, backwards compatible
- **Major** (x.0.0): Breaking changes

### Step 2: Build the Application

```bash
npm run package:win
```

This creates installers in the `installer` folder:
- `Kasa Speaker Controller Setup 1.0.4.exe` - NSIS installer
- `Kasa Speaker Controller-1.0.4-portable.exe` - Portable version
- `latest.yml` - Update manifest (required for auto-update)

### Step 3: Create a GitHub Release

#### Option A: Manual Upload

1. Go to your GitHub repository
2. Click **Releases** > **Create a new release**
3. Create a new tag (e.g., `v1.0.4`)
4. Upload these files from the `installer` folder:
   - `Kasa Speaker Controller Setup 1.0.4.exe`
   - `latest.yml`
5. Publish the release

#### Option B: Automatic Publishing

Use electron-builder's publish command:

```bash
# Set your GitHub token first
$env:GH_TOKEN = "your-token-here"

# Build and publish
npx electron-builder --win --publish always
```

This automatically creates a GitHub release with all necessary files.

## Update Flow

### User Experience

1. **Automatic Check**: App checks for updates 5 seconds after launch
2. **Notification**: If an update is found, the Settings page shows "Update available: vX.X.X"
3. **Download**: User clicks "Download Update" to start downloading
4. **Progress**: A progress bar shows download status
5. **Install**: User clicks "Restart & Install" to apply the update

### Technical Flow

```
App Start
    ↓
Wait 5 seconds
    ↓
Check GitHub Releases for latest.yml
    ↓
Compare versions
    ↓
[If newer version available]
    ↓
Send 'update-available' event to renderer
    ↓
User clicks Download
    ↓
Download .exe from GitHub Release
    ↓
Send 'update-downloaded' event
    ↓
User clicks Install
    ↓
App quits and installer runs
    ↓
New version launches
```

## Configuration Options

### Auto-Download

By default, updates are NOT auto-downloaded. Users must click "Download Update". To enable auto-download, modify `src/main/main.ts`:

```typescript
autoUpdater.autoDownload = true; // Change from false
```

### Auto-Install on Quit

Updates are automatically installed when the app quits (after download). This is enabled by default:

```typescript
autoUpdater.autoInstallOnAppQuit = true;
```

### Check Interval

Currently, updates are only checked on startup. To add periodic checks:

```typescript
// Check every hour
setInterval(() => {
  autoUpdater.checkForUpdates();
}, 60 * 60 * 1000);
```

## Troubleshooting

### "No updates available" but there should be

1. Verify the GitHub release is published (not draft)
2. Check that `latest.yml` is uploaded to the release
3. Ensure version in `package.json` is lower than the release version
4. Check the app logs for error messages

### Update download fails

1. Check internet connection
2. Verify the `.exe` file is uploaded to the GitHub release
3. Check Windows Firewall isn't blocking the download
4. Look for errors in the app logs

### Update won't install

1. Make sure to click "Restart & Install" after download completes
2. Check if antivirus is blocking the installer
3. Try running the app as administrator

### Testing Updates Locally

For testing without publishing to GitHub:

1. Build version 1.0.0 and install it
2. Bump to version 1.0.1 and build
3. Manually place the new installer and `latest.yml` where the app can find them
4. Or use a local server to serve the update files

## Security Considerations

### Code Signing (Recommended for Production)

For production apps, you should code sign your application:

1. Obtain a code signing certificate
2. Configure in `package.json`:
   ```json
   "win": {
     "certificateFile": "path/to/cert.pfx",
     "certificatePassword": "password"
   }
   ```

Without code signing:
- Windows SmartScreen may warn users
- Update verification is disabled (see `verifyUpdateCodeSignature: false` in package.json)

### Update Verification

The `latest.yml` contains SHA512 hashes of the update files. electron-updater verifies these hashes to ensure the download wasn't tampered with.

## Files Reference

### Key Files for Auto-Update

| File | Purpose |
|------|---------|
| `package.json` | Version number and publish configuration |
| `src/main/main.ts` | Auto-updater setup and event handlers |
| `src/main/preload.ts` | IPC bridge for update methods |
| `src/renderer/components/Settings.tsx` | Update UI in settings |
| `installer/latest.yml` | Update manifest (generated during build) |

### IPC Methods

| Method | Description |
|--------|-------------|
| `checkForUpdates()` | Manually trigger update check |
| `downloadUpdate()` | Start downloading available update |
| `installUpdate()` | Quit and install downloaded update |
| `getAppVersion()` | Get current app version |

### Events

| Event | Description |
|-------|-------------|
| `update-available` | New version found |
| `update-not-available` | App is up to date |
| `download-progress` | Download progress update |
| `update-downloaded` | Download complete |
| `update-error` | Error occurred |

## Example Release Workflow

```bash
# 1. Make your code changes
git add .
git commit -m "Add new feature"

# 2. Bump version
npm version patch  # or minor/major

# 3. Build
npm run package:win

# 4. Create GitHub release (manual or automatic)
# Manual: Upload files to GitHub Releases
# Automatic: npx electron-builder --win --publish always

# 5. Push tags
git push origin main --tags
```

Users running the previous version will now see the update available in their Settings.
