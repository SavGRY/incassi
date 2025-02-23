import {Component, ElementRef, viewChild} from '@angular/core';
import {DarkModeSwitcherComponent} from '../../shared/dark-mode-switcher/dark-mode-switcher.component';

@Component({
  selector: 'app-bottom-nav',
  imports: [DarkModeSwitcherComponent],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {}
