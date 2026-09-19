import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ButtonDirective, ButtonIcon} from '@openng/optimus-ui/button';
import type {TipoDocumento} from '../../models/documento';
import {Documenti} from '../../services/documenti';
import {DocumentListItem} from '../../shared/document-list-item/document-list-item';

type Filtro = 'tutti' | TipoDocumento;

@Component({
  selector: 'app-documenti-list',
  imports: [DocumentListItem, RouterLink, ButtonDirective, ButtonIcon],
  templateUrl: './documenti-list.html',
})
export class DocumentiList {
  private readonly documentiService = inject(Documenti);

  filtro = signal<Filtro>('tutti');

  documentiFiltrati = computed(() => {
    const filtro = this.filtro();
    const documenti = this.documentiService.documenti();
    return filtro === 'tutti' ? documenti : documenti.filter((documento) => documento.tipo === filtro);
  });

  impostaFiltro(filtro: Filtro): void {
    this.filtro.set(filtro);
  }
}
