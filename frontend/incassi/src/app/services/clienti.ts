import {HttpClient, httpResource} from '@angular/common/http';
import {computed, Injectable, inject, signal} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import type {Cliente, ClienteCreato, NuovoCliente} from '../models/cliente';

@Injectable({providedIn: 'root'})
export class Clienti {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1/client';

  /**
   * Flipped by the first consumer that needs the catalogue. Until then the
   * request stays `undefined` and the resource never calls the API.
   */
  private readonly askingClient = signal(false);

  private readonly catalogo = httpResource<Cliente[]>(
    () => (this.askingClient() ? `${this.API_URL}/list` : undefined),
    {
      defaultValue: [],
    }
  );

  /**
   * Reading `catalogo.value()` throws while the resource is in an error state,
   * which would take the whole template down with it. A failed load just means
   * there is nothing to suggest yet.
   */
  readonly clienti = computed<Cliente[]>(() => (this.catalogo.error() ? [] : this.catalogo.value()));

  /**
   * Asks for the catalogue. The signal only ever goes from `false` to `true`,
   * so the API is called once however many times this is called.
   */
  askForClient(): void {
    this.askingClient.set(true);
  }

  async crea(cliente: NuovoCliente): Promise<Cliente> {
    const corpo = new FormData();
    corpo.set('code', String(cliente.code));
    corpo.set('name', cliente.name);
    corpo.set('address', cliente.address ?? '');
    corpo.set('city', cliente.city);
    corpo.set('province', cliente.province);

    const risposta = await firstValueFrom(this.http.post<ClienteCreato>(`${this.API_URL}/create`, corpo));
    this.catalogo.set([...this.clienti(), risposta.data]);
    return risposta.data;
  }

  cerca(query: string): Cliente[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.clienti().filter(
      (cliente) => cliente.name.toLowerCase().includes(q) || String(cliente.code).includes(q)
    );
  }
}
