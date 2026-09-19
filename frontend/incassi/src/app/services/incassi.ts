import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import type {NuovoIncasso} from '../models/incasso';

@Injectable({providedIn: 'root'})
export class Incassi {
  private readonly http = inject(HttpClient);
  // placeholder
  private readonly API_URL = 'http://localhost:8000/api/v1/incassi';

  crea(incasso: NuovoIncasso) {
    const corpo = new FormData();
    corpo.set('cliente', incasso.cliente.codice);
    corpo.set('importo', String(incasso.importo));
    corpo.set('tipoPagamento', incasso.tipoPagamento);
    corpo.set('immagine', incasso.immagine);

    return this.http.post(this.API_URL, corpo);
  }
}
