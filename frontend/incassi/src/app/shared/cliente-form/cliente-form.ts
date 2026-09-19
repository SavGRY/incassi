import {ChangeDetectionStrategy, Component, computed, output} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ButtonDirective, ButtonLabel} from '@openng/optimus-ui/button';
import {InputText} from '@openng/optimus-ui/inputtext';
import type {NuovoCliente} from '../../models/cliente';

/** Two letters, mirroring the `province` constraint enforced by the backend. */
const PROVINCIA = /^[A-Za-z]{2}$/;

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, InputText, ButtonDirective, ButtonLabel],
  templateUrl: './cliente-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteForm {
  form = new FormGroup({
    name: new FormControl('', Validators.required),
    address: new FormControl(''),
    city: new FormControl('', Validators.required),
    province: new FormControl('', [Validators.required, Validators.pattern(PROVINCIA)]),
    code: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
  });

  private readonly stato = toSignal(this.form.statusChanges, {initialValue: this.form.status});

  isFormValid = computed(() => this.stato() === 'VALID');

  salva = output<NuovoCliente>();

  onSubmit(): void {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const address = (value.address ?? '').trim();

    this.salva.emit({
      code: Number(value.code),
      name: (value.name as string).trim(),
      // A blank input means "no address", not an empty address.
      address: address || null,
      city: (value.city as string).trim(),
      province: (value.province as string).toUpperCase(),
    });
    this.form.reset();
  }
}
