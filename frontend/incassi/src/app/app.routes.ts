import {Routes} from '@angular/router';
import {Login} from './auth/login/login';
import {DocumentiList} from './pages/documenti-list/documenti-list';
import {Home} from './pages/home/home';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'documenti',
    component: DocumentiList,
  },
  {
    path: 'login',
    component: Login,
  },
];
