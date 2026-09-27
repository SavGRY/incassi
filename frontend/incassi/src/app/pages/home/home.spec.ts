import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {IncassoForm} from '../../shared/incasso-form/incasso-form';
import {Home} from './home';

const STATUS_URL = 'http://localhost:8000/api/v1/scanner/status';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let httpMock: HttpTestingController;

  const incassoForm = () => fixture.debugElement.query((element) => element.componentInstance instanceof IncassoForm);

  const render = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Home);
    await render();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not look for the scanner while the incasso drawer is closed', () => {
    expect(incassoForm()).toBeNull();
    httpMock.expectNone(STATUS_URL);
  });

  it('looks for the scanner when the incasso drawer opens', async () => {
    fixture.componentInstance.isIncassoDrawerOpen.set(true);
    await render();

    expect(incassoForm()).not.toBeNull();
    httpMock.expectOne(STATUS_URL).flush({info: 'EPSON ET-4850 Series', scanner_status: 'Idle'});
  });

  it('stops looking for the scanner when the incasso drawer closes', async () => {
    fixture.componentInstance.isIncassoDrawerOpen.set(true);
    await render();
    httpMock.expectOne(STATUS_URL).flush({info: 'EPSON ET-4850 Series', scanner_status: 'Processing'});

    fixture.componentInstance.isIncassoDrawerOpen.set(false);
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(160000);

    expect(incassoForm()).toBeNull();
    httpMock.expectNone(STATUS_URL);
  });
});
