import {HttpClient, HttpHeaders} from '@angular/common/http'
import {Injectable, inject} from '@angular/core'
import type {Observable} from 'rxjs'
import type {LoginResponse} from './Models'

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http: HttpClient = inject(HttpClient)
  private readonly API_URL: string = 'http://localhost:8000/api/v1/auth'
  private readonly httpOptions: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  })

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, `email=${email}&password=${password}`, {
      headers: this.httpOptions,
      withCredentials: true,
    })
  }
}
