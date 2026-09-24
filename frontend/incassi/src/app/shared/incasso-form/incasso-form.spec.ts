import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {IncassoForm} from './incasso-form';

const SCAN_URL = 'http://localhost:8000/api/v1/scanner/scan';

describe('IncassoForm', () => {
  let fixture: ComponentFixture<IncassoForm>;
  let component: IncassoForm;
  let httpMock: HttpTestingController;

  const scanButton = (): HTMLButtonElement | null =>
    fixture.nativeElement.querySelector('button[aria-label="Scansiona con la stampante"]');

  const errorText = (): string | undefined =>
    (fixture.nativeElement as HTMLElement).querySelector('p-message')?.textContent?.trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncassoForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IncassoForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('offers to scan the receipt with the printer', () => {
    expect(scanButton()).not.toBeNull();
  });

  it('uses the scanned sheet as the incasso image', () => {
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

  it('does not start a second scan while one is running', () => {
    scanButton()?.click();
    fixture.detectChanges();

    expect(component.isScanning()).toBe(true);
    expect(scanButton()?.disabled).toBe(true);

    scanButton()?.click();
    httpMock.expectOne(SCAN_URL).flush(new Blob(['jpeg'], {type: 'image/jpeg'}));
  });

  it('tells the user when the scanner cannot be reached', () => {
    scanButton()?.click();
    httpMock.expectOne(SCAN_URL).flush(null, {status: 504, statusText: 'Gateway Timeout'});
    fixture.detectChanges();

    expect(errorText()).toBe('Lo scanner non è raggiungibile: controlla che la stampante sia accesa.');
    expect(component.uploadedImage()).toBeNull();
    expect(component.isScanning()).toBe(false);
  });

  it('tells the user when the scanner is busy', () => {
    scanButton()?.click();
    httpMock.expectOne(SCAN_URL).flush(null, {status: 503, statusText: 'Service Unavailable'});
    fixture.detectChanges();

    expect(errorText()).toBe('Lo scanner è occupato o non configurato, riprova tra poco.');
  });

  it('clears the previous error when scanning again', () => {
    scanButton()?.click();
    httpMock.expectOne(SCAN_URL).flush(null, {status: 502, statusText: 'Bad Gateway'});
    fixture.detectChanges();
    expect(errorText()).toBe('Scansione non riuscita, riprova.');

    scanButton()?.click();
    fixture.detectChanges();

    expect(errorText()).toBeUndefined();
    httpMock.expectOne(SCAN_URL).flush(new Blob(['jpeg'], {type: 'image/jpeg'}));
  });
});
