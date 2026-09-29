import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DocumentThumbnail} from './document-thumbnail';

const PREVIEW_URL = 'http://localhost:8000/api/v1/incasso/preview/8';

describe('DocumentThumbnail', () => {
  let httpMock: HttpTestingController;

  // Waiting for stability would wait for the request too: only start it.
  const create = () => {
    const fixture = TestBed.createComponent(DocumentThumbnail);
    fixture.componentRef.setInput('mediaId', 8);
    fixture.componentRef.setInput('tipo', 'scan');
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    httpMock = TestBed.inject(HttpTestingController);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('shows the preview the backend renders', async () => {
    const fixture = create();

    httpMock.expectOne(PREVIEW_URL).flush(new Blob(['png'], {type: 'image/png'}));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('blob:preview');
  });

  it('shows a file icon when there is no preview', async () => {
    const fixture = create();

    httpMock.expectOne(PREVIEW_URL).flush(new Blob(), {status: 404, statusText: 'Not Found'});
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pi-file')).not.toBeNull();
  });

  it('frees the preview once gone', async () => {
    const fixture = create();
    httpMock.expectOne(PREVIEW_URL).flush(new Blob(['png'], {type: 'image/png'}));
    await fixture.whenStable();

    fixture.destroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
});
