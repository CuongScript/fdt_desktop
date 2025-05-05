import * as fs from 'fs';
import * as path from 'path';
import mock from 'mock-fs';
import {
  loadConfig,
  watchFiles,
  unwatchAll,
  scanAll,
  cfg,
  Rule,
} from './file-logic';

// Mock the fs module
jest.mock('fs', () => {
  // Save original watch to restore later for proper mock implementation
  const originalWatch = jest.requireActual('fs').watch;

  return {
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    readFileSync: jest.fn().mockImplementation((path, encoding) => {
      if (path === 'config.json') {
        return JSON.stringify({
          rules: [{ source: '/src', destination: '/dst', pattern: '*.jpg' }],
        });
      }
      return '';
    }),
    writeFileSync: jest.fn(),
    appendFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    copyFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    watch: jest.fn().mockImplementation(() => ({
      close: jest.fn(),
    })),
  };
});

// Mock path module to ensure consistent behavior
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    join: jest.fn((...args) => args.join('/')),
    basename: jest.fn((filepath) => filepath.split('/').pop()),
  };
});

describe('File Logic Module Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up resources
    try {
      unwatchAll();
    } catch (error) {
      // Ignore errors during cleanup
    }
    jest.restoreAllMocks();
  });

  describe('Config Management', () => {
    test('loadConfig should create default config if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = loadConfig();

      expect(config.rules).toEqual([]);
      expect(typeof config.addRule).toBe('function');
      expect(typeof config.removeRule).toBe('function');
      expect(typeof config.save).toBe('function');
    });

    test('loadConfig should load config from file if it exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const config = loadConfig();

      expect(config.rules).toEqual([
        { source: '/src', destination: '/dst', pattern: '*.jpg' },
      ]);
    });

    test('loadConfig should handle JSON parsing errors', () => {
      // Setup for this specific test
      const existsSyncOriginal = fs.existsSync;
      const readFileSyncOriginal = fs.readFileSync;

      // Override the mock implementations just for this test
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation((path) => {
        if (path === 'config.json') {
          return 'invalid json that will cause an error';
        }
        return '';
      });

      const config = loadConfig();

      // The rules array should be empty when JSON parsing fails
      expect(config.rules).toEqual([]);
      expect(console.error).toHaveBeenCalled();

      // Reset the mocks back to their original implementation
      (fs.existsSync as jest.Mock).mockImplementation(existsSyncOriginal);
      (fs.readFileSync as jest.Mock).mockImplementation(readFileSyncOriginal);
    });

    test('config.addRule should add a rule to the rules array', () => {
      const config = loadConfig();
      const rule: Rule = {
        source: '/test-src',
        destination: '/test-dst',
        pattern: '*.csv',
      };

      config.addRule(rule);

      expect(config.rules).toContainEqual(rule);
    });

    test('config.removeRule should remove a rule at specified index', () => {
      const config = loadConfig();
      config.rules = [
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
        { source: '/src2', destination: '/dst2', pattern: '*.pdf' },
        { source: '/src3', destination: '/dst3', pattern: '*.png' },
      ];

      config.removeRule(1);

      expect(config.rules).toEqual([
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
        { source: '/src3', destination: '/dst3', pattern: '*.png' },
      ]);
    });

    test('config.removeRule should do nothing if index is out of bounds', () => {
      const config = loadConfig();
      config.rules = [
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
      ];

      config.removeRule(5); // Out of bounds index

      expect(config.rules).toEqual([
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
      ]);
    });

    test('config.save should write rules to config file', () => {
      const config = loadConfig();
      config.rules = [
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
        { source: '/src2', destination: '/dst2', pattern: '*.pdf' },
      ];

      config.save();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'config.json',
        JSON.stringify({ rules: config.rules }, null, 2)
      );
    });
  });

  describe('File Watching', () => {
    test('watchFiles should create a watcher for each unique source directory', () => {
      const rules: Rule[] = [
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
        { source: '/src1', destination: '/dst2', pattern: '*.pdf' },
        { source: '/src2', destination: '/dst3', pattern: '*.png' },
      ];

      (fs.existsSync as jest.Mock).mockImplementation((path) => true);

      watchFiles(rules);

      // Should have created watchers for /src1 and /src2
      expect(fs.watch).toHaveBeenCalledTimes(2);
      expect(fs.watch).toHaveBeenCalledWith(
        '/src1',
        { persistent: true },
        expect.any(Function)
      );
      expect(fs.watch).toHaveBeenCalledWith(
        '/src2',
        { persistent: true },
        expect.any(Function)
      );
    });

    test('watchFiles should skip directories that do not exist', () => {
      const rules: Rule[] = [
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
        { source: '/src2', destination: '/dst2', pattern: '*.pdf' },
      ];

      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        return path === '/src1'; // Only /src1 exists
      });

      watchFiles(rules);

      // Should only create a watcher for /src1
      expect(fs.watch).toHaveBeenCalledTimes(1);
      expect(fs.watch).toHaveBeenCalledWith(
        '/src1',
        { persistent: true },
        expect.any(Function)
      );
    });

    test('unwatchAll should close all watchers', () => {
      const mockClose = jest.fn();

      const watchMock1 = { close: mockClose };
      const watchMock2 = { close: mockClose };

      (fs.watch as jest.Mock)
        .mockReturnValueOnce(watchMock1)
        .mockReturnValueOnce(watchMock2);

      // Create some watchers first
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      watchFiles([
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
        { source: '/src2', destination: '/dst2', pattern: '*.pdf' },
      ]);

      // Now call unwatchAll
      unwatchAll();

      // Should have closed both watchers
      expect(mockClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Scanning Files', () => {
    test('scanAll should process all files in each source directory', () => {
      const rules: Rule[] = [
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['file1.txt', 'file2.pdf']);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });

      scanAll(rules);

      // Should have checked the directory
      expect(fs.existsSync).toHaveBeenCalledWith('/src1');
      expect(fs.readdirSync).toHaveBeenCalledWith('/src1');

      // Should have checked both files
      expect(fs.statSync).toHaveBeenCalledWith('/src1/file1.txt');
      expect(fs.statSync).toHaveBeenCalledWith('/src1/file2.pdf');
    });

    test('scanAll should handle directories that do not exist', () => {
      const rules: Rule[] = [
        { source: '/missing', destination: '/dst1', pattern: '*.txt' },
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const results = scanAll(rules);

      expect(results).toEqual(
        expect.arrayContaining([expect.stringContaining('không tồn tại')])
      );
    });

    test('scanAll should skip directories in source folder', () => {
      const rules: Rule[] = [
        { source: '/src1', destination: '/dst1', pattern: '*.txt' },
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['file.txt', 'subdir']);
      (fs.statSync as jest.Mock).mockImplementation((path) => ({
        isFile: () => !path.includes('subdir'),
      }));

      scanAll(rules);

      // Should have processed only the file
      expect(path.join).toHaveBeenCalledWith('/src1', 'file.txt');
      // Shouldn't attempt to process the subdirectory
      expect(fs.copyFileSync).not.toHaveBeenCalledWith(
        '/src1/subdir',
        expect.any(String)
      );
    });
  });

  // This test is to verify that file processing works correctly
  // with different rule configurations
  describe('File Processing', () => {
    // Test file processing indirectly through scanAll which calls processFile
    test('should process files matching pattern with copy operation', () => {
      const rules: Rule[] = [
        {
          source: '/src1',
          destination: '/dst1',
          pattern: '.*\\.txt',
          operation: 'copy',
        },
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['test.txt', 'image.png']);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });

      scanAll(rules);

      // Should have copied the matching file
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/src1/test.txt',
        '/dst1/test.txt'
      );

      // Should not have copied the non-matching file
      expect(fs.copyFileSync).not.toHaveBeenCalledWith(
        '/src1/image.png',
        '/dst1/image.png'
      );
    });

    test('should process files with move operation', () => {
      const rules: Rule[] = [
        {
          source: '/src1',
          destination: '/dst1',
          pattern: '.*\\.txt',
          operation: 'move',
        },
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['test.txt']);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });

      scanAll(rules);

      // Should have copied the file
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/src1/test.txt',
        '/dst1/test.txt'
      );

      // And then deleted the original
      expect(fs.unlinkSync).toHaveBeenCalledWith('/src1/test.txt');
    });

    test('should create subfolders when createSubfolders is true', () => {
      const rules: Rule[] = [
        {
          source: '/src1',
          destination: '/dst1',
          pattern: '(group1)-.*\\.txt',
          createSubfolders: true,
        },
      ];

      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        // Subfolder doesn't exist initially
        return !path.includes('/dst1/group1');
      });
      (fs.readdirSync as jest.Mock).mockReturnValue(['group1-test.txt']);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });

      scanAll(rules);

      // Should have created the subfolder
      expect(fs.mkdirSync).toHaveBeenCalledWith('/dst1/group1', {
        recursive: true,
      });

      // Should have copied to the subfolder
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        '/src1/group1-test.txt',
        '/dst1/group1/group1-test.txt'
      );
    });
  });
});
