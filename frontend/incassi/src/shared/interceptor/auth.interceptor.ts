import {HttpErrorResponse, HttpEvent, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, catchError} from 'rxjs';

/**
 * Method that Identifies and handles a given HTTP req.
 * In this case it clones the req that is being done to check if the user is
 * authenticated. If the token has been compromised, it will redirect to the login page
 * and clear the csrf token from the cookies and also the token from the
 * localstorage.
 * It integrates the [Router]{@link #Router}
 * @param req The outgoing req object to handle.
 * @param next The next interceptor in the chain, or the backend
 * @returns An observable of the event stream.
 */
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
