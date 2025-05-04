// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('electronAPI', {
  getRules: () => ipcRenderer.invoke('get-rules'),
  addRule: (rule: any) => ipcRenderer.invoke('add-rule', rule),
  deleteRule: (index: number) => ipcRenderer.invoke('delete-rule', index),
  startMonitor: () => ipcRenderer.invoke('start-monitor'),
  stopMonitor: () => ipcRenderer.invoke('stop-monitor'),
  scanAll: () => ipcRenderer.invoke('scan-all'),
  readLogs: () => ipcRenderer.invoke('read-logs'),
  selectDirectory: (title: string) =>
    ipcRenderer.invoke('select-directory', title),

  // New methods for tray and auto-start settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) =>
    ipcRenderer.invoke('save-settings', settings),
  toggleAutoStart: (enabled: boolean) =>
    ipcRenderer.invoke('toggle-autostart', enabled),

  // Event listeners for IPC events from main process
  onNavigateTo: (callback: (route: string) => void) => {
    ipcRenderer.on('navigate-to', (_event, route) => callback(route));
    return () => {
      ipcRenderer.removeAllListeners('navigate-to');
    };
  },

  onMonitoringStatusChanged: (callback: (isMonitoring: boolean) => void) => {
    ipcRenderer.on('monitoring-status-changed', (_event, isMonitoring) =>
      callback(isMonitoring)
    );
    return () => {
      ipcRenderer.removeAllListeners('monitoring-status-changed');
    };
  },

  onScanCompleted: (callback: () => void) => {
    ipcRenderer.on('scan-completed', () => callback());
    return () => {
      ipcRenderer.removeAllListeners('scan-completed');
    };
  },
});
