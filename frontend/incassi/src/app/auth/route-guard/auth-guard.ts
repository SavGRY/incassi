import {inject} from '@angular/core';
import {type CanActivateFn, Router} from '@angular/router';
import {Auth} from '../../services/auth';

/**
 * Reads the `isLoggedIn` signal instead of `localStorage`, so the guard agrees
 * with the header and with `authInterceptor`, which clears it on a 401.
 * Returning a `UrlTree` makes the router redirect instead of just cancelling.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  return authService.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
