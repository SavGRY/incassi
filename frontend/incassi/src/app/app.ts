import {isPlatformBrowser} from '@angular/common';
import {Component, DOCUMENT, inject, PLATFORM_ID, signal} from '@angular/core';
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
  isBrowser: boolean = isPlatformBrowser(this.platformId);
  htmlEl: HTMLElement = this.document.documentElement;

  constructor() {
    if (this.isBrowser) {
      if (localStorage.getItem('theme') === 'dark') this.isDarkMode.set(true);
    }
    this.isDarkMode() ? this.htmlEl.classList.add('dark-mode') : this.htmlEl.classList.remove('dark-mode');
  }

  toggleDarkMode() {
    this.isDarkMode.update((current) => !current);
    this.htmlEl.classList.toggle('dark-mode');
    if (this.isBrowser) localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light');
  }
}
