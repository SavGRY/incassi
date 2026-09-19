import {Injectable, signal} from '@angular/core';
import type {Documento} from '../models/documento';

@Injectable({providedIn: 'root'})
export class Documenti {
  readonly documenti = signal<Documento[]>([
    {id: '1', nome: 'Riepilogo Giro 12', data: new Date('2026-09-15'), tipo: 'a4', dettaglio: '3 assegni, 4 ricevute'},
    {id: '2', nome: 'Busta Bianchi S.p.A.', data: new Date('2026-09-15'), tipo: 'busta', dettaglio: '€ 640,00'},
    {id: '3', nome: 'Riepilogo Giro 11', data: new Date('2026-09-12'), tipo: 'a4', dettaglio: '2 assegni, 3 ricevute'},
    {id: '4', nome: 'Busta Verdi Logistica', data: new Date('2026-09-10'), tipo: 'busta', dettaglio: '€ 380,00'},
    {id: '5', nome: 'Busta Colombo Import', data: new Date('2026-09-09'), tipo: 'busta', dettaglio: '€ 220,00'},
    {id: '6', nome: 'Riepilogo Giro 10', data: new Date('2026-09-08'), tipo: 'a4', dettaglio: '1 assegno, 2 ricevute'},
  ]);
}
