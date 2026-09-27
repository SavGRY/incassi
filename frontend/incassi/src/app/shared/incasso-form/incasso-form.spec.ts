import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import type {Client} from '../../models/Client';
import {type IncassiSubmission, type NewIncasso, TipoPagamentoEnum} from '../../models/incasso';
import {formatEuro, retryDelay, SCANNER_RECHECK_INTERVAL_MS} from '../utils';
import {IncassoForm} from './incasso-form';

const SCAN_URL = 'http://localhost:8000/api/v1/scanner/scan';
const STATUS_URL = 'http://localhost:8000/api/v1/scanner/status';
const MODEL = 'EPSON ET-4850 Series';

const ROSSI: Client = {code: 12, name: 'Rossi S.r.l.', address: null, city: 'Milano', province: 'MI'};
const BIANCHI: Client = {code: 7, name: 'Bianchi S.p.A.', address: null, city: 'Lodi', province: 'LO'};

const CASH: NewIncasso = {cliente: ROSSI, importo: 120.5, tipoPagamento: TipoPagamentoEnum.CONTANTI};
const CHEQUE: NewIncasso = {cliente: BIANCHI, importo: 80, tipoPagamento: TipoPagamentoEnum.ASSEGNO};

const aPhoto = (name = 'ricevuta.jpg'): File => new File(['jpeg'], name, {type: 'image/jpeg'});

describe('IncassoForm', () => {
  let fixture: ComponentFixture<IncassoForm>;
  let component: IncassoForm;
  let httpMock: HttpTestingController;
  let objectUrls: number;

  const element = (): HTMLElement => fixture.nativeElement;

  /** The inner `<button>` a `p-button` with `id` renders. */
  const button = (id: string): HTMLButtonElement | null => element().querySelector(`#${id} button`);

  const buttonLabelled = (label: string): HTMLButtonElement | null =>
    element().querySelector(`button[aria-label="${label}"]`);

  const scanButton = (): HTMLButtonElement | null => button('scan-button');

  const spinner = (): Element | null | undefined => scanButton()?.querySelector('.p-button-loading-icon');

  const scannerIcon = (): Element | null | undefined => scanButton()?.querySelector('.fa-scanner-image');

  const errorText = (): string | undefined =>
    element().querySelector('p-message[severity="error"]')?.textContent?.trim();

  /** What the backend says about a scanner in `state`. */
  const status = (state: string) => ({info: MODEL, scanner_status: state});

  /** The resource publishes what it got on the next tick, then the view follows. */
  const settle = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  };

  /** Answers the status check waiting right now. */
  const scannerAnswers = async (available: boolean): Promise<void> => {
    httpMock.expectOne(STATUS_URL).flush(status(available ? 'Idle' : 'Processing'));
    await settle();
  };

  /** Makes the scanner say it is ready, like right after the images step opens. */
  const scannerReady = (): Promise<void> => scannerAnswers(true);

  /** Lets a scan go through. */
  const completeScan = async (): Promise<void> => {
    httpMock.expectOne(SCAN_URL).flush(new Blob(['jpeg'], {type: 'image/jpeg'}));
    await settle();
  };

  /** Types an incasso in the form and adds it with the button. */
  const addIncasso = async (incasso: NewIncasso): Promise<void> => {
    component.form.setValue({
      cliente: incasso.cliente,
      importo: incasso.importo,
      tipoPagamento: incasso.tipoPagamento,
    });
    fixture.detectChanges();
    button('save-incasso')?.click();
    await settle();
  };

  const goTo = async (step: number): Promise<void> => {
    component.goTo(step);
    await settle();
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    // jsdom has no object URLs: any string does for a thumbnail.
    objectUrls = 0;
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => `blob:thumbnail-${++objectUrls}`),
        revokeObjectURL: vi.fn(),
      })
    );
    await TestBed.configureTestingModule({
      imports: [IncassoForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IncassoForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('Incassi step', () => {
    it('does not look for the scanner while the incassi are entered', async () => {
      await settle();

      httpMock.expectNone(STATUS_URL);
    });

    it('adds the incasso to the list and empties the form', async () => {
      await addIncasso(CASH);

      expect(component.incassi()).toEqual([CASH]);
      expect(component.form.getRawValue()).toEqual({
        cliente: null,
        importo: null,
        tipoPagamento: TipoPagamentoEnum.CONTANTI,
      });
      expect(element().querySelector('app-incasso-list')?.textContent).toContain('Rossi S.r.l.');
    });

    it('keeps the add button disabled until the form is valid', async () => {
      expect(button('save-incasso')?.disabled).toBe(true);

      component.form.setValue({cliente: ROSSI, importo: 0, tipoPagamento: TipoPagamentoEnum.CONTANTI});
      await settle();
      expect(button('save-incasso')?.disabled).toBe(true);

      component.form.patchValue({importo: 10});
      await settle();
      expect(button('save-incasso')?.disabled).toBe(false);
    });

    it('sums the incassi', async () => {
      await addIncasso(CASH);
      await addIncasso(CHEQUE);

      expect(element().querySelector('[data-testid="incassi-total"]')?.textContent).toBe(formatEuro(200.5));
    });

    it('loads an incasso back into the form to edit it', async () => {
      await addIncasso(CASH);
      await addIncasso(CHEQUE);

      buttonLabelled('Modifica incasso di Rossi S.r.l.')?.click();
      await settle();
      expect(component.form.getRawValue()).toEqual(CASH);
      expect(button('save-incasso')?.textContent).toContain('Aggiorna incasso');

      component.form.patchValue({importo: 99});
      button('save-incasso')?.click();
      await settle();

      expect(component.incassi()).toEqual([{...CASH, importo: 99}, CHEQUE]);
      expect(component.editingIndex()).toBeNull();
    });

    it('drops the changes of an edit when cancelled', async () => {
      await addIncasso(CASH);
      buttonLabelled('Modifica incasso di Rossi S.r.l.')?.click();
      await settle();

      component.form.patchValue({importo: 99});
      element().querySelector<HTMLButtonElement>('p-button[label="Annulla"] button')?.click();
      await settle();

      expect(component.incassi()).toEqual([CASH]);
      expect(component.editingIndex()).toBeNull();
      expect(component.form.getRawValue().importo).toBeNull();
    });

    it('removes an incasso', async () => {
      await addIncasso(CASH);
      await addIncasso(CHEQUE);

      buttonLabelled('Elimina incasso di Rossi S.r.l.')?.click();
      await settle();

      expect(component.incassi()).toEqual([CHEQUE]);
    });

    it('leaves the edit when the incasso being edited is removed', async () => {
      await addIncasso(CASH);
      buttonLabelled('Modifica incasso di Rossi S.r.l.')?.click();
      await settle();

      buttonLabelled('Elimina incasso di Rossi S.r.l.')?.click();
      await settle();

      expect(component.editingIndex()).toBeNull();
      expect(component.form.getRawValue().cliente).toBeNull();
    });

    it('keeps editing the same incasso when a row above it is removed', async () => {
      await addIncasso(CASH);
      await addIncasso(CHEQUE);
      buttonLabelled('Modifica incasso di Bianchi S.p.A.')?.click();
      await settle();

      buttonLabelled('Elimina incasso di Rossi S.r.l.')?.click();
      await settle();

      expect(component.editingIndex()).toBe(0);
    });

    it('goes on to the images only once there is an incasso', async () => {
      expect(button('to-images')?.disabled).toBe(true);

      await addIncasso(CASH);
      button('to-images')?.click();
      await settle();

      expect(component.activeStep()).toBe(component.STEP_IMAGES);
      await scannerReady();
    });
  });

  describe('Immagini step', () => {
    beforeEach(async () => {
      component.incassi.set([CASH]);
      await goTo(component.STEP_IMAGES);
    });

    it('adds every picked image, even across picks', async () => {
      await scannerReady();
      const first = aPhoto('a.jpg');
      const second = aPhoto('b.jpg');
      const third = aPhoto('c.jpg');

      component.onSelectedFiles({
        originalEvent: new Event('change'),
        files: [first, second],
        currentFiles: [first, second],
      });
      component.onSelectedFiles({originalEvent: new Event('change'), files: [third], currentFiles: [third]});
      await settle();

      expect(component.images().map((image) => image.file)).toEqual([first, second, third]);
      expect(element().querySelectorAll('p-image')).toHaveLength(3);
    });

    it('removes an image and frees its thumbnail', async () => {
      await scannerReady();
      component.onSelectedFiles({originalEvent: new Event('change'), files: [aPhoto()], currentFiles: [aPhoto()]});
      await settle();

      buttonLabelled('Elimina immagine 1')?.click();
      await settle();

      expect(component.images()).toEqual([]);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumbnail-1');
    });

    it('frees the thumbnails when the form is closed', async () => {
      await scannerReady();
      component.onSelectedFiles({originalEvent: new Event('change'), files: [aPhoto()], currentFiles: [aPhoto()]});

      fixture.destroy();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:thumbnail-1');
    });

    it('goes on to the summary only once there is an image', async () => {
      await scannerReady();
      expect(button('to-summary')?.disabled).toBe(true);

      component.onSelectedFiles({originalEvent: new Event('change'), files: [aPhoto()], currentFiles: [aPhoto()]});
      await settle();
      button('to-summary')?.click();
      await settle();

      expect(component.activeStep()).toBe(component.STEP_SUMMARY);
    });

    it('stops checking the scanner when going back to the incassi', async () => {
      await scannerReady();

      await goTo(component.STEP_INCASSI);
      await vi.advanceTimersByTimeAsync(160000);

      httpMock.expectNone(STATUS_URL);
    });

    it('looks for the scanner again when coming back to the images', async () => {
      await scannerReady();
      await goTo(component.STEP_INCASSI);

      await goTo(component.STEP_IMAGES);

      await scannerReady();
      expect(scanButton()?.disabled).toBe(false);
    });

    it('offers to scan the receipt with the printer', async () => {
      await scannerReady();

      expect(scanButton()).not.toBeNull();
      expect(scanButton()?.disabled).toBe(false);
    });

    it('shows a spinner instead of the scanner icon while looking for the scanner', async () => {
      expect(spinner()).not.toBeNull();
      expect(scannerIcon()).toBeNull();

      await scannerAnswers(false);
      expect(spinner()).not.toBeNull();

      await vi.advanceTimersByTimeAsync(retryDelay(1));
      await scannerReady();

      expect(spinner()).toBeNull();
      expect(scannerIcon()).not.toBeNull();
    });

    it('says it is looking for the printer to screen readers', async () => {
      expect(scanButton()?.getAttribute('aria-label')).toBe('Cercando la stampante');

      await scannerReady();

      expect(scanButton()?.getAttribute('aria-label')).toBe('Scansiona con la stampante');
    });

    it('shows the spinner while scanning', async () => {
      await scannerReady();
      scanButton()?.click();
      fixture.detectChanges();

      expect(spinner()).not.toBeNull();
      await completeScan();
    });

    it('stops the spinner once the retries run out', async () => {
      await scannerAnswers(false);
      for (let attempt = 1; attempt <= 10; attempt++) {
        await vi.advanceTimersByTimeAsync(retryDelay(attempt));
        await scannerAnswers(false);
      }

      expect(spinner()).toBeNull();
    });

    it('keeps the scan button disabled until the scanner answers', async () => {
      expect(scanButton()?.disabled).toBe(true);

      await scannerReady();
    });

    it('asks again, waiting longer each time, until the scanner is available', async () => {
      await scannerAnswers(false);
      expect(scanButton()?.disabled).toBe(true);

      await vi.advanceTimersByTimeAsync(retryDelay(1) - 1);
      httpMock.expectNone(STATUS_URL);
      await vi.advanceTimersByTimeAsync(1);
      await scannerAnswers(false);

      await vi.advanceTimersByTimeAsync(retryDelay(2));
      await scannerAnswers(true);

      expect(scanButton()?.disabled).toBe(false);
    });

    it('checks an available scanner again once in a while', async () => {
      await scannerReady();

      await vi.advanceTimersByTimeAsync(SCANNER_RECHECK_INTERVAL_MS - 1);
      httpMock.expectNone(STATUS_URL);
      await vi.advanceTimersByTimeAsync(1);
      await scannerReady();

      await vi.advanceTimersByTimeAsync(SCANNER_RECHECK_INTERVAL_MS);
      await scannerReady();

      expect(scanButton()?.disabled).toBe(false);
    });

    it('disables the scan button when the scanner gets busy again', async () => {
      await scannerReady();

      // Someone started a copy from the printer panel.
      await vi.advanceTimersByTimeAsync(SCANNER_RECHECK_INTERVAL_MS);
      await scannerAnswers(false);

      expect(scanButton()?.disabled).toBe(true);
      // And says it is looking for the printer again.
      expect(spinner()).not.toBeNull();
      expect(scanButton()?.getAttribute('aria-label')).toBe('Cercando la stampante');
    });

    it('enables the scan button again once the busy scanner is free', async () => {
      await scannerReady();
      await vi.advanceTimersByTimeAsync(SCANNER_RECHECK_INTERVAL_MS);
      await scannerAnswers(false);

      // Back to waiting for it, with a growing delay.
      await vi.advanceTimersByTimeAsync(retryDelay(1));
      await scannerAnswers(false);
      await vi.advanceTimersByTimeAsync(retryDelay(2));
      await scannerReady();

      expect(scanButton()?.disabled).toBe(false);
      expect(spinner()).toBeNull();
    });

    it('disables the scan button when the scanner can no longer be reached', async () => {
      await scannerReady();

      await vi.advanceTimersByTimeAsync(SCANNER_RECHECK_INTERVAL_MS);
      httpMock.expectOne(STATUS_URL).flush(null, {status: 504, statusText: 'Gateway Timeout'});
      await settle();

      expect(scanButton()?.disabled).toBe(true);
      await vi.advanceTimersByTimeAsync(retryDelay(1));
      await scannerReady();
      expect(scanButton()?.disabled).toBe(false);
    });

    it('checks an available scanner at the usual pace after it was busy', async () => {
      await scannerReady();
      await vi.advanceTimersByTimeAsync(SCANNER_RECHECK_INTERVAL_MS);
      await scannerAnswers(false);
      await vi.advanceTimersByTimeAsync(retryDelay(1));
      await scannerReady();

      // The retries start over from the shortest delay, the recheck from 15s.
      await vi.advanceTimersByTimeAsync(SCANNER_RECHECK_INTERVAL_MS - 1);
      httpMock.expectNone(STATUS_URL);
      await vi.advanceTimersByTimeAsync(1);
      await scannerAnswers(false);
      await vi.advanceTimersByTimeAsync(retryDelay(1));
      await scannerReady();
    });

    it('stops checking the scanner when the form is closed', async () => {
      await scannerReady();

      fixture.destroy();
      await vi.advanceTimersByTimeAsync(160000);

      httpMock.expectNone(STATUS_URL);
    });

    it('shows which printer it is connected to', async () => {
      await scannerReady();

      expect(fixture.nativeElement.textContent).toContain(`Connesso a ${MODEL}`);
    });

    it('retries a failed status check like an unavailable scanner', async () => {
      httpMock.expectOne(STATUS_URL).flush(null, {status: 504, statusText: 'Gateway Timeout'});
      await settle();
      expect(scanButton()?.disabled).toBe(true);

      await vi.advanceTimersByTimeAsync(retryDelay(1));
      await scannerReady();

      expect(scanButton()?.disabled).toBe(false);
    });

    it('gives up after the last retry and leaves the button disabled', async () => {
      await scannerAnswers(false);
      for (let attempt = 1; attempt <= 10; attempt++) {
        await vi.advanceTimersByTimeAsync(retryDelay(attempt));
        await scannerAnswers(false);
      }

      await vi.advanceTimersByTimeAsync(160000);

      httpMock.expectNone(STATUS_URL);
      expect(scanButton()?.disabled).toBe(true);
    });

    it('does not retry when no scanner is configured', async () => {
      httpMock
        .expectOne(STATUS_URL)
        .flush({detail: 'No scanner configured'}, {status: 503, statusText: 'Service Unavailable'});
      await settle();

      await vi.advanceTimersByTimeAsync(160000);

      httpMock.expectNone(STATUS_URL);
      expect(scanButton()?.disabled).toBe(true);
    });

    it.each(['Testing', 'Stopped', 'Down'])('keeps waiting while the scanner is %s', async (state) => {
      httpMock.expectOne(STATUS_URL).flush(status(state));
      await settle();
      expect(scanButton()?.disabled).toBe(true);

      await vi.advanceTimersByTimeAsync(retryDelay(1));
      await scannerReady();

      expect(scanButton()?.disabled).toBe(false);
    });

    it('does not retry when the session has expired', async () => {
      httpMock.expectOne(STATUS_URL).flush(null, {status: 401, statusText: 'Unauthorized'});
      await settle();

      await vi.advanceTimersByTimeAsync(160000);

      httpMock.expectNone(STATUS_URL);
      expect(scanButton()?.disabled).toBe(true);
    });

    it('stops retrying when the form is closed', async () => {
      await scannerAnswers(false);

      fixture.destroy();
      await vi.advanceTimersByTimeAsync(160000);

      httpMock.expectNone(STATUS_URL);
    });

    it('cancels a scan still running when the form is closed', async () => {
      await scannerReady();
      scanButton()?.click();
      const request = httpMock.expectOne(SCAN_URL);

      fixture.destroy();

      expect(request.cancelled).toBe(true);
    });

    it('keeps the scan button enabled after a scan while the scanner stays free', async () => {
      await scannerReady();
      scanButton()?.click();
      await completeScan();

      await vi.advanceTimersByTimeAsync(SCANNER_RECHECK_INTERVAL_MS);
      await scannerReady();

      expect(scanButton()?.disabled).toBe(false);
    });

    it('adds the scanned sheet to the images', async () => {
      await scannerReady();
      scanButton()?.click();

      const request = httpMock.expectOne(SCAN_URL);
      expect(request.request.method).toBe('POST');
      request.flush(new Blob(['jpeg'], {type: 'image/jpeg'}));
      fixture.detectChanges();

      const images = component.images();
      expect(images).toHaveLength(1);
      expect(images[0].file).toBeInstanceOf(File);
      expect(images[0].file.type).toBe('image/jpeg');
      expect(component.isScanning()).toBe(false);
      expect(errorText()).toBeUndefined();
    });

    it('keeps adding the sheets scanned one after the other', async () => {
      await scannerReady();
      scanButton()?.click();
      await completeScan();
      scanButton()?.click();
      await completeScan();

      expect(component.images()).toHaveLength(2);
    });

    it('does not start a second scan while one is running', async () => {
      await scannerReady();
      scanButton()?.click();
      fixture.detectChanges();

      expect(component.isScanning()).toBe(true);
      expect(scanButton()?.disabled).toBe(true);

      scanButton()?.click();
      await completeScan();
    });

    it('tells the user when the scanner cannot be reached', async () => {
      await scannerReady();
      scanButton()?.click();
      httpMock.expectOne(SCAN_URL).flush(null, {status: 504, statusText: 'Gateway Timeout'});
      fixture.detectChanges();

      expect(errorText()).toBe('Lo scanner non è raggiungibile: controlla che la stampante sia accesa.');
      expect(component.images()).toEqual([]);
      expect(component.isScanning()).toBe(false);
    });

    it('tells the user when the scanner is busy', async () => {
      await scannerReady();
      scanButton()?.click();
      httpMock.expectOne(SCAN_URL).flush(null, {status: 409, statusText: 'Conflict'});
      await settle();

      expect(errorText()).toBe(
        'Lo scanner è in uso, ad esempio da un altro dispositivo: il pulsante si riattiva appena si libera.'
      );
      await scannerReady();
    });

    it('waits for the scanner to be free when another device is scanning', async () => {
      await scannerReady();
      scanButton()?.click();
      httpMock.expectOne(SCAN_URL).flush(null, {status: 409, statusText: 'Conflict'});
      await settle();

      expect(scanButton()?.disabled).toBe(true);
      expect(spinner()).not.toBeNull();

      await scannerAnswers(false);
      await vi.advanceTimersByTimeAsync(retryDelay(1));
      await scannerReady();

      expect(scanButton()?.disabled).toBe(false);
      expect(spinner()).toBeNull();
    });

    it('tells the user when no scanner is configured', async () => {
      await scannerReady();
      scanButton()?.click();
      httpMock.expectOne(SCAN_URL).flush(null, {status: 503, statusText: 'Service Unavailable'});
      await settle();

      expect(errorText()).toBe('Nessuno scanner configurato.');
      httpMock.expectNone(STATUS_URL);
    });

    it('clears the previous error when scanning again', async () => {
      await scannerReady();
      scanButton()?.click();
      httpMock.expectOne(SCAN_URL).flush(null, {status: 502, statusText: 'Bad Gateway'});
      fixture.detectChanges();
      expect(errorText()).toBe('Scansione non riuscita, riprova.');

      scanButton()?.click();
      fixture.detectChanges();

      expect(errorText()).toBeUndefined();
      await completeScan();
    });
  });

  describe('Riepilogo step', () => {
    const photo = aPhoto();

    beforeEach(async () => {
      component.incassi.set([CASH, CHEQUE]);
      component.onSelectedFiles({originalEvent: new Event('change'), files: [photo], currentFiles: [photo]});
      await goTo(component.STEP_SUMMARY);
    });

    it('shows the incassi, read only', () => {
      const list = element().querySelector('app-incasso-list');

      expect(list?.textContent).toContain('Rossi S.r.l.');
      expect(list?.textContent).toContain('Bianchi S.p.A.');
      expect(buttonLabelled('Elimina incasso di Rossi S.r.l.')).toBeNull();
    });

    it('shows the totals for cash and cheques', () => {
      const totals = element().querySelector('[data-testid="totals-by-type"]')?.textContent;

      expect(totals).toContain(formatEuro(120.5));
      expect(totals).toContain(formatEuro(80));
    });

    it('shows how many images there are', () => {
      expect(element().textContent).toContain('1 immagini');
      expect(element().querySelectorAll('p-image')).toHaveLength(1);
    });

    it('sends the incassi with the images', () => {
      const sent: IncassiSubmission[] = [];
      component.submitIncassi.subscribe((submission) => sent.push(submission));

      button('submit-incassi')?.click();

      expect(sent).toEqual([{incassi: [CASH, CHEQUE], images: [photo]}]);
    });

    it('does not send twice while sending', async () => {
      fixture.componentRef.setInput('isSubmitting', true);
      await settle();
      const sent: IncassiSubmission[] = [];
      component.submitIncassi.subscribe((submission) => sent.push(submission));

      button('submit-incassi')?.click();

      expect(button('submit-incassi')?.disabled).toBe(true);
      expect(sent).toEqual([]);
    });

    it('shows why the round could not be sent', async () => {
      fixture.componentRef.setInput('submitError', 'Non è stato possibile generare i documenti.');
      await settle();

      expect(errorText()).toBe('Non è stato possibile generare i documenti.');
    });
  });
});
