import {Component} from '@angular/core';
import {Button} from 'primeng/button';

@Component({
  selector: 'app-dark-mode-switch',
  imports: [Button],
  template: `<p-button label="Toggle Dark Mode" (onClick)="toggleDarkMode()"/>`,
  styles: [``],
})
export class DarkModeSwitch {
  toggleDarkMode() {
    const element = document.querySelector('html')!;
    element.classList.toggle('dark');
  }
}
