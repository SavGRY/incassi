import {HttpClient} from '@angular/common/http';
import {Injectable, inject, signal} from '@angular/core';
import {map, type Observable, tap} from 'rxjs';
import type {Cliente, ClienteCreato, NuovoCliente} from '../models/cliente';

@Injectable({providedIn: 'root'})
export class Clienti {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1/client';

  private readonly elenco = signal<Cliente[]>([]);

  /** The catalogue, kept in memory so the autocomplete can search it offline. */
  readonly clienti = this.elenco.asReadonly();

  carica(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.API_URL}/list`).pipe(tap((clienti) => this.elenco.set(clienti)));
  }

  crea(cliente: NuovoCliente): Observable<Cliente> {
    // The endpoint reads a form, not JSON: `Annotated[ClientFromForm, Form()]`.
    const corpo = new FormData();
    corpo.set('code', String(cliente.code));
    corpo.set('name', cliente.name);
    corpo.set('address', cliente.address ?? '');
    corpo.set('city', cliente.city);
    corpo.set('province', cliente.province);

    return this.http.post<ClienteCreato>(`${this.API_URL}/create`, corpo).pipe(
      map((risposta) => risposta.data),
      tap((creato) => this.elenco.update((clienti) => [...clienti, creato]))
    );
  }

  cerca(query: string): Cliente[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.elenco().filter(
      (cliente) => cliente.name.toLowerCase().includes(q) || String(cliente.code).includes(q)
    );
  }
}
