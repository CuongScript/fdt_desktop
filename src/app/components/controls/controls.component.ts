import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.scss'],
})
export class ControlsComponent {
  isMonitoring = false;

  constructor(
    private electronService: ElectronService,
    private snackBar: MatSnackBar
  ) {}

  async startMonitor(): Promise<void> {
    try {
      await this.electronService.startMonitor();
      this.isMonitoring = true;
      this.showMessage('Đã bắt đầu giám sát real-time');
    } catch (error) {
      this.showMessage('Không thể bắt đầu giám sát');
      console.error('Error starting monitoring:', error);
    }
  }

  async stopMonitor(): Promise<void> {
    try {
      await this.electronService.stopMonitor();
      this.isMonitoring = false;
      this.showMessage('Đã dừng giám sát real-time');
    } catch (error) {
      this.showMessage('Không thể dừng giám sát');
      console.error('Error stopping monitoring:', error);
    }
  }

  async scanAll(): Promise<void> {
    try {
      await this.electronService.scanAll();
      this.showMessage('Đã hoàn thành quét thủ công');
    } catch (error) {
      this.showMessage('Không thể quét files');
      console.error('Error scanning files:', error);
    }
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
    });
  }
}
