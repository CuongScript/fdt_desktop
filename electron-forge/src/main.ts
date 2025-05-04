import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { watchFiles, unwatchAll, scanAll, cfg, Rule } from './file-logic';
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const isDev = process.env.NODE_ENV !== 'production';

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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

  // Open the DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
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
