import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {retryDelay, SCANNER_RECHECK_INTERVAL_MS} from '../utils';
import {IncassoForm} from './incasso-form';

const SCAN_URL = 'http://localhost:8000/api/v1/scanner/scan';
const STATUS_URL = 'http://localhost:8000/api/v1/scanner/status';
const MODEL = 'EPSON ET-4850 Series';

describe('IncassoForm', () => {
  let fixture: ComponentFixture<IncassoForm>;
  let component: IncassoForm;
  let httpMock: HttpTestingController;

  const scanButton = (): HTMLButtonElement | null => fixture.nativeElement.querySelector('#scan-button button');

  const spinner = (): Element | null | undefined => scanButton()?.querySelector('.p-button-loading-icon');

  const scannerIcon = (): Element | null | undefined => scanButton()?.querySelector('.fa-scanner-image');

  const errorText = (): string | undefined =>
    (fixture.nativeElement as HTMLElement).querySelector('p-message[severity="error"]')?.textContent?.trim();

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

  /** Makes the scanner say it is ready, like right after the form opens. */
  const scannerReady = (): Promise<void> => scannerAnswers(true);

  /** Lets a scan go through. */
  const completeScan = async (): Promise<void> => {
    httpMock.expectOne(SCAN_URL).flush(new Blob(['jpeg'], {type: 'image/jpeg'}));
    await settle();
  };

  beforeEach(async () => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
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

  it('uses the scanned sheet as the incasso image', async () => {
    await scannerReady();
    scanButton()?.click();

    const request = httpMock.expectOne(SCAN_URL);
    expect(request.request.method).toBe('POST');
    request.flush(new Blob(['jpeg'], {type: 'image/jpeg'}));
    fixture.detectChanges();

    const image = component.uploadedImage();
    expect(image).toBeInstanceOf(File);
    expect(image?.type).toBe('image/jpeg');
    expect(component.isScanning()).toBe(false);
    expect(errorText()).toBeUndefined();
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
    expect(component.uploadedImage()).toBeNull();
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

  it('lets the user remove the chosen image', async () => {
    await scannerReady();
    const clearButton = (): HTMLButtonElement | null =>
      fixture.nativeElement.querySelector('button[title="Cancella Immagine"]');
    expect(clearButton()).toBeNull();

    component.uploadedImage.set(new File(['jpeg'], 'ricevuta.jpg', {type: 'image/jpeg'}));
    fixture.detectChanges();
    clearButton()?.click();
    fixture.detectChanges();

    expect(component.uploadedImage()).toBeNull();
    expect(clearButton()).toBeNull();
  });
});
