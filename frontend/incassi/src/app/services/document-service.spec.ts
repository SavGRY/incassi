import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ApplicationRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import type {IncassiDocument} from '../models/document';
import {DocumentService} from './document-service';

const LIST_URL = 'http://localhost:8000/api/v1/incasso/list';

const SCAN: IncassiDocument = {
  id: 8,
  incasso_id: 3,
  type_of_media: 'scan',
  creation_date: '2026-09-29T10:15:00',
  payments_count: 2,
  total: 200.5,
};
const BUSTA: IncassiDocument = {...SCAN, id: 7, type_of_media: 'busta', payments_count: 1, total: 80};

describe('DocumentService', () => {
  let httpMock: HttpTestingController;

  const load = (limit?: number) =>
    TestBed.runInInjectionContext(() => TestBed.inject(DocumentService).getDocuments(limit));
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('asks for the latest documents', async () => {
    const documents = load(10);
    TestBed.tick();

    httpMock.expectOne(`${LIST_URL}?limit=10`).flush([SCAN, BUSTA]);

    await settle();
    expect(documents()).toEqual([SCAN, BUSTA]);
  });

  it('asks for every document without a limit', async () => {
    const documents = load();
    TestBed.tick();

    httpMock.expectOne(LIST_URL).flush([]);

    await settle();
    expect(documents()).toEqual([]);
  });

  it('shows no documents when the load fails', async () => {
    const documents = load();
    TestBed.tick();

    httpMock.expectOne(LIST_URL).flush({detail: 'boom'}, {status: 500, statusText: 'Server Error'});

    await settle();
    expect(documents()).toEqual([]);
  });

  it('saves the PDF of a document', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    TestBed.inject(DocumentService).download(BUSTA).subscribe();
    httpMock
      .expectOne('http://localhost:8000/api/v1/incasso/download-incasso/3?type_of_download=busta')
      .flush(new Blob(['pdf'], {type: 'application/pdf'}));

    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('busta_3.pdf');
    expect(link.href).toBe('blob:pdf');
    vi.restoreAllMocks();
  });
});
