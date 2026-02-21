import {HttpErrorResponse, HttpEvent, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {Router} from '@angular/router';
import {catchError, Observable} from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router: Router = inject(Router);
  const token: string | null = localStorage.getItem('token');
  const modifiedRequest = token
    ? req.clone({
        setHeaders: {Authorization: `Token ${token}`},
      })
    : req;

  return next(modifiedRequest).pipe(
    catchError((error: HttpErrorResponse): Observable<HttpEvent<unknown>> => {
      if (error.status === 401 || error.status === undefined) {
        localStorage.removeItem('token');
        router.navigate(['login']);
      }
      throw error;
    })
  );
};
