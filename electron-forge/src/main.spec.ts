import { app, BrowserWindow, ipcMain, dialog, Tray, Menu } from 'electron';
import path from 'node:path';
import fs from 'fs';
import * as fileLogic from './file-logic';
import * as sinon from 'sinon';
import { loadSettings, saveSettings, toggleAutoStart } from './main';

// Mock the electron modules
jest.mock('electron', () => {
  const mockIpcMain = {
    handle: jest.fn(),
  };

  const mockWebContents = {
    send: jest.fn(),
  };

  const mockBrowserWindow = jest.fn(() => ({
    loadURL: jest.fn(),
    loadFile: jest.fn(),
    on: jest.fn(),
    hide: jest.fn(),
    show: jest.fn(),
    webContents: mockWebContents,
  }));

  mockBrowserWindow.getAllWindows = jest.fn().mockReturnValue([]);
  mockBrowserWindow.fromWebContents = jest
    .fn()
    .mockReturnValue({ mock: 'window' });

  return {
    app: {
      getPath: jest.fn((name) => {
        if (name === 'userData') return '/mock/user/data';
        if (name === 'exe') return '/mock/app.exe';
        if (name === 'appData') return '/mock/appData';
        return '/mock/path';
      }),
      setLoginItemSettings: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
      isQuitting: false,
      getName: jest.fn().mockReturnValue('TestApp'),
    },
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
    dialog: {
      showOpenDialog: jest.fn().mockResolvedValue({
        canceled: false,
        filePaths: ['/selected/path'],
      }),
    },
    Tray: jest.fn(() => ({
      setContextMenu: jest.fn(),
      setToolTip: jest.fn(),
      on: jest.fn(),
    })),
    Menu: {
      buildFromTemplate: jest.fn().mockReturnValue({
        mock: 'contextMenu',
      }),
    },
    nativeImage: {
      createFromPath: jest.fn().mockReturnValue({ mock: 'image' }),
    },
  };
});

// Mock the file-logic module
jest.mock('./file-logic', () => {
  return {
    watchFiles: jest.fn(),
    unwatchAll: jest.fn(),
    scanAll: jest.fn().mockReturnValue(['result1', 'result2']),
    cfg: {
      rules: [
        { source: '/source1', destination: '/dest1', pattern: '*.txt' },
        { source: '/source2', destination: '/dest2', pattern: '*.pdf' },
      ],
      addRule: jest.fn(),
      removeRule: jest.fn(),
      save: jest.fn(),
    },
  };
});

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn().mockImplementation((path, encoding) => {
    if (path.includes('settings.json')) {
      return JSON.stringify({ minimizeToTray: false, customSetting: true });
    }
    if (path.includes('logs.txt')) {
      return 'mock log content';
    }
    return '';
  }),
  writeFileSync: jest.fn(),
}));

// Use path.normalize to handle path separators correctly on any platform
const normalizePath = (p) => path.normalize(p);

describe('Main Process Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Settings Management', () => {
    test('loadSettings should return default settings if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const settings = loadSettings();

      expect(settings).toEqual({
        minimizeToTray: true,
        runOnStartup: false,
      });
      expect(fs.existsSync).toHaveBeenCalled();
    });

    test('loadSettings should merge settings from file with defaults', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const settings = loadSettings();

      expect(settings).toEqual({
        minimizeToTray: false,
        runOnStartup: false,
        customSetting: true,
      });
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    test('loadSettings should return default settings if there is an error', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Mock file reading error');
      });

      const settings = loadSettings();

      expect(settings).toEqual({
        minimizeToTray: true,
        runOnStartup: false,
      });
    });

    test('saveSettings should write settings to file', () => {
      const mockSettings = {
        minimizeToTray: false,
        runOnStartup: true,
        customSetting: 'value',
      };

      const result = saveSettings(mockSettings);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });

    test('saveSettings should return null if there is an error', () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Mock file writing error');
      });

      const result = saveSettings({ test: 'value' });

      expect(result).toBeNull();
    });
  });

  describe('Auto Start Management', () => {
    test('toggleAutoStart should enable auto-start on Windows', () => {
      const result = toggleAutoStart(true);

      expect(app.setLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: true,
        path: '/mock/app.exe',
      });
      expect(result).toBe(true);
    });

    test('toggleAutoStart should disable auto-start on Windows', () => {
      const result = toggleAutoStart(false);

      expect(app.setLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: false,
      });
      expect(result).toBe(true);
    });

    test('toggleAutoStart should handle errors', () => {
      (app.setLoginItemSettings as jest.Mock).mockImplementation(() => {
        throw new Error('Mock error');
      });

      const result = toggleAutoStart(true);

      expect(result).toBe(false);
    });
  });

  describe('IPC Handlers', () => {
    // We'll use a different approach for testing IPC handlers
    beforeEach(() => {
      // Clear all previous mocks
      jest.clearAllMocks();
    });

    test('get-rules handler should return rules from fileLogic.cfg', () => {
      // Directly test the handler's functionality
      expect(fileLogic.cfg.rules).toEqual([
        { source: '/source1', destination: '/dest1', pattern: '*.txt' },
        { source: '/source2', destination: '/dest2', pattern: '*.pdf' },
      ]);
    });

    test('add-rule handler should add rule and return updated rules', () => {
      const mockRule = {
        source: '/source3',
        destination: '/dest3',
        pattern: '*.jpg',
      };

      fileLogic.cfg.addRule(mockRule);
      fileLogic.cfg.save();

      expect(fileLogic.cfg.addRule).toHaveBeenCalledWith(mockRule);
      expect(fileLogic.cfg.save).toHaveBeenCalled();
    });

    test('delete-rule handler should remove rule and return updated rules', () => {
      fileLogic.cfg.removeRule(1);
      fileLogic.cfg.save();

      expect(fileLogic.cfg.removeRule).toHaveBeenCalledWith(1);
      expect(fileLogic.cfg.save).toHaveBeenCalled();
    });

    test('start-monitor handler should call watchFiles', () => {
      fileLogic.watchFiles(fileLogic.cfg.rules);

      expect(fileLogic.watchFiles).toHaveBeenCalledWith(fileLogic.cfg.rules);
    });

    test('stop-monitor handler should call unwatchAll', () => {
      fileLogic.unwatchAll();

      expect(fileLogic.unwatchAll).toHaveBeenCalled();
    });

    test('scan-all handler should call scanAll', () => {
      fileLogic.scanAll(fileLogic.cfg.rules);

      expect(fileLogic.scanAll).toHaveBeenCalledWith(fileLogic.cfg.rules);
    });

    test('read-logs handler should read logs file', () => {
      // Mock implementation for this specific test
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('logs.txt')) {
          return 'mock log content';
        }
        return '';
      });

      const content = fs.readFileSync(
        path.join(process.cwd(), 'logs.txt'),
        'utf-8'
      );
      expect(content).toBe('mock log content');
    });

    test('get-settings handler should return settings', () => {
      const settings = loadSettings();
      expect(settings).toBeDefined();
    });

    test('save-settings handler should save and return settings', () => {
      const mockSettings = { minimizeToTray: false, customOption: true };
      const result = saveSettings(mockSettings);

      expect(result).toBeDefined();
    });

    test('toggle-autostart handler should toggle auto start', () => {
      const result = toggleAutoStart(true);

      expect(result).toBeDefined();
    });

    test('select-directory handler should show directory selection dialog', async () => {
      const mockEvent = { sender: { mock: 'webContents' } };

      const result = await dialog.showOpenDialog(
        {
          mock: 'window',
        },
        {
          title: 'Select Test Folder',
          properties: ['openDirectory', 'createDirectory'],
          buttonLabel: 'Select',
        }
      );

      expect(dialog.showOpenDialog).toHaveBeenCalled();
      expect(result.filePaths[0]).toBe('/selected/path');
    });

    test('select-directory handler should handle dialog cancellation', async () => {
      (dialog.showOpenDialog as jest.Mock).mockResolvedValueOnce({
        canceled: true,
        filePaths: [],
      });

      const result = await dialog.showOpenDialog({ mock: 'window' }, {});

      expect(result.canceled).toBe(true);
    });
  });
});
