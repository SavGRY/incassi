import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {type NewIncasso, type TipoPagamento, TipoPagamentoEnum} from '../models/incasso';

@Injectable({providedIn: 'root'})
export class IncassiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1/incasso';

  /** The backend names the payment types in English. */
  private readonly PAYMENT_TYPES: Record<TipoPagamento, string> = {
    [TipoPagamentoEnum.CONTANTI]: 'cash',
    [TipoPagamentoEnum.ASSEGNO]: 'check',
  };

  /**
   * Sends the incassi of a round with their images, in one request: the
   * backend turns them into the envelope and the A4 summary.
   */
  async createIncasso(incassi: NewIncasso[], images: File[]): Promise<void> {
    const formBody = new FormData();
    formBody.set(
      'list_of_payment',
      JSON.stringify({
        payment_list: incassi.map((incasso) => ({
          client_code: incasso.cliente.code,
          type_of_payment: this.PAYMENT_TYPES[incasso.tipoPagamento],
          amount: incasso.importo,
        })),
      })
    );
    for (const image of images) formBody.append('list_of_images', image);

    await firstValueFrom(this.http.post(`${this.API_URL}/create`, formBody));
  }
}
