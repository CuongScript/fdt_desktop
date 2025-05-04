import {
  Component,
  OnInit,
  ElementRef,
  NgZone,
  Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';

import { ElectronService, Rule } from '../../services/electron.service';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './rules.component.html',
  styleUrls: ['./rules.component.scss'],
})
export class RulesComponent implements OnInit {
  rules: Rule[] = [];

  ruleForm = new FormGroup({
    source: new FormControl('', [Validators.required]),
    destination: new FormControl('', [Validators.required]),
    pattern: new FormControl('', [Validators.required]),
  });

  constructor(
    private electronService: ElectronService,
    private renderer: Renderer2,
    private el: ElementRef,
    private zone: NgZone
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
    // Create Bootstrap toast notification
    this.zone.run(() => {
      const toastContainer = this.getOrCreateToastContainer();
      const toastEl = this.renderer.createElement('div');
      this.renderer.addClass(toastEl, 'toast');
      this.renderer.setAttribute(toastEl, 'role', 'alert');
      this.renderer.setAttribute(toastEl, 'aria-live', 'assertive');
      this.renderer.setAttribute(toastEl, 'aria-atomic', 'true');

      const toastHeader = this.renderer.createElement('div');
      this.renderer.addClass(toastHeader, 'toast-header');

      const strongEl = this.renderer.createElement('strong');
      this.renderer.addClass(strongEl, 'me-auto');
      const headerText = this.renderer.createText('Thông Báo');
      this.renderer.appendChild(strongEl, headerText);

      const closeButton = this.renderer.createElement('button');
      this.renderer.addClass(closeButton, 'btn-close');
      this.renderer.setAttribute(closeButton, 'type', 'button');
      this.renderer.setAttribute(closeButton, 'data-bs-dismiss', 'toast');

      this.renderer.appendChild(toastHeader, strongEl);
      this.renderer.appendChild(toastHeader, closeButton);

      const toastBody = this.renderer.createElement('div');
      this.renderer.addClass(toastBody, 'toast-body');
      const messageText = this.renderer.createText(message);
      this.renderer.appendChild(toastBody, messageText);

      this.renderer.appendChild(toastEl, toastHeader);
      this.renderer.appendChild(toastEl, toastBody);
      this.renderer.appendChild(toastContainer, toastEl);

      // Initialize and show the toast with Bootstrap's JavaScript
      setTimeout(() => {
        // @ts-ignore: Using Bootstrap's global object
        const toastInstance = new bootstrap.Toast(toastEl, {
          autohide: true,
          delay: 3000,
        });
        toastInstance.show();

        // Remove the toast element from the DOM after it's hidden
        toastEl.addEventListener('hidden.bs.toast', () => {
          this.renderer.removeChild(toastContainer, toastEl);
        });
      }, 0);
    });
  }

  private getOrCreateToastContainer(): HTMLElement {
    // Find or create a container for toasts
    let toastContainer = document.getElementById('toast-container');

    if (!toastContainer) {
      toastContainer = this.renderer.createElement('div');
      this.renderer.setAttribute(toastContainer, 'id', 'toast-container');
      this.renderer.addClass(toastContainer, 'toast-container');
      this.renderer.addClass(toastContainer, 'position-fixed');
      this.renderer.addClass(toastContainer, 'bottom-0');
      this.renderer.addClass(toastContainer, 'end-0');
      this.renderer.addClass(toastContainer, 'p-3');
      this.renderer.appendChild(document.body, toastContainer);
    }

    return toastContainer as HTMLElement;
  }
}
