import {Component, output, signal} from '@angular/core';
import {Button} from '@openng/optimus-ui/button';

@Component({
  selector: 'app-create-toggler',
  imports: [Button],
  templateUrl: './create-toggler.html',
})
export class CreateToggler {
  isDrawerOpen = signal(false);

  createIncasso = output<void>();
  createCliente = output<void>();

  toggle(): void {
    this.isDrawerOpen.update((currentState) => !currentState);
  }

  onCreateIncasso(): void {
    this.isDrawerOpen.set(false);
    this.createIncasso.emit();
  }

  onCreateCliente(): void {
    this.isDrawerOpen.set(false);
    this.createCliente.emit();
  }
}
