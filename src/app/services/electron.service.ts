import { Injectable } from '@angular/core';

export interface Rule {
  source: string;
  destination: string;
  pattern: string;
}

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  private electronAPI: any;

  constructor() {
    // Access the exposed Electron API
    this.electronAPI = (window as any).electronAPI;
  }

  isElectronAvailable(): boolean {
    return !!this.electronAPI;
  }

  async getRules(): Promise<Rule[]> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return [];
    }
    return await this.electronAPI.getRules();
  }

  async addRule(rule: Rule): Promise<Rule[]> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return [];
    }
    return await this.electronAPI.addRule(rule);
  }

  async deleteRule(index: number): Promise<Rule[]> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return [];
    }
    return await this.electronAPI.deleteRule(index);
  }

  async startMonitor(): Promise<void> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return;
    }
    return await this.electronAPI.startMonitor();
  }

  async stopMonitor(): Promise<void> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return;
    }
    return await this.electronAPI.stopMonitor();
  }

  async scanAll(): Promise<void> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return;
    }
    return await this.electronAPI.scanAll();
  }

  async readLogs(): Promise<string> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return '';
    }
    return await this.electronAPI.readLogs();
  }
}
