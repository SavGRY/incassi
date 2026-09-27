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

  it('builds the incasso form when the drawer opens, without asking for the scanner yet', async () => {
    fixture.componentInstance.isIncassoDrawerOpen.set(true);
    await render();

    expect(incassoForm()).not.toBeNull();
    // The form only looks for the scanner on its images step.
    httpMock.expectNone(STATUS_URL);
  });

  it('destroys the incasso form when the drawer closes', async () => {
    fixture.componentInstance.isIncassoDrawerOpen.set(true);
    await render();

    fixture.componentInstance.isIncassoDrawerOpen.set(false);
    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();

    expect(incassoForm()).toBeNull();
  });
});
