import {Component, computed, inject, type OnInit, output, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AutoComplete, type AutoCompleteCompleteEvent} from '@openng/optimus-ui/autocomplete';
import {Button, ButtonDirective, ButtonLabel} from '@openng/optimus-ui/button';
import {FileUpload} from '@openng/optimus-ui/fileupload';
import {InputText} from '@openng/optimus-ui/inputtext';
import {SelectButton} from '@openng/optimus-ui/selectbutton';
import type {FileSelectEvent} from '@openng/optimus-ui/types/fileupload';
import type {Cliente} from '../../models/cliente';
import type {NuovoIncasso} from '../../models/incasso';
import {Clienti} from '../../services/clienti';

@Component({
  selector: 'app-incasso-form',
  imports: [
    ReactiveFormsModule,
    AutoComplete,
    InputText,
    SelectButton,
    ButtonDirective,
    ButtonLabel,
    Button,
    FileUpload,
  ],
  templateUrl: './incasso-form.html',
})
export class IncassoForm implements OnInit {
  private readonly clientiService = inject(Clienti);

  suggerimenti = signal<Cliente[]>([]);
  immagine = signal<File | null>(null);

  /**
   * Asks the page for the client catalogue. The drawer only builds this form
   * when it opens, so this fires on opening and nowhere else.
   */
  emitGetClient = output<void>();

  // Il bottone di scelta e' renderizzato da p-fileupload: lo stile arriva da qui.
  readonly sceltaImmagineProps = {
    rounded: true,
    ariaLabel: "Scegli un'immagine dalla galleria",
  };

  readonly tipiPagamento = [
    {label: 'Contanti', value: 'contanti'},
    {label: 'Assegno', value: 'assegno'},
  ];

  form = new FormGroup({
    cliente: new FormControl<Cliente | null>(null, Validators.required),
    importo: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipoPagamento: new FormControl<'contanti' | 'assegno'>('contanti', {nonNullable: true}),
  });

  private readonly stato = toSignal(this.form.statusChanges, {initialValue: this.form.status});

  isFormValid = computed(() => this.stato() === 'VALID' && this.immagine() !== null);

  salva = output<NuovoIncasso>();

  ngOnInit(): void {
    this.emitGetClient.emit();
  }

  onFileSelezionato(event: FileSelectEvent): void {
    this.immagine.set(event.currentFiles[0] ?? null);
  }

  cercaClienti(event: AutoCompleteCompleteEvent): void {
    this.suggerimenti.set(this.clientiService.cerca(event.query));
  }

  onSubmit(): void {
    if (this.form.invalid || !this.immagine()) return;

    const value = this.form.getRawValue();
    this.salva.emit({
      cliente: value.cliente as Cliente,
      importo: value.importo as number,
      tipoPagamento: value.tipoPagamento,
      // biome-ignore lint/style/noNonNullAssertion: <the control has been done above>
      immagine: this.immagine()!,
    });
    this.form.reset({tipoPagamento: 'contanti'});
    this.immagine.set(null);
  }
}
