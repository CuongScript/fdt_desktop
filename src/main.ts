import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Import Bootstrap JS
import 'bootstrap';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
