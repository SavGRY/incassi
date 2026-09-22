import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {vi} from 'vitest';
import {Auth} from '../../services/auth';
import {AuthButton} from './auth-button';

const LOGOUT_URL = 'http://localhost:8000/api/v1/auth/logout';

describe('AuthButton', () => {
  let fixture: ComponentFixture<AuthButton>;
  let component: AuthButton;
  let httpMock: HttpTestingController;
  let authService: Auth;
  let navigate: ReturnType<typeof vi.spyOn>;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector) ?? document.body.querySelector(selector);

  const build = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AuthButton],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(Auth);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AuthButton);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('when logged out', () => {
    beforeEach(async () => {
      await build();
    });

    it('offers the login action', () => {
      expect(query('button[aria-label="Accedi"]')).not.toBeNull();
      expect(query('button[aria-label="Esci"]')).toBeNull();
    });

    it('goes to the login page without asking for a confirmation', () => {
      query('button[aria-label="Accedi"]')?.click();
      fixture.detectChanges();

      expect(navigate).toHaveBeenCalledWith(['/login']);
      expect(component.isConfirmingLogout()).toBe(false);
    });
  });

  describe('when logged in', () => {
    beforeEach(async () => {
      localStorage.setItem('token', 'a-token');
      await build();
    });

    it('offers the logout action', () => {
      expect(query('button[aria-label="Esci"]')).not.toBeNull();
      expect(query('button[aria-label="Accedi"]')).toBeNull();
    });

    it('spaces the open dialog away from the screen edges', () => {
      component.askForConfirmation();
      fixture.detectChanges();

      // The mask belongs to Dialog's own template, so a style scoped to this
      // component can never reach it: the spacing has to ride on `maskStyleClass`.
      const mask = query('.p-dialog-mask');
      expect(mask).not.toBeNull();
      expect(mask?.classList.contains('py-4')).toBe(true);
    });

    it('asks for a confirmation instead of logging out straight away', () => {
      query('button[aria-label="Esci"]')?.click();
      fixture.detectChanges();

      expect(component.isConfirmingLogout()).toBe(true);
      expect(authService.isLoggedIn()).toBe(true);
    });

    it('keeps the session when the confirmation is dismissed', () => {
      component.askForConfirmation();
      fixture.detectChanges();

      component.cancelLogout();
      fixture.detectChanges();

      expect(component.isConfirmingLogout()).toBe(false);
      expect(authService.isLoggedIn()).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('closes the session and goes to the login page once confirmed', () => {
      component.askForConfirmation();

      component.confirmLogout();
      httpMock.expectOne(LOGOUT_URL).flush(null, {status: 204, statusText: 'No Content'});
      fixture.detectChanges();

      expect(authService.isLoggedIn()).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
      expect(component.isConfirmingLogout()).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });

    it('closes the session anyway when the logout call fails', () => {
      component.askForConfirmation();

      component.confirmLogout();
      httpMock.expectOne(LOGOUT_URL).flush(null, {status: 500, statusText: 'Internal Server Error'});
      fixture.detectChanges();

      expect(authService.isLoggedIn()).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
      expect(component.isConfirmingLogout()).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
