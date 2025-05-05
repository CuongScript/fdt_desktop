import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'rules', pathMatch: 'full' },
  {
    path: 'rules',
    loadComponent: () =>
      import('./components/rules/rules.component').then(
        (m) => m.RulesComponent
      ),
  },
  {
    path: 'logs',
    loadComponent: () =>
      import('./components/logs/logs.component').then((m) => m.LogsComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./components/settings/settings.component').then(
        (m) => m.SettingsComponent
      ),
  },
  { path: '**', redirectTo: 'rules' },
];
