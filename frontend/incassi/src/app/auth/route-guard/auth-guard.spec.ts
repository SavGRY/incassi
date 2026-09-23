import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  provideRouter,
  Router,
  type RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {Auth} from '../../services/auth';
import {authGuard} from './auth-guard';

@Component({template: ''})
class Stub {}

describe('authGuard', () => {
  let authService: Auth;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const route = {} as ActivatedRouteSnapshot;
  const state = {url: '/documents'} as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {path: '', component: Stub, canActivate: [authGuard]},
          {path: 'login', component: Stub},
        ]),
      ],
    });
    authService = TestBed.inject(Auth);
  });

  it('lets a logged-in user through', () => {
    authService.saveSession('valid-token');

    expect(executeGuard(route, state)).toBe(true);
  });

  it('redirects an anonymous user to the login page', () => {
    const result = executeGuard(route, state);

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('keeps an anonymous user out of a guarded route', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('lets the user in again once the session is open', async () => {
    authService.saveSession('valid-token');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
