import {Routes} from '@angular/router';
import {authGuard} from './auth/route-guard/auth-guard';
import {unsavedIncassiGuard} from './pages/new-incasso/unsaved-incassi-guard';

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
    path: 'incassi/new',
    canActivate: [authGuard],
    canDeactivate: [unsavedIncassiGuard],
    loadComponent: () => import('./pages/new-incasso/new-incasso').then((m) => m.NewIncassoPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
];
