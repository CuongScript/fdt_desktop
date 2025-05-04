import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';

export interface Rule {
  source: string;
  destination: string;
  pattern: string;
}

export interface AppSettings {
  minimizeToTray: boolean;
  runOnStartup: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  private electronAPI: any;

  // Subjects for Electron events
  private monitoringStatusChangedSubject = new Subject<boolean>();
  private scanCompletedSubject = new Subject<void>();

  // Observables for components to subscribe to
  public monitoringStatusChanged$: Observable<boolean> =
    this.monitoringStatusChangedSubject.asObservable();
  public scanCompleted$: Observable<void> =
    this.scanCompletedSubject.asObservable();

  constructor(private ngZone: NgZone, private router: Router) {
    // Access the exposed Electron API
    this.electronAPI = (window as any).electronAPI;

    // Set up event listeners if Electron is available
    if (this.isElectronAvailable()) {
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    // Set up listener for navigation events from the main process
    this.electronAPI.onNavigateTo((route: string) => {
      this.ngZone.run(() => {
        this.router.navigate([route]);
      });
    });

    // Set up listener for monitoring status changes
    this.electronAPI.onMonitoringStatusChanged((isMonitoring: boolean) => {
      this.ngZone.run(() => {
        this.monitoringStatusChangedSubject.next(isMonitoring);
      });
    });

    // Set up listener for scan completion
    this.electronAPI.onScanCompleted(() => {
      this.ngZone.run(() => {
        this.scanCompletedSubject.next();
      });
    });
  }

  isElectronAvailable(): boolean {
    return !!this.electronAPI;
  }

  // New method to select a directory
  async selectDirectory(
    title: string = 'Select folder'
  ): Promise<string | null> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return null;
    }
    return await this.electronAPI.selectDirectory(title);
  }

  // New methods for settings
  async getSettings(): Promise<AppSettings> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return { minimizeToTray: true, runOnStartup: false };
    }
    return await this.electronAPI.getSettings();
  }

  async saveSettings(
    settings: Partial<AppSettings>
  ): Promise<AppSettings | null> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return null;
    }
    return await this.electronAPI.saveSettings(settings);
  }

  async toggleAutoStart(enabled: boolean): Promise<boolean> {
    if (!this.isElectronAvailable()) {
      console.error('Electron API not available');
      return false;
    }
    return await this.electronAPI.toggleAutoStart(enabled);
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
