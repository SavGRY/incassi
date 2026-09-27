import type {HttpErrorResponse} from '@angular/common/http';
import {Component, computed, DestroyRef, inject, type OnInit, output, type Signal, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AutoComplete, type AutoCompleteCompleteEvent} from '@openng/optimus-ui/autocomplete';
import {Button, ButtonDirective, ButtonLabel} from '@openng/optimus-ui/button';
import {FileUpload} from '@openng/optimus-ui/fileupload';
import {InputText} from '@openng/optimus-ui/inputtext';
import {Message} from '@openng/optimus-ui/message';
import {SelectButton} from '@openng/optimus-ui/selectbutton';
import type {FileSelectEvent} from '@openng/optimus-ui/types/fileupload';
import type {Client} from '../../models/Client';
import {NewIncasso, TipoPagamento, TipoPagamentoEnum} from '../../models/incasso';
import {ClientService} from '../../services/client-service';
import {ScannerService} from '../../services/scanner-service';
import {SCAN_ERRORS} from '../utils';

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
    Message,
  ],
  templateUrl: './incasso-form.html',
})
export class IncassoForm implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly scannerService = inject(ScannerService);
  private readonly destroyRef = inject(DestroyRef);

  autocomplete = signal<Client[]>([]);
  uploadedImage = signal<File | null>(null);
  isScanning = signal(false);

  /**
   * Watches the printer from when the drawer opens and builds the form.
   * Closing the drawer destroys the resource, and with it any pending check.
   */
  private readonly scannerStatus = this.scannerService.createScannerStatus();

  // While reloading the resource still holds the previous answer: it no
  // longer counts, the printer is busy until proven otherwise.
  isScannerAvailable: Signal<boolean> = computed(
    () => !this.scannerStatus.isLoading() && this.scannerStatus.value() === 'available'
  );
  /** Still looking for the printer: busy or unreachable, the retries have not run out yet. */
  isCheckingScanner = computed(() => this.scannerStatus.isLoading() || this.scannerStatus.value() === 'checking');
  scannerInfo = computed(() => this.scannerService.scannerInfo());
  scanError = signal<string | null>(null);

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
    tipoPagamento: new FormControl<TipoPagamento>(TipoPagamentoEnum.CONTANTI, {nonNullable: true}),
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

  onClearImage() {
    this.uploadedImage.set(null);
  }

  onScan(): void {
    this.isScanning.set(true);
    this.scanError.set(null);
    this.scannerService
      .scan()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (image) => {
          this.uploadedImage.set(image);
        },
        error: (error: HttpErrorResponse) => {
          this.scanError.set(SCAN_ERRORS[error.status] ?? 'Scansione non riuscita, riprova.');
          this.isScanning.set(false);
          // Someone else is scanning: wait for the printer to be free again.
          if (error.status === 409) this.scannerStatus.reload();
        },
        complete: () => {
          this.isScanning.set(false);
        },
      });
  }

  searchClients(event: AutoCompleteCompleteEvent): void {
    this.autocomplete.set(this.clientService.search(event.query));
  }

  onSubmit(): void {
    const uploadedImage: File | null = this.uploadedImage();
    if (this.form.invalid || !uploadedImage) return;

    const value = this.form.getRawValue();
    this.saveNewIncasso.emit({
      cliente: value.cliente as Client,
      importo: value.importo as number,
      tipoPagamento: value.tipoPagamento,
      immagine: uploadedImage,
    });
    this.form.reset({tipoPagamento: TipoPagamentoEnum.CONTANTI});
    this.uploadedImage.set(null);
  }
}
