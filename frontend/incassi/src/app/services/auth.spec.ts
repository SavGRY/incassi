import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Auth} from './auth';

const LOGOUT_URL = 'http://localhost:8000/api/v1/auth/logout';

describe('Auth', () => {
  let service: Auth;
  let httpMock: HttpTestingController;

  const buildService = (): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('is logged out when no token is stored', () => {
    buildService();

    expect(service.isLoggedIn()).toBe(false);
  });

  it('is logged in when a token is already stored', () => {
    localStorage.setItem('token', 'stored-token');
    buildService();

    expect(service.isLoggedIn()).toBe(true);
  });

  it('saves the session token and flips isLoggedIn', () => {
    buildService();

    service.saveSession('fresh-token');

    expect(localStorage.getItem('token')).toBe('fresh-token');
    expect(service.isLoggedIn()).toBe(true);
  });

  it('clears the session token and flips isLoggedIn back', () => {
    localStorage.setItem('token', 'stored-token');
    buildService();

    service.clearSession();

    expect(localStorage.getItem('token')).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('posts an empty logout request, leaving the token to the interceptor', () => {
    buildService();

    service.logout().subscribe();

    const request = httpMock.expectOne(LOGOUT_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.urlWithParams).toBe(LOGOUT_URL);
    request.flush(null, {status: 204, statusText: 'No Content'});
    httpMock.verify();
  });
});
