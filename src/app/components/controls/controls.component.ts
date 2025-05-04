import {
  Component,
  ElementRef,
  NgZone,
  Renderer2,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.scss'],
})
export class ControlsComponent implements OnInit, OnDestroy {
  isMonitoring = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private electronService: ElectronService,
    private renderer: Renderer2,
    private el: ElementRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    // Subscribe to monitoring status changes from tray actions
    this.subscription.add(
      this.electronService.monitoringStatusChanged$.subscribe(
        (isMonitoring) => {
          this.isMonitoring = isMonitoring;
          this.showMessage(
            isMonitoring
              ? 'Đã bắt đầu giám sát real-time'
              : 'Đã dừng giám sát real-time'
          );
        }
      )
    );

    // Subscribe to scan completed notifications from tray actions
    this.subscription.add(
      this.electronService.scanCompleted$.subscribe(() => {
        this.showMessage('Đã hoàn thành quét thủ công');
      })
    );
  }

  ngOnDestroy(): void {
    // Clean up subscriptions when component is destroyed
    this.subscription.unsubscribe();
  }

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
      // Use setTimeout to ensure the element is in the DOM
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
