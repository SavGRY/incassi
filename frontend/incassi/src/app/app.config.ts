import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideOptimus} from '@openng/optimus-ui/config';
import {CustomTheme} from '../CustomTheme';
import {routes} from './app.routes';
import {authInterceptor} from './services/interceptor/auth-interceptor';
import {provideItalianLocale} from './shared/utils';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideItalianLocale(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideOptimus({
      theme: {
        preset: CustomTheme,
        options: {
          darkModeSelector: '.dark-mode',
        },
      },
    }),
  ],
};
