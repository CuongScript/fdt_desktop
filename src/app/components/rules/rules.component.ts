import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ElectronService, Rule } from '../../services/electron.service';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.scss'],
})
export class RulesComponent implements OnInit {
  rules: Rule[] = [];
  displayedColumns: string[] = [
    'index',
    'source',
    'destination',
    'pattern',
    'actions',
  ];

  ruleForm = new FormGroup({
    source: new FormControl('', [Validators.required]),
    destination: new FormControl('', [Validators.required]),
    pattern: new FormControl('', [Validators.required]),
  });

  constructor(
    private electronService: ElectronService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRules();
  }

  async loadRules(): Promise<void> {
    try {
      this.rules = await this.electronService.getRules();
    } catch (error) {
      this.showMessage('Không thể tải danh sách quy tắc');
      console.error('Error loading rules:', error);
    }
  }

  async addRule(): Promise<void> {
    if (this.ruleForm.valid) {
      const rule: Rule = {
        source: this.ruleForm.value.source as string,
        destination: this.ruleForm.value.destination as string,
        pattern: this.ruleForm.value.pattern as string,
      };

      try {
        this.rules = await this.electronService.addRule(rule);
        this.ruleForm.reset();
        this.showMessage('Đã thêm quy tắc mới');
      } catch (error) {
        this.showMessage('Không thể thêm quy tắc');
        console.error('Error adding rule:', error);
      }
    }
  }

  async deleteRule(index: number): Promise<void> {
    try {
      this.rules = await this.electronService.deleteRule(index);
      this.showMessage('Đã xóa quy tắc');
    } catch (error) {
      this.showMessage('Không thể xóa quy tắc');
      console.error('Error deleting rule:', error);
    }
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'Đóng', {
      duration: 3000,
    });
  }
}
