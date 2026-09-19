export type TipoDocumento = 'a4' | 'busta';

export interface Documento {
  id: string;
  nome: string;
  data: Date;
  tipo: TipoDocumento;
  dettaglio: string;
}
