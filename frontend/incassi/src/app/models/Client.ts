/** A client, shaped exactly as the backend stores and returns it. */
export interface Client {
  /** Primary key on the backend: the code the user types, not a surrogate id. */
  code: number;
  name: string;
  address: string | null;
  city: string;
  /** Two-letter italian province, always uppercase. */
  province: string;
}

/** Creating a client needs the same fields: the code is chosen by the user. */
export type NewClient = Client;

/** The envelope `POST /client/create` answers with. */
export interface ClientCreated {
  message: string;
  data: Client;
}
