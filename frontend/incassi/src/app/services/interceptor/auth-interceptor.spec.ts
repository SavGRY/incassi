import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {vi} from 'vitest';
import {Auth} from '../auth';
import {authInterceptor} from './auth-interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: Auth;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(Auth);
    router = TestBed.inject(Router);
  });

  it('attaches the stored token to the request', () => {
    localStorage.setItem('token', 'stored-token');

    http.get('/whatever').subscribe();

    const request = httpMock.expectOne('/whatever');
    expect(request.request.headers.get('Authorization')).toBe('Token stored-token');
    request.flush({});
  });

  it('sends no Authorization header when there is no token', () => {
    http.get('/whatever').subscribe();

    const request = httpMock.expectOne('/whatever');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('clears the session and redirects to login on a 401', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    authService.saveSession('stale-token');

    http.get('/whatever').subscribe({error: () => undefined});
    httpMock.expectOne('/whatever').flush(null, {status: 401, statusText: 'Unauthorized'});

    expect(localStorage.getItem('token')).toBeNull();
    expect(authService.isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['login']);
  });
});
