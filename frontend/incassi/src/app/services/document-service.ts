import {HttpClient, type HttpResourceRef, httpResource} from '@angular/common/http';
import {computed, Injectable, inject, type Signal} from '@angular/core';
import {map, type Observable} from 'rxjs';
import type {IncassiDocument} from '../models/document';
import {saveFile} from '../shared/utils';

@Injectable({providedIn: 'root'})
export class DocumentService {
  private readonly http = inject(HttpClient);

  private readonly API_URL = 'http://localhost:8000/api/v1/incasso';

  /**
   * The user's documents, newest first, `limit` of them when given.
   *
   * Call it from a component field (it needs an injection context): every
   * page opening loads the documents again, the ones just created included.
   */
  getDocuments(limit?: number): Signal<IncassiDocument[]> {
    const response = httpResource<IncassiDocument[]>(
      () => ({url: `${this.API_URL}/list`, params: limit ? {limit} : undefined}),
      {
        defaultValue: [],
      }
    );
    // After a failed load there is no value: the page just shows no documents.
    return computed(() => (response.hasValue() ? response.value() : []));
  }

  /**
   * The first page of the document `mediaId()` names, as a PNG.
   *
   * Call it from a component field: it needs an injection context.
   */
  getPreview(mediaId: () => number): HttpResourceRef<Blob | undefined> {
    return httpResource.blob(() => `${this.API_URL}/preview/${mediaId()}`);
  }

  /** Saves the PDF of `document` on the device. */
  download(document: IncassiDocument): Observable<void> {
    const name = document.type_of_media === 'scan' ? 'riepilogo' : 'busta';
    return this.http
      .get(`${this.API_URL}/download-incasso/${document.incasso_id}`, {
        params: {type_of_download: document.type_of_media},
        responseType: 'blob',
      })
      .pipe(map((pdf) => saveFile(pdf, `${name}_${document.incasso_id}.pdf`)));
  }
}
