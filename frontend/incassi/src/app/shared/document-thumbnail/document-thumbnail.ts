import {Component, computed, effect, inject, input} from '@angular/core';
import {Image} from '@openng/optimus-ui/image';
import {Tag} from '@openng/optimus-ui/tag';
import type {DocumentType} from '../../models/document';
import {DocumentService} from '../../services/document-service';
import {DOCUMENT_TAGS} from '../utils';

@Component({
  selector: 'app-document-thumbnail',
  imports: [Tag, Image],
  templateUrl: './document-thumbnail.html',
})
export class DocumentThumbnail {
  private readonly documentService = inject(DocumentService);

  mediaId = input.required<number>();
  tipo = input.required<DocumentType>();
  showBadge = input(true);

  private readonly preview = this.documentService.getPreview(() => this.mediaId());

  /** `null` while the preview loads, or when the backend has none. */
  previewUrl = computed(() => (this.preview.hasValue() ? URL.createObjectURL(this.preview.value()) : null));
  tag = computed(() => DOCUMENT_TAGS[this.tipo()]);

  constructor() {
    // Frees the previous URL when the preview changes, and the last one on destroy.
    effect((onCleanup) => {
      const url = this.previewUrl();
      if (url) onCleanup(() => URL.revokeObjectURL(url));
    });
  }
}
