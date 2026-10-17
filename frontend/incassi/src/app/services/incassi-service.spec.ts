import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import type {Client} from '../models/Client';
import {type NewIncasso, TipoPagamentoEnum} from '../models/incasso';
import {IncassiService} from './incassi-service';

const CREATE_URL = 'http://localhost:8000/api/v1/incasso/create';

const ROSSI: Client = {code: 12, name: 'Rossi S.r.l.', address: null, city: 'Milano', province: 'MI'};

const incasso = (importo: number, tipoPagamento: TipoPagamentoEnum): NewIncasso => ({
  cliente: ROSSI,
  importo,
  tipoPagamento,
});

describe('IncassiService', () => {
  let service: IncassiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IncassiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends the incassi as the payment list the backend expects', async () => {
    const sent = service.createIncasso(
      [incasso(120.5, TipoPagamentoEnum.CONTANTI), incasso(80, TipoPagamentoEnum.ASSEGNO)],
      []
    );

    const request = httpMock.expectOne(CREATE_URL);
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(JSON.parse(body.get('list_of_payment') as string)).toEqual({
      payment_list: [
        {client_code: 12, type_of_payment: 'cash', amount: 120.5},
        {client_code: 12, type_of_payment: 'check', amount: 80},
      ],
    });
    request.flush({message: 'ok'}, {status: 201, statusText: 'Created'});

    await expect(sent).resolves.toBeUndefined();
  });

  it('sends every image as its own part', async () => {
    const photo = new File(['a'], 'foto.jpg', {type: 'image/jpeg'});
    const scan = new File(['b'], 'scansione.jpg', {type: 'image/jpeg'});

    const sent = service.createIncasso([incasso(10, TipoPagamentoEnum.CONTANTI)], [photo, scan]);

    const request = httpMock.expectOne(CREATE_URL);
    expect((request.request.body as FormData).getAll('list_of_images')).toEqual([photo, scan]);
    request.flush({message: 'ok'}, {status: 201, statusText: 'Created'});
    await sent;
  });

  it('rejects when the backend refuses the incasso', async () => {
    const sent = service.createIncasso([incasso(10, TipoPagamentoEnum.CONTANTI)], []);

    httpMock.expectOne(CREATE_URL).flush({detail: 'bad'}, {status: 422, statusText: 'Unprocessable Content'});

    await expect(sent).rejects.toMatchObject({status: 422});
  });
});
