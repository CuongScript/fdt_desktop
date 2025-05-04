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

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const isDev = process.env.NODE_ENV !== 'production';

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
    console.error('Error loading settings:', error);
  }
  return DEFAULT_SETTINGS;
}

// Save settings
function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return settings;
  } catch (error) {
    console.error('Error saving settings:', error);
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
      console.error('Error setting auto-start:', error);
      return false;
    }
  }
  return false;
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '../../dist/fdt_desktop/browser/index.html')
    );
  }

  // Create tray icon
  const iconPath = path.join(
    __dirname,
    isDev ? '../assets' : '../../assets',
    'tray-icon.svg'
  );
  const trayIcon = nativeImage.createFromPath(iconPath);
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
  mainWindow.on('minimize', (event) => {
    if (settings.minimizeToTray) {
      event.preventDefault();
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
  app.isQuitting = true; // Mark that we're quitting to avoid minimizing to tray
  unwatchAll(); // Ensure all file watchers are closed
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
ipcMain.handle('read-logs', () =>
  require('fs').readFileSync(path.join(process.cwd(), 'logs.txt'), 'utf-8')
);

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
