import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService, AppSettings } from '../../services/electron.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  settings: AppSettings = {
    minimizeToTray: true,
    runOnStartup: false,
  };

  isSaving = false;
  saveMessage = '';

  constructor(private electronService: ElectronService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    if (this.electronService.isElectronAvailable()) {
      const settings = await this.electronService.getSettings();
      if (settings) {
        this.settings = settings;
      }
    }
  }

  async saveSettings(): Promise<void> {
    this.isSaving = true;
    this.saveMessage = '';

    try {
      await this.electronService.saveSettings(this.settings);
      this.saveMessage = 'Settings saved successfully!';
    } catch (error) {
      this.saveMessage = 'Error saving settings.';
      console.error('Error saving settings:', error);
    } finally {
      this.isSaving = false;

      // Clear message after 3 seconds
      setTimeout(() => {
        this.saveMessage = '';
      }, 3000);
    }
  }

  async toggleMinimizeToTray(): Promise<void> {
    this.settings.minimizeToTray = !this.settings.minimizeToTray;
    await this.saveSettings();
  }

  async toggleRunOnStartup(): Promise<void> {
    const previousValue = this.settings.runOnStartup;
    this.settings.runOnStartup = !previousValue;

    const success = await this.electronService.toggleAutoStart(
      this.settings.runOnStartup
    );

    if (!success) {
      // Revert if failed
      this.settings.runOnStartup = previousValue;
      this.saveMessage = 'Failed to change startup setting.';
    } else {
      this.saveMessage = 'Settings saved successfully!';
      setTimeout(() => {
        this.saveMessage = '';
      }, 3000);
    }
  }
}
