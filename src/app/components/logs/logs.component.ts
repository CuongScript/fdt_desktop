import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss'],
})
export class LogsComponent implements OnInit {
  logs: string = '';

  constructor(private electronService: ElectronService) {}

  ngOnInit(): void {
    this.refreshLogs();
  }

  async refreshLogs(): Promise<void> {
    this.logs = await this.electronService.readLogs();
  }
}
