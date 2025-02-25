import {animate, state, style, transition, trigger} from '@angular/animations';
import {Component, InputSignal, input, output} from '@angular/core';

@Component({
  selector: 'app-bottom-sheet',
  imports: [],
  templateUrl: './bottom-sheet.component.html',
  styleUrl: './bottom-sheet.component.scss',
  animations: [
    trigger('slideUpDown', [
      state('void', style({transform: 'translateY(100%)'})),
      state('open', style({transform: 'translateY(0)'})),
      transition('void => open', animate('300ms ease-out')),
      transition('open => void', animate('300ms ease-in')),
    ]),
  ],
})
export class BottomSheetComponent {
  title: InputSignal<string | undefined> = input();
  isOpen: InputSignal<boolean> = input.required();
  closeSheet = output();

  onClose(): void {
    this.closeSheet.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('backdrop')) {
      this.onClose();
    }
  }
}
