import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import type {Client} from '../../models/Client';
import {type IncassiSubmission, TipoPagamentoEnum} from '../../models/incasso';
import {CREATE_INCASSO_ERRORS} from '../../shared/utils';
import {IncassoForm} from './incasso-form/incasso-form';
import {NewIncassoPage} from './new-incasso';

const CREATE_URL = 'http://localhost:8000/api/v1/incasso/create';
const LIST_URL = 'http://localhost:8000/api/v1/client/list';

const ROSSI: Client = {code: 12, name: 'Rossi S.r.l.', address: null, city: 'Milano', province: 'MI'};

const ROUND: IncassiSubmission = {
  incassi: [{cliente: ROSSI, importo: 120.5, tipoPagamento: TipoPagamentoEnum.CONTANTI}],
  images: [new File(['jpeg'], 'ricevuta.jpg', {type: 'image/jpeg'})],
};

describe('NewIncassoPage', () => {
  let fixture: ComponentFixture<NewIncassoPage>;
  let page: NewIncassoPage;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const form = (): IncassoForm =>
    fixture.debugElement.query((element) => element.componentInstance instanceof IncassoForm).componentInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewIncassoPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(NewIncassoPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    // The form asks for the client catalogue as soon as it is built.
    httpMock.expectOne(LIST_URL).flush([ROSSI]);
  });

  afterEach(() => httpMock.verify());

  it('has nothing to lose while the form is empty', () => {
    expect(page.hasUnsavedData()).toBe(false);
  });

  it('has something to lose once an incasso is entered', () => {
    form().incassi.set(ROUND.incassi);

    expect(page.hasUnsavedData()).toBe(true);
  });

  it('sends the round and goes back home', async () => {
    form().incassi.set(ROUND.incassi);

    const sent = page.onSubmitIncassi(ROUND);
    expect(page.isSubmitting()).toBe(true);
    httpMock.expectOne(CREATE_URL).flush({message: 'ok'}, {status: 201, statusText: 'Created'});
    await sent;

    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(page.isSubmitting()).toBe(false);
    // Sent: leaving the page does not ask any more.
    expect(page.hasUnsavedData()).toBe(false);
  });

  it('stays with the data when the backend refuses the round', async () => {
    form().incassi.set(ROUND.incassi);

    const sent = page.onSubmitIncassi(ROUND);
    httpMock.expectOne(CREATE_URL).flush({detail: 'bad'}, {status: 413, statusText: 'Content Too Large'});
    await sent;

    expect(navigate).not.toHaveBeenCalled();
    expect(page.submitError()).toBe(CREATE_INCASSO_ERRORS[413]);
    expect(page.isSubmitting()).toBe(false);
    expect(page.hasUnsavedData()).toBe(true);
  });

  it('says to try again when the backend fails', async () => {
    const sent = page.onSubmitIncassi(ROUND);
    httpMock.expectOne(CREATE_URL).flush(null, {status: 500, statusText: 'Internal Server Error'});
    await sent;

    expect(page.submitError()).toBe('Non è stato possibile generare i documenti. Riprova.');
  });

  it('asks before leaving and follows the answer', async () => {
    const stay = page.confirmLeave();
    fixture.detectChanges();
    document.querySelector<HTMLButtonElement>('.p-confirmdialog-reject-button')?.click();
    await expect(stay).resolves.toBe(false);

    const leave = page.confirmLeave();
    fixture.detectChanges();
    document.querySelector<HTMLButtonElement>('.p-confirmdialog-accept-button')?.click();
    await expect(leave).resolves.toBe(true);
  });
});
