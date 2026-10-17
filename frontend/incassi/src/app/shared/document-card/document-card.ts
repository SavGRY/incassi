import {DatePipe} from '@angular/common';
import {Component, inject, input} from '@angular/core';
import {Button} from '@openng/optimus-ui/button';
import type {IncassiDocument} from '../../models/document';
import {DocumentService} from '../../services/document-service';
import {DocumentThumbnail} from '../document-thumbnail/document-thumbnail';

@Component({
  selector: 'app-document-card',
  imports: [DocumentThumbnail, Button, DatePipe],
  templateUrl: './document-card.html',
})
export class DocumentCard {
  private readonly documentService = inject(DocumentService);

  document = input.required<IncassiDocument>();

  onDownload(): void {
    this.documentService.download(this.document()).subscribe();
  }
}
