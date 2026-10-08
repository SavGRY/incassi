import {CurrencyPipe, DatePipe} from '@angular/common';
import {Component, computed, inject, input} from '@angular/core';
import {Button} from '@openng/optimus-ui/button';
import {Tag} from '@openng/optimus-ui/tag';
import type {IncassiDocument} from '../../models/document';
import {DocumentService} from '../../services/document-service';
import {DocumentThumbnail} from '../document-thumbnail/document-thumbnail';
import {DOCUMENT_TAGS} from '../utils';

@Component({
  selector: 'app-document-list-item',
  imports: [DocumentThumbnail, Button, DatePipe, CurrencyPipe, Tag],
  templateUrl: './document-list-item.html',
})
export class DocumentListItem {
  private readonly documentService = inject(DocumentService);

  document = input.required<IncassiDocument>();

  tag = computed(() => DOCUMENT_TAGS[this.document().type_of_media]);

  onDownload(): void {
    this.documentService.download(this.document()).subscribe();
  }
}
