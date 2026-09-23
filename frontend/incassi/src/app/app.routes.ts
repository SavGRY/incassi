import {Routes} from '@angular/router';
import {authGuard} from './auth/route-guard/auth-guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'documents',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/document-list/document-list').then((m) => m.DocumentList),
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
];
