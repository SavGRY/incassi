import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitcherService {
  private isDark = signal(localStorage.getItem('color-theme') === 'dark');

  constructor() {
    this.updateTheme();
  }

  isDarkMode() {
    return this.isDark();
  }

  toggleTheme(): void {
    this.isDark.update((dark) => !dark);
    this.updateTheme();
  }

  private updateTheme(): void {
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    const rootElement = document.documentElement;
    if (this.isDark()) {
      rootElement.classList.add('dark');
      darkIcon?.classList.remove('hidden');
      lightIcon?.classList.add('hidden');
    } else {
      rootElement.classList.remove('dark');
      lightIcon?.classList.remove('hidden');
      darkIcon?.classList.add('hidden');
    }
    localStorage.setItem('color-theme', this.isDark() ? 'dark' : 'light');
  }
}
