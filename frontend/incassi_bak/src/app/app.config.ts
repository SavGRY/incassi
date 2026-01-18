import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {type ApplicationConfig, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';
import {authInterceptor} from '../shared/interceptor/auth.interceptor';
import {routes} from './app.routes';
import {providePrimeNG} from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
            theme: {
                preset: Aura
            }
        })
  ],
};
