import {HttpErrorResponse, HttpEvent, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {Router} from '@angular/router';
import {catchError, Observable} from 'rxjs';
import {Auth} from '../auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router: Router = inject(Router);
  const authService: Auth = inject(Auth);
  const token: string | null = localStorage.getItem('token');
  const modifiedRequest = token
    ? req.clone({
        setHeaders: {Authorization: `Token ${token}`},
      })
    : req;

  return next(modifiedRequest).pipe(
    catchError((error: HttpErrorResponse): Observable<HttpEvent<unknown>> => {
      if (error.status === 401 || error.status === undefined) {
        // Goes through the service, not straight to localStorage, so the
        // `isLoggedIn` signal the header reads cannot drift out of sync.
        authService.clearSession();
        router.navigate(['login']);
      }
      throw error;
    })
  );
};
