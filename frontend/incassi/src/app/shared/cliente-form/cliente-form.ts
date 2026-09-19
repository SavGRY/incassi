import {Component, computed, output} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ButtonDirective, ButtonLabel} from '@openng/optimus-ui/button';
import {InputText} from '@openng/optimus-ui/inputtext';
import type {Cliente} from '../../models/cliente';

export interface NuovoCliente extends Cliente {
  indirizzo: string;
}

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, InputText, ButtonDirective, ButtonLabel],
  templateUrl: './cliente-form.html',
})
export class ClienteForm {
  form = new FormGroup({
    ragioneSociale: new FormControl('', Validators.required),
    indirizzo: new FormControl('', Validators.required),
    codice: new FormControl('', Validators.required),
  });

  isFormValid = computed(() => this.form.valid);

  salva = output<NuovoCliente>();

  onSubmit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.salva.emit({
      ragioneSociale: value.ragioneSociale as string,
      indirizzo: value.indirizzo as string,
      codice: value.codice as string,
    });
    this.form.reset();
  }
}
