import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {vi} from 'vitest';
import {Auth} from '../../services/auth';
import {Login} from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let httpMock: HttpTestingController;
  let authService: Auth;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(Auth);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the session and goes home once the credentials are accepted', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.loginForm.setValue({email: 'autista@example.com', password: 'secret'});

    component.onLogin();
    httpMock
      .expectOne('http://localhost:8000/api/v1/auth/login')
      .flush({message: 'Login successful', token: 'fresh-token'});

    expect(authService.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('token')).toBe('fresh-token');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
