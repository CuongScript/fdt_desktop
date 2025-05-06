import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  Tray,
  nativeImage,
} from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { watchFiles, unwatchAll, scanAll, cfg, Rule } from './file-logic';
import fs from 'fs';

// Extend Electron.App interface to include our custom property
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}

// Enhanced debugging for production issues
function logDebug(...args: any[]) {
  const logFile = path.join(app.getPath('userData'), 'debug-log.txt');
  const message = `[${new Date().toISOString()}] ${args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
    .join(' ')}`;
  console.log(message);

  try {
    fs.appendFileSync(logFile, message + '\n');
  } catch (err) {
    console.error('Failed to write to debug log:', err);
  }
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Improved environment detection logic
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
logDebug('App starting in mode:', isDev ? 'development' : 'production');
logDebug('App is packaged:', app.isPackaged);
logDebug('NODE_ENV:', process.env.NODE_ENV || 'not set');

// Added global variables for tray and main window
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Settings file for app preferences
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  minimizeToTray: true,
  runOnStartup: false,
};

// Load settings
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    logDebug('Error loading settings:', error);
  }
  return DEFAULT_SETTINGS;
}

// Save settings
function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return settings;
  } catch (error) {
    logDebug('Error saving settings:', error);
    return null;
  }
}

// Get current settings
let settings = loadSettings();

// Toggle auto-start functionality
function toggleAutoStart(enabled: boolean) {
  if (process.platform === 'win32') {
    const appPath = app.getPath('exe');
    const startupPath = path.join(
      app.getPath('appData'),
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    );
    const shortcutPath = path.join(startupPath, `${app.getName()}.lnk`);

    try {
      if (enabled) {
        // Create shortcut using app executable
        app.setLoginItemSettings({
          openAtLogin: true,
          path: appPath,
        });
      } else {
        // Remove from login items
        app.setLoginItemSettings({
          openAtLogin: false,
        });
      }

      settings.runOnStartup = enabled;
      saveSettings(settings);
      return true;
    } catch (error) {
      logDebug('Error setting auto-start:', error);
      return false;
    }
  }
  return false;
}

const createWindow = () => {
  // Log app paths for debugging
  logDebug('App directory:', __dirname);
  logDebug('Working directory:', process.cwd());
  logDebug('App path:', app.getAppPath());
  logDebug('User data path:', app.getPath('userData'));
  logDebug('Executable path:', app.getPath('exe'));

  // Find the right path to the app logo
  let iconPath = '';
  const possiblePaths = [
    // Production paths

    path.join(process.resourcesPath, 'assets', 'app-logo.png'),

    path.resolve(__dirname, '../../assets/app-logo.png'),
  ];

  // Find the first path that exists
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        iconPath = p;
        logDebug('Found icon at:', p);
        break;
      } else {
        logDebug('Icon not found at:', p);
      }
    } catch (err) {
      logDebug('Error checking icon path:', p, err);
    }
  }

  if (!iconPath) {
    logDebug('Could not find app-logo.png in any expected location');
    // Use a default icon path as fallback
    iconPath = path.resolve(
      process.cwd(),
      'electron-forge/assets/app-logo.png'
    );
  }

  logDebug('App icon path:', iconPath);

  const appIcon = nativeImage.createFromPath(iconPath);
  logDebug('App icon created:', appIcon.isEmpty() ? 'empty' : 'loaded');

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: iconPath,
    show: false, // Don't show until ready-to-show
  });

  // Create a loading screen
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    logDebug('Main window ready to show');
  });

  // Open DevTools in production to debug
  // if (!isDev) {
  //   // logDebug('Opening DevTools in production for debugging');
  //   // mainWindow.webContents.openDevTools(); // Actually open DevTools to debug issues
  // }

  // Handle page load errors
  mainWindow.webContents.on(
    'did-fail-load',
    (event, errorCode, errorDescription) => {
      logDebug('Page failed to load:', errorCode, errorDescription);
    }
  );

  // Log content load
  mainWindow.webContents.on('did-finish-load', () => {
    logDebug('Content finished loading');
  });


  if (isDev) {
    logDebug('Loading development URL: http://localhost:4200');
    mainWindow.loadURL('http://localhost:4200');
  } else {
    // In production mode - try multiple possible paths to load the Angular app
    const possibleHtmlPaths = [
      // Path when running from packaged app
      path.join(process.resourcesPath, 'dist/fdt_desktop/browser/index.html'),
      path.join(process.resourcesPath, 'browser/index.html'),
      // Fallback paths
      path.join(app.getAppPath(), '../dist/fdt_desktop/browser/index.html'),
      path.join(__dirname, '../../dist/fdt_desktop/browser/index.html'),
    ];

    logDebug('Trying to locate HTML file in these paths:', possibleHtmlPaths);

    let htmlPathFound = false;

    for (const htmlPath of possibleHtmlPaths) {
      try {
        if (fs.existsSync(htmlPath)) {
          logDebug('Found HTML file at:', htmlPath);

          // For loading from file protocol, we need to ensure the base path is set correctly
          const baseUrl = `file://${htmlPath}`;
          logDebug('Loading HTML with URL:', baseUrl);

          mainWindow.loadFile(htmlPath);
          htmlPathFound = true;
          break;
        } else {
          logDebug('HTML file not found at:', htmlPath);
        }
      } catch (err) {
        logDebug('Error checking HTML path:', htmlPath, err);
      }
    }

    if (!htmlPathFound) {
      logDebug('Could not find index.html in any expected location');
      mainWindow.loadFile(
        path.join(__dirname, '../../dist/fdt_desktop/browser/index.html')
      );
    }
  }

  // Create tray icon using the same icon file
  let trayIcon;
  if (!appIcon.isEmpty()) {
    trayIcon = appIcon;
    if (process.platform === 'win32') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    } else if (process.platform === 'darwin') {
      trayIcon.setTemplateImage(true);
    }
  } else {
    // Fallback to creating a new native image if appIcon is empty
    trayIcon = nativeImage.createFromPath(iconPath);
    if (process.platform === 'win32') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    } else if (process.platform === 'darwin') {
      trayIcon.setTemplateImage(true);
    }
  }

  tray = new Tray(trayIcon);

  // Function to update tray context menu
  const updateTrayMenu = (isMonitoring = false) => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'File Directory Transfer', type: 'normal', enabled: false },
      { type: 'separator' },
      {
        label: isMonitoring ? 'Stop Monitoring' : 'Start Monitoring',
        click: async () => {
          if (isMonitoring) {
            unwatchAll();
            updateTrayMenu(false);
          } else {
            watchFiles(cfg.rules);
            updateTrayMenu(true);
          }
          mainWindow?.webContents.send(
            'monitoring-status-changed',
            !isMonitoring
          );
        },
      },
      {
        label: 'Run Manual Scan',
        click: async () => {
          scanAll(cfg.rules);
          mainWindow?.webContents.send('scan-completed');
        },
      },
      { type: 'separator' },
      {
        label: 'Rules',
        click: () => {
          mainWindow?.show();
          mainWindow?.webContents.send('navigate-to', 'rules');
        },
      },
      {
        label: 'Logs',
        click: () => {
          mainWindow?.show();
          mainWindow?.webContents.send('navigate-to', 'logs');
        },
      },
      {
        label: 'Settings',
        click: () => {
          mainWindow?.show();
          mainWindow?.webContents.send('navigate-to', 'settings');
        },
      },
      { type: 'separator' },
      { label: 'Show App', click: () => mainWindow?.show() },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
  };

  // Initial setup of tray menu
  updateTrayMenu();

  tray.setToolTip('File Directory Transfer');

  tray.on('click', () => {
    mainWindow?.show();
  });

  // Handle close event
  mainWindow.on('close', (event) => {
    if (settings.minimizeToTray && !app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
    return true;
  });

  // Handle minimize event
  mainWindow.on('minimize', () => {
    if (settings.minimizeToTray) {
      mainWindow?.hide();
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    unwatchAll(); // Stop monitoring before quitting
    app.quit();
  }
});

// Add this handler to ensure app quits properly when requested
app.on('before-quit', () => {
  logDebug('Application is quitting...');
  app.isQuitting = true; // Mark that we're quitting to avoid minimizing to tray
  unwatchAll(); // Ensure all file watchers are closed

  // Close any open file handles
  try {
    // Give some time for resources to be released
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.session.clearCache();
      mainWindow.webContents.session.clearStorageData();
    }

    // Close tray if it exists
    if (tray) {
      tray.destroy();
      tray = null;
    }

    logDebug('Resources released successfully');
  } catch (error) {
    logDebug('Error releasing resources:', error);
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-rules', () => cfg.rules);
ipcMain.handle('add-rule', (_e, r: Rule) => {
  cfg.addRule(r);
  cfg.save();
  return cfg.rules;
});
ipcMain.handle('delete-rule', (_e, index: number) => {
  cfg.removeRule(index);
  cfg.save();
  return cfg.rules;
});
ipcMain.handle('start-monitor', () => watchFiles(cfg.rules));
ipcMain.handle('stop-monitor', () => unwatchAll());
ipcMain.handle('scan-all', () => scanAll(cfg.rules));
ipcMain.handle('read-logs', () => {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'logs.txt'), 'utf-8');
  } catch (err) {
    logDebug('Error reading logs:', err);
    return 'Error loading logs. See debug-log.txt for details.';
  }
});

// New IPC handlers for app settings
ipcMain.handle('get-settings', () => settings);
ipcMain.handle('save-settings', (_e, newSettings) => {
  settings = { ...settings, ...newSettings };
  return saveSettings(settings);
});
ipcMain.handle('toggle-autostart', (_e, enabled) => {
  return toggleAutoStart(enabled);
});

// New IPC handler for directory selection dialog
ipcMain.handle('select-directory', async (event, title: string) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return null;

  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    title: title || 'Select a folder',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select',
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return filePaths[0];
});

// Export functions for testing purposes
export { loadSettings, saveSettings, toggleAutoStart };
