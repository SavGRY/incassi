import {Component, computed, input} from '@angular/core';
import {Tag} from '@openng/optimus-ui/tag';
import type {TipoDocumento} from '../../models/documento';

const IMMAGINI: Record<TipoDocumento, string> = {
  a4: 'assets/documents/riepilogo-a4.png',
  busta: 'assets/documents/busta.png',
};

@Component({
  selector: 'app-document-thumbnail',
  imports: [Tag],
  templateUrl: './document-thumbnail.html',
})
export class DocumentThumbnail {
  tipo = input.required<TipoDocumento>();
  showBadge = input(true);

  immagine = computed(() => IMMAGINI[this.tipo()]);
}
