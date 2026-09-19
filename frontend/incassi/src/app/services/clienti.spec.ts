import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import type {Cliente} from '../models/cliente';
import {Clienti} from './clienti';

const API_URL = 'http://localhost:8000/api/v1/client';

const bianchi: Cliente = {
  code: 142,
  name: 'Bianchi S.p.A.',
  address: 'Via Roma 1',
  city: 'Milano',
  province: 'MI',
};

const verdi: Cliente = {
  code: 98,
  name: 'Verdi Logistica Srl',
  address: null,
  city: 'Torino',
  province: 'TO',
};

describe('Clienti', () => {
  let service: Clienti;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Clienti);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts with no client', () => {
    expect(service.clienti()).toEqual([]);
  });

  it('fills the signal with the clients loaded from the API', () => {
    service.carica().subscribe();

    const richiesta = httpMock.expectOne(`${API_URL}/list`);
    expect(richiesta.request.method).toBe('GET');
    richiesta.flush([bianchi, verdi]);

    expect(service.clienti()).toEqual([bianchi, verdi]);
  });

  it('leaves the signal empty when the catalogue is empty', () => {
    service.carica().subscribe();
    httpMock.expectOne(`${API_URL}/list`).flush([]);

    expect(service.clienti()).toEqual([]);
  });

  it('posts a new client as form data', () => {
    service.crea(bianchi).subscribe();

    const richiesta = httpMock.expectOne(`${API_URL}/create`);
    expect(richiesta.request.method).toBe('POST');

    const corpo = richiesta.request.body as FormData;
    expect(corpo.get('code')).toBe('142');
    expect(corpo.get('name')).toBe('Bianchi S.p.A.');
    expect(corpo.get('address')).toBe('Via Roma 1');
    expect(corpo.get('city')).toBe('Milano');
    expect(corpo.get('province')).toBe('MI');

    richiesta.flush({message: 'Client successfully created', data: bianchi});
  });

  it('sends an empty address when there is none', () => {
    service.crea(verdi).subscribe();

    const richiesta = httpMock.expectOne(`${API_URL}/create`);
    expect((richiesta.request.body as FormData).get('address')).toBe('');

    richiesta.flush({message: 'Client successfully created', data: verdi});
  });

  it('adds the created client to the signal', () => {
    service.crea(bianchi).subscribe();
    httpMock.expectOne(`${API_URL}/create`).flush({message: 'Client successfully created', data: bianchi});

    expect(service.clienti()).toEqual([bianchi]);
  });

  it('does not touch the signal when the creation fails', () => {
    service.crea(bianchi).subscribe({error: () => undefined});
    httpMock
      .expectOne(`${API_URL}/create`)
      .flush({detail: 'Client with code 142 already exists'}, {status: 409, statusText: 'Conflict'});

    expect(service.clienti()).toEqual([]);
  });

  it('finds a client by name or by code, ignoring the case', () => {
    service.carica().subscribe();
    httpMock.expectOne(`${API_URL}/list`).flush([bianchi, verdi]);

    expect(service.cerca('bianchi')).toEqual([bianchi]);
    expect(service.cerca('98')).toEqual([verdi]);
    expect(service.cerca('  ')).toEqual([]);
  });
});
