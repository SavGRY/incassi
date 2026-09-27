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
