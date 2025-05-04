import * as fs from 'fs';
import * as path from 'path';
import { watch } from 'fs';

export interface Rule {
  source: string;
  destination: string;
  pattern: string;
}

export interface Config {
  rules: Rule[];
  addRule: (rule: Rule) => void;
  removeRule: (index: number) => void;
  save: () => void;
}

const CONFIG_FILE = 'config.json';
let watchers: Map<string, fs.FSWatcher> = new Map();
const logFile = 'logs.txt';

// Create config object
const config: Config = {
  rules: [],
  addRule: function (rule: Rule) {
    this.rules.push(rule);
  },
  removeRule: function (index: number) {
    if (index >= 0 && index < this.rules.length) {
      this.rules.splice(index, 1);
    }
  },
  save: function () {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ rules: this.rules }, null, 2)
    );
  },
};

// Load config from file
export function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      config.rules = parsed.rules || [];
    }
  } catch (error) {
    console.error('Error loading config:', error);
    logAction(`Error loading config: ${error}`);
  }
  return config;
}

// Process a file according to rules
function processFile(fullPath: string, rules: Rule[]): void {
  try {
    const fileName = path.basename(fullPath);

    for (const rule of rules) {
      try {
        if (new RegExp(rule.pattern).test(fileName)) {
          const destPath = path.join(rule.destination, fileName);
          fs.copyFileSync(fullPath, destPath);
          logAction(
            `[${rule.source}→${rule.destination}] '${fileName}' (regex='${rule.pattern}')`
          );
        } else {
          logAction(
            `(bỏ qua) '${fileName}' không khớp regex='${rule.pattern}'`
          );
        }
      } catch (regexError) {
        logAction(`Lỗi regex '${rule.pattern}': ${regexError}`);
      }
    }
  } catch (error) {
    logAction(`Lỗi xử lý '${fullPath}': ${error}`);
  }
}

// Watch files for changes
export function watchFiles(rules: Rule[]): void {
  // Clear existing watchers
  unwatchAll();

  // Group rules by source directory
  const sourceGroups = new Map<string, Rule[]>();
  for (const rule of rules) {
    if (!sourceGroups.has(rule.source)) {
      sourceGroups.set(rule.source, []);
    }
    sourceGroups.get(rule.source)?.push(rule);
  }

  // Create a watcher for each source directory
  for (const [sourcePath, rulesForSource] of sourceGroups.entries()) {
    try {
      if (!fs.existsSync(sourcePath)) {
        logAction(`Thư mục không tồn tại: ${sourcePath}`);
        continue;
      }

      const watcher = watch(
        sourcePath,
        { persistent: true },
        (eventType, filename) => {
          if (filename && eventType === 'rename') {
            // 'rename' covers both file creation and deletion
            const fullPath = path.join(sourcePath, filename);
            if (fs.existsSync(fullPath)) {
              processFile(fullPath, rulesForSource);
            }
          }
        }
      );

      watchers.set(sourcePath, watcher);
      logAction(`Bắt đầu giám sát thư mục: ${sourcePath}`);
    } catch (error) {
      logAction(`Lỗi khi theo dõi thư mục ${sourcePath}: ${error}`);
    }
  }

  return;
}

// Stop all file watchers
export function unwatchAll(): void {
  for (const watcher of watchers.values()) {
    watcher.close();
  }
  watchers.clear();
  return;
}

// Manually scan all files in source directories
export function scanAll(rules: Rule[]): string[] {
  const results: string[] = [];
  logAction('Bắt đầu quét thủ công...');

  // Group rules by source directory
  const sourceGroups = new Map<string, Rule[]>();
  for (const rule of rules) {
    if (!sourceGroups.has(rule.source)) {
      sourceGroups.set(rule.source, []);
    }
    sourceGroups.get(rule.source)?.push(rule);
  }

  // Process all files in each source directory
  for (const [sourcePath, rulesForSource] of sourceGroups.entries()) {
    try {
      if (!fs.existsSync(sourcePath)) {
        const msg = `Thư mục không tồn tại: ${sourcePath}`;
        logAction(msg);
        results.push(msg);
        continue;
      }

      const files = fs.readdirSync(sourcePath);
      for (const file of files) {
        const fullPath = path.join(sourcePath, file);
        // Only process files, not directories
        if (fs.statSync(fullPath).isFile()) {
          processFile(fullPath, rulesForSource);
        }
      }
    } catch (error) {
      const msg = `Lỗi khi quét thư mục ${sourcePath}: ${error}`;
      logAction(msg);
      results.push(msg);
    }
  }

  logAction('Hoàn thành quét thủ công.');
  return results;
}

// Log actions to file and return the message
function logAction(message: string): string {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logMessage = `${timestamp}  ${message}`;

  try {
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }

  return logMessage;
}

// Initialize by loading config
export const cfg = loadConfig();
