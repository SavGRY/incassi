import type {Cliente} from './cliente';

export type TipoPagamento = 'contanti' | 'assegno';

export interface NuovoIncasso {
  cliente: Cliente;
  importo: number;
  tipoPagamento: TipoPagamento;
  immagine: File;
}
