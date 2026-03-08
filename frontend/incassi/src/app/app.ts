import {isPlatformBrowser} from '@angular/common';
import {Component, DOCUMENT, effect, inject, PLATFORM_ID, signal} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Button} from 'primeng/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Button],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('incassi');
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID); // Ci serve per capire se siamo nel browser

  isDarkMode = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('theme');
      // Se l'utente aveva salvato 'dark', aggiorniamo il Signal
      if (savedTheme === 'dark') {
        this.isDarkMode.set(true);
      }
    }

    effect(() => {
      const darkMode = this.isDarkMode();
      const htmlEl = this.document.documentElement;

      if (darkMode) {
        htmlEl.classList.add('dark-mode');
      } else {
        htmlEl.classList.remove('dark-mode');
      }

      // se sono nel browser salvo la preferenza
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
      }
    });
  }

  toggleDarkMode() {
    this.isDarkMode.update((current) => !current);
  }
}
