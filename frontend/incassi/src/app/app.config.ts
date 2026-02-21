import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter} from '@angular/router';
import {providePrimeNG} from 'primeng/config';
import {CustomTheme} from '../CustomTheme';
import {routes} from './app.routes';
import {authInterceptor} from './services/interceptor/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      theme: {
        preset: CustomTheme,
        options: {
          darkModeSelector: '.dark',
        },
      },
    }),
  ],
};
