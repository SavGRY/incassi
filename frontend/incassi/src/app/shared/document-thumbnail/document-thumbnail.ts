import {Component, computed, input} from '@angular/core';
import {Tag} from '@openng/optimus-ui/tag';
import type {DocumentType} from '../../models/document';
import {DOCUMENT_TAGS} from '../utils';

const IMMAGINI: Record<DocumentType, string> = {
  scan: 'assets/documents/riepilogo-a4.png',
  busta: 'assets/documents/busta.png',
};

@Component({
  selector: 'app-document-thumbnail',
  imports: [Tag],
  templateUrl: './document-thumbnail.html',
})
export class DocumentThumbnail {
  tipo = input.required<DocumentType>();
  showBadge = input(true);

  immagine = computed(() => IMMAGINI[this.tipo()]);
  tag = computed(() => DOCUMENT_TAGS[this.tipo()]);
}
