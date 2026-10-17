import {isPlatformBrowser} from '@angular/common';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable, inject, PLATFORM_ID, signal} from '@angular/core';
import {Observable} from 'rxjs';
import {LoginResponse} from '../models/Auth';

const TOKEN_KEY = 'token';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser: boolean = isPlatformBrowser(this.platformId);
  private readonly API_URL: string = 'http://localhost:8000/api/v1/auth';
  private readonly httpOptions: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  /** Single source of truth for "is there a session?", read once at startup. */
  readonly isLoggedIn = signal<boolean>(this.readStoredToken() !== null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, `email=${email}&password=${password}`, {
      headers: this.httpOptions,
      withCredentials: true,
    });
  }

  /**
   * The token is not in the body nor in the query string: `authInterceptor`
   * puts it in the `Authorization` header, which is where the API reads it.
   */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/logout`, null);
  }

  saveSession(token: string): void {
    if (this.isBrowser) localStorage.setItem(TOKEN_KEY, token);
    this.isLoggedIn.set(true);
  }

  clearSession(): void {
    if (this.isBrowser) localStorage.removeItem(TOKEN_KEY);
    this.isLoggedIn.set(false);
  }

  private readStoredToken(): string | null {
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }
}
