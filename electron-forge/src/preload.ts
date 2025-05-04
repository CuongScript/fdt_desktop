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
});
