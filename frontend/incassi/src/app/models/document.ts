export type DocumentType = 'scan' | 'busta';

/** A generated document as `GET /incasso/list` returns it. */
export interface IncassiDocument {
  id: number;
  incasso_id: number;
  type_of_media: DocumentType;
  creation_date: string;
  payments_count: number;
  total: number;
}
