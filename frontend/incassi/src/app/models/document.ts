export type DocumentType = 'a4' | 'busta';

export interface IncassiDocument {
  id: string;
  nome: string;
  data: Date;
  tipo: DocumentType;
  dettaglio: string;
}
