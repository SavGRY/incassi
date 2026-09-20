import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {NewIncasso} from '../models/incasso';

@Injectable({providedIn: 'root'})
export class IncassiService {
  private readonly http = inject(HttpClient);
  // placeholder
  private readonly API_URL = 'http://localhost:8000/api/v1/incassi';

  createIncasso(incasso: NewIncasso) {
    console.error('not implemented yet');
  }
}
