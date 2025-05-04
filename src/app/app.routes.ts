import { Routes } from '@angular/router';
import { RulesComponent } from './components/rules/rules.component';
import { LogsComponent } from './components/logs/logs.component';

export const routes: Routes = [
  { path: '', redirectTo: 'rules', pathMatch: 'full' },
  { path: 'rules', component: RulesComponent },
  { path: 'logs', component: LogsComponent },
  { path: '**', redirectTo: 'rules' },
];
