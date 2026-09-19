import {Injectable, signal} from '@angular/core';
import type {Cliente} from '../models/cliente';

@Injectable({providedIn: 'root'})
export class Clienti {
  readonly clienti = signal<Cliente[]>([
    {codice: 'CL-0142', ragioneSociale: 'Bianchi S.p.A.'},
    {codice: 'CL-0098', ragioneSociale: 'Verdi Logistica Srl'},
    {codice: 'CL-0210', ragioneSociale: 'Colombo Import Export'},
    {codice: 'CL-0067', ragioneSociale: 'Ferrari Distribuzione'},
    {codice: 'CL-0153', ragioneSociale: 'Ricci & Figli'},
  ]);

  cerca(query: string): Cliente[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.clienti().filter(
      (cliente) => cliente.ragioneSociale.toLowerCase().includes(q) || cliente.codice.toLowerCase().includes(q)
    );
  }
}
