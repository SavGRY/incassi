import type {HttpErrorResponse} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  type OnInit,
  output,
  type Signal,
  signal,
  viewChild,
} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AutoComplete, type AutoCompleteCompleteEvent} from '@openng/optimus-ui/autocomplete';
import {Button} from '@openng/optimus-ui/button';
import {FileUpload} from '@openng/optimus-ui/fileupload';
import {Image} from '@openng/optimus-ui/image';
import {InputText} from '@openng/optimus-ui/inputtext';
import {Message} from '@openng/optimus-ui/message';
import {SelectButton} from '@openng/optimus-ui/selectbutton';
import {Step, StepList, StepPanel, StepPanels, Stepper} from '@openng/optimus-ui/stepper';
import type {FileSelectEvent} from '@openng/optimus-ui/types/fileupload';
import type {Client} from '../../models/Client';
import {type IncassiSubmission, type NewIncasso, type TipoPagamento, TipoPagamentoEnum} from '../../models/incasso';
import {ClientService} from '../../services/client-service';
import {ScannerService} from '../../services/scanner-service';
import {IncassoList} from '../incasso-list/incasso-list';
import {formatEuro, SCAN_ERRORS} from '../utils';

/** An image of the round, with the URL that shows its thumbnail. */
interface RoundImage {
  file: File;
  url: string;
}

@Component({
  selector: 'app-incasso-form',
  imports: [
    ReactiveFormsModule,
    AutoComplete,
    InputText,
    SelectButton,
    Button,
    FileUpload,
    Image,
    Message,
    Stepper,
    StepList,
    Step,
    StepPanels,
    StepPanel,
    IncassoList,
  ],
  templateUrl: './incasso-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncassoForm implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly scannerService = inject(ScannerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly STEP_INCASSI = 1;
  readonly STEP_IMAGES = 2;
  readonly STEP_SUMMARY = 3;

  activeStep = signal(this.STEP_INCASSI);

  incassi = signal<NewIncasso[]>([]);
  images = signal<RoundImage[]>([]);
  /** The incasso loaded back into the form, `null` while adding a new one. */
  editingIndex = signal<number | null>(null);

  total = computed(() => this.incassi().reduce((sum, incasso) => sum + incasso.importo, 0));
  totalsByType = computed(() => {
    const totals = {[TipoPagamentoEnum.CONTANTI]: 0, [TipoPagamentoEnum.ASSEGNO]: 0};
    for (const incasso of this.incassi()) totals[incasso.tipoPagamento] += incasso.importo;
    return totals;
  });
  /** Something would be lost by leaving the page now. */
  hasData = computed(() => this.incassi().length > 0 || this.images().length > 0);

  canGoToImages = computed(() => this.incassi().length > 0);
  canGoToSummary = computed(() => this.canGoToImages() && this.images().length > 0);

  autocomplete = signal<Client[]>([]);
  isScanning = signal(false);

  /**
   * Watches the printer only while the images step is open: leaving the step,
   * or the page, stops any pending check.
   */
  private readonly scannerStatus = this.scannerService.createScannerStatus(
    () => this.activeStep() === this.STEP_IMAGES
  );

  // While reloading the resource still holds the previous answer: it no
  // longer counts, the printer is busy until proven otherwise.
  isScannerAvailable: Signal<boolean> = computed(
    () => !this.scannerStatus.isLoading() && this.scannerStatus.value() === 'available'
  );
  /** Still looking for the printer: busy or unreachable, the retries have not run out yet. */
  isCheckingScanner = computed(() => this.scannerStatus.isLoading() || this.scannerStatus.value() === 'checking');
  scannerInfo = computed(() => this.scannerService.scannerInfo());
  scanError = signal<string | null>(null);

  /** Why the page could not send the round, shown on the summary. */
  submitError = input<string | null>(null);
  /** The page is sending the round. */
  isSubmitting = input(false);

  /**
   * Asks the page for the client catalogue. The page only builds this form
   * when it opens, so this fires on opening and nowhere else.
   */
  emitGetClient = output<void>();
  submitIncassi = output<IncassiSubmission>();

  private readonly fileUpload = viewChild(FileUpload);

  readonly formatEuro = formatEuro;
  readonly CONTANTI = TipoPagamentoEnum.CONTANTI;
  readonly ASSEGNO = TipoPagamentoEnum.ASSEGNO;

  // Il bottone di scelta e' renderizzato da p-fileupload: lo stile arriva da qui.
  readonly sceltaImmagineProps = {
    rounded: true,
    ariaLabel: 'Scegli le immagini dalla galleria',
  };

  readonly paymentType = [
    {label: 'Contanti', value: TipoPagamentoEnum.CONTANTI},
    {label: 'Assegno', value: TipoPagamentoEnum.ASSEGNO},
  ];

  form = new FormGroup({
    cliente: new FormControl<Client | null>(null, Validators.required),
    importo: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    tipoPagamento: new FormControl<TipoPagamento>(TipoPagamentoEnum.CONTANTI, {nonNullable: true}),
  });

  private readonly formState = toSignal(this.form.statusChanges, {initialValue: this.form.status});

  isFormValid = computed(() => this.formState() === 'VALID');

  constructor() {
    this.destroyRef.onDestroy(() => {
      for (const image of this.images()) URL.revokeObjectURL(image.url);
    });
  }

  ngOnInit(): void {
    this.emitGetClient.emit();
  }

  goTo(step: number | undefined): void {
    if (step !== undefined) this.activeStep.set(step);
  }

  /** Adds the incasso in the form, or saves the one being edited. */
  onSaveIncasso(): void {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const incasso: NewIncasso = {
      cliente: value.cliente as Client,
      importo: value.importo as number,
      tipoPagamento: value.tipoPagamento,
    };
    const editing = this.editingIndex();
    this.incassi.update((incassi) =>
      editing === null ? [...incassi, incasso] : incassi.map((old, index) => (index === editing ? incasso : old))
    );
    this.resetForm();
  }

  onEditIncasso(index: number): void {
    const incasso = this.incassi()[index];
    this.form.setValue({
      cliente: incasso.cliente,
      importo: incasso.importo,
      tipoPagamento: incasso.tipoPagamento,
    });
    this.editingIndex.set(index);
  }

  onRemoveIncasso(index: number): void {
    const editing = this.editingIndex();
    if (editing === index) this.resetForm();
    // The rows after the removed one move up by one.
    else if (editing !== null && editing > index) this.editingIndex.set(editing - 1);
    this.incassi.update((incassi) => incassi.filter((_, i) => i !== index));
  }

  resetForm(): void {
    this.form.reset({tipoPagamento: TipoPagamentoEnum.CONTANTI});
    this.editingIndex.set(null);
  }

  onSelectedFiles(event: FileSelectEvent): void {
    // `currentFiles` only holds the files that passed the type and size checks.
    for (const file of event.currentFiles) this.addImage(file);
    // The component keeps its own list: emptied, it lets the same file be picked again.
    this.fileUpload()?.clear();
  }

  onRemoveImage(index: number): void {
    URL.revokeObjectURL(this.images()[index].url);
    this.images.update((images) => images.filter((_, i) => i !== index));
  }

  onScan(): void {
    this.isScanning.set(true);
    this.scanError.set(null);
    this.scannerService
      .scan()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (image) => {
          this.addImage(image);
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
    if (!this.canGoToSummary() || this.isSubmitting()) return;
    this.submitIncassi.emit({
      incassi: this.incassi(),
      images: this.images().map((image) => image.file),
    });
  }

  private addImage(file: File): void {
    this.images.update((images) => [...images, {file, url: URL.createObjectURL(file)}]);
  }
}
