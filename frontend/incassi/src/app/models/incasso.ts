import {Client} from './Client';

export type TipoPagamento = 'contanti' | 'assegno';

export interface NewIncasso {
  cliente: Client;
  importo: number;
  tipoPagamento: TipoPagamento;
  immagine: File;
}
