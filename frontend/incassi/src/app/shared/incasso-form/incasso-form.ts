import {Component, computed, inject, output, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AutoComplete, type AutoCompleteCompleteEvent} from '@openng/optimus-ui/autocomplete';
import {ButtonDirective, ButtonLabel} from '@openng/optimus-ui/button';
import {InputText} from '@openng/optimus-ui/inputtext';
import {SelectButton} from '@openng/optimus-ui/selectbutton';
import type {Cliente} from '../../models/cliente';
import {Clienti} from '../../services/clienti';

export interface NuovoIncasso {
  cliente: Cliente;
  importo: number;
  tipoPagamento: 'contanti' | 'assegno';
}

@Component({
  selector: 'app-incasso-form',
  imports: [ReactiveFormsModule, AutoComplete, InputText, SelectButton, ButtonDirective, ButtonLabel],
  templateUrl: './incasso-form.html',
})
export class IncassoForm {
  private readonly clientiService = inject(Clienti);

  suggerimenti = signal<Cliente[]>([]);

  readonly tipiPagamento = [
    {label: 'Contanti', value: 'contanti'},
    {label: 'Assegno', value: 'assegno'},
  ];

  form = new FormGroup({
    cliente: new FormControl<Cliente | null>(null, Validators.required),
    importo: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipoPagamento: new FormControl<'contanti' | 'assegno'>('contanti', {nonNullable: true}),
  });

  isFormValid = computed(() => this.form.valid);

  salva = output<NuovoIncasso>();

  cercaClienti(event: AutoCompleteCompleteEvent): void {
    this.suggerimenti.set(this.clientiService.cerca(event.query));
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.salva.emit({
      cliente: value.cliente as Cliente,
      importo: value.importo as number,
      tipoPagamento: value.tipoPagamento,
    });
    this.form.reset({tipoPagamento: 'contanti'});
  }
}
