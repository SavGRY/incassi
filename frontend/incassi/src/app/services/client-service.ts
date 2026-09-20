import {HttpClient, httpResource} from '@angular/common/http';
import {computed, Injectable, inject, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {Client, ClientCreated, NewClient} from '../models/Client';

@Injectable({providedIn: 'root'})
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1/client';

  /**
   * Flipped by the first consumer that needs the catalogue. Until then the
   * request stays `undefined` and the resource never calls the API.
   */
  private readonly askingClient = signal(false);

  private readonly clientList = httpResource<Client[]>(
    () => (this.askingClient() ? `${this.API_URL}/list` : undefined),
    {
      defaultValue: [],
    }
  );

  /**
   * Reading `clientList.value()` throws while the resource is in an error state,
   * which would take the whole template down with it. A failed load just means
   * there is nothing to suggest yet.
   */
  readonly clientResponse = computed<Client[]>(() => (this.clientList.error() ? [] : this.clientList.value()));

  /**
   * Asks for the catalogue. The signal only ever goes from `false` to `true`,
   * so the API is called once however many times this is called.
   */
  askForClient(): void {
    this.askingClient.set(true);
  }

  async createNewClient(client: NewClient): Promise<Client> {
    const formBody = new FormData();
    formBody.set('code', String(client.code));
    formBody.set('name', client.name);
    formBody.set('address', client.address ?? '');
    formBody.set('city', client.city);
    formBody.set('province', client.province);

    const resp = await firstValueFrom(this.http.post<ClientCreated>(`${this.API_URL}/create`, formBody));
    this.clientList.set([...this.clientResponse(), resp.data]);
    return resp.data;
  }

  search(query: string): Client[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.clientResponse().filter(
      (client) => client.name.toLowerCase().includes(q) || String(client.code).includes(q)
    );
  }
}
