import {ChangeDetectionStrategy, Component, computed, output} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ButtonDirective, ButtonLabel} from '@openng/optimus-ui/button';
import {InputText} from '@openng/optimus-ui/inputtext';
import {NewClient} from '../../models/Client';

/** Two letters, mirroring the `province` constraint enforced by the backend. */
const PROVINCIA = /^[A-Za-z]{2}$/;

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, InputText, ButtonDirective, ButtonLabel],
  templateUrl: './client-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientForm {
  /**
   * One control per column of the `client` table, named after the column so
   * the payload can be sent to the API without any translation step.
   */
  form = new FormGroup({
    code: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    name: new FormControl('', Validators.required),
    address: new FormControl(''),
    city: new FormControl('', Validators.required),
    province: new FormControl('', [Validators.required, Validators.pattern(PROVINCIA)]),
  });

  private readonly formState = toSignal(this.form.statusChanges, {initialValue: this.form.status});

  isFormValid = computed(() => this.formState() === 'VALID');

  saveNewClient = output<NewClient>();

  onSubmit(): void {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const address = (value.address ?? '').trim();

    this.saveNewClient.emit({
      code: Number(value.code),
      name: (value.name ?? '').trim(),
      // A blank input means "no address", not an empty address.
      address: address || null,
      city: (value.city ?? '').trim(),
      province: (value.province ?? '').toUpperCase(),
    });
    this.form.reset();
  }
}
