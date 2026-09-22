import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {App} from './app';

describe('App', () => {
  let store: Record<string, string> = {};
  beforeAll(() => {
    const mockLocalStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };

    // Sovrascriviamo l'oggetto globale in modo sicuro
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  beforeEach(async () => {
    store = {};
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the auth button next to the dark mode toggle', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const header = (fixture.nativeElement as HTMLElement).querySelector('header');

    // `header?.querySelector` on a missing header yields undefined, which slips
    // past `not.toBeNull()`, so the header itself is asserted first.
    expect(header).not.toBeNull();
    expect(header?.querySelector('app-auth-button')).toBeInstanceOf(HTMLElement);
    expect(header?.querySelector('button[aria-label="Attiva/disattiva tema scuro"]')).toBeInstanceOf(HTMLButtonElement);
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Ciao tuo nome');
  });
});
