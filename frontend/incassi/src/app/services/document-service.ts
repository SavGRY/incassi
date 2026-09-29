import {httpResource} from '@angular/common/http';
import {computed, Injectable, type Signal} from '@angular/core';
import type {IncassiDocument} from '../models/document';

@Injectable({providedIn: 'root'})
export class DocumentService {
  private readonly API_URL = 'http://localhost:8000/api/v1/incasso/list';

  /**
   * The user's documents, newest first, `limit` of them when given.
   *
   * Call it from a component field (it needs an injection context): every
   * page opening loads the documents again, the ones just created included.
   */
  getDocuments(limit?: number): Signal<IncassiDocument[]> {
    const response = httpResource<IncassiDocument[]>(() => ({url: this.API_URL, params: limit ? {limit} : undefined}), {
      defaultValue: [],
    });
    // After a failed load there is no value: the page just shows no documents.
    return computed(() => (response.hasValue() ? response.value() : []));
  }
}
