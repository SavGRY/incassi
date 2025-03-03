import {Component, signal} from '@angular/core';
import {BottomSheetComponent} from '../bottom-sheet/bottom-sheet.component';
import {DarkModeSwitcherComponent} from '../dark-mode-switcher/dark-mode-switcher.component';

@Component({
  selector: 'app-bottom-nav',
  imports: [DarkModeSwitcherComponent, BottomSheetComponent],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  isBottomSheetOpen = signal(false);

  toggleBottomSheet(): void {
    this.isBottomSheetOpen.update((state) => !state);
  }
}
