import {Component} from '@angular/core';
import {inject} from '@angular/core';
import {ThemeSwitcherService} from '../../app/services/theme-switcher/theme-switcher.service';

@Component({
  selector: 'app-dark-mode-switcher',
  imports: [],
  templateUrl: './dark-mode-switcher.component.html',
  styleUrl: './dark-mode-switcher.component.scss',
})
export class DarkModeSwitcherComponent {
  themeService = inject(ThemeSwitcherService);
}
