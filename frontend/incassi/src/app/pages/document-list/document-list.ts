import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ButtonDirective, ButtonIcon} from '@openng/optimus-ui/button';
import type {DocumentType} from '../../models/document';
import {IncassiDocument} from '../../models/document';
import {DocumentService} from '../../services/document-service';
import {DocumentListItem} from '../../shared/document-list-item/document-list-item';

type DocumentFilter = 'tutti' | DocumentType;

@Component({
  selector: 'app-documenti-list',
  imports: [DocumentListItem, RouterLink, ButtonDirective, ButtonIcon],
  templateUrl: './document-list.html',
})
export class DocumentList {
  private readonly documentService = inject(DocumentService);

  filter = signal<DocumentFilter>('tutti');

  filteredDocuments = computed(() => {
    const documents: IncassiDocument[] = this.documentService.documents();
    return this.filter() === 'tutti' ? documents : documents.filter((el) => el.tipo === this.filter());
  });

  setFilter(filtro: DocumentFilter): void {
    this.filter.set(filtro);
  }
}
