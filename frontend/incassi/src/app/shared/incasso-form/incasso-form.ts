import {Component, computed, inject, type OnInit, output, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AutoComplete, type AutoCompleteCompleteEvent} from '@openng/optimus-ui/autocomplete';
import {Button, ButtonDirective, ButtonLabel} from '@openng/optimus-ui/button';
import {FileUpload} from '@openng/optimus-ui/fileupload';
import {InputText} from '@openng/optimus-ui/inputtext';
import {SelectButton} from '@openng/optimus-ui/selectbutton';
import type {FileSelectEvent} from '@openng/optimus-ui/types/fileupload';
import type {Client} from '../../models/Client';
import type {NewIncasso} from '../../models/incasso';
import {ClientService} from '../../services/client-service';

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
  private readonly clientService = inject(ClientService);

  autocomplete = signal<Client[]>([]);
  uploadedImage = signal<File | null>(null);

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

  readonly paymentType = [
    {label: 'Contanti', value: 'contanti'},
    {label: 'Assegno', value: 'assegno'},
  ];

  form = new FormGroup({
    cliente: new FormControl<Client | null>(null, Validators.required),
    importo: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipoPagamento: new FormControl<'contanti' | 'assegno'>('contanti', {nonNullable: true}),
  });

  private readonly formState = toSignal(this.form.statusChanges, {initialValue: this.form.status});

  isFormValid = computed(() => this.formState() === 'VALID' && this.uploadedImage() !== null);

  saveNewIncasso = output<NewIncasso>();

  ngOnInit(): void {
    this.emitGetClient.emit();
  }

  onSelectedFile(event: FileSelectEvent): void {
    this.uploadedImage.set(event.currentFiles[0] ?? null);
  }

  searchClients(event: AutoCompleteCompleteEvent): void {
    this.autocomplete.set(this.clientService.search(event.query));
    console.log(this.autocomplete());
  }

  onSubmit(): void {
    if (this.form.invalid || !this.uploadedImage()) return;

    const value = this.form.getRawValue();
    this.saveNewIncasso.emit({
      cliente: value.cliente as Client,
      importo: value.importo as number,
      tipoPagamento: value.tipoPagamento,
      // biome-ignore lint/style/noNonNullAssertion: <Control done above>
      immagine: this.uploadedImage()!,
    });
    this.form.reset({tipoPagamento: 'contanti'});
    this.uploadedImage.set(null);
  }
}
