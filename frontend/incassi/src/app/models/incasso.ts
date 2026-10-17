import {Client} from './Client';

export enum TipoPagamentoEnum {
  CONTANTI = 'contanti',
  ASSEGNO = 'assegno',
}

export type TipoPagamento = TipoPagamentoEnum.CONTANTI | TipoPagamentoEnum.ASSEGNO;

export interface NewIncasso {
  cliente: Client;
  importo: number;
  tipoPagamento: TipoPagamento;
}

/** What a round is made of: the incassi, and the images that prove them. */
export interface IncassiSubmission {
  incassi: NewIncasso[];
  images: File[];
}
