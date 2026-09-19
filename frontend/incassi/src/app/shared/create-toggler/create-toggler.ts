import {Component, output, signal} from '@angular/core';
import {Button} from '@openng/optimus-ui/button';

@Component({
  selector: 'app-create-toggler',
  imports: [Button],
  templateUrl: './create-toggler.html',
})
export class CreateToggler {
  aperto = signal(false);

  creaIncasso = output<void>();
  creaCliente = output<void>();

  toggle(): void {
    this.aperto.update((current) => !current);
  }

  onCreaIncasso(): void {
    this.aperto.set(false);
    this.creaIncasso.emit();
  }

  onCreaCliente(): void {
    this.aperto.set(false);
    this.creaCliente.emit();
  }
}
