import {DatePipe} from '@angular/common';
import {Component, input} from '@angular/core';
import type {Documento} from '../../models/documento';
import {DocumentThumbnail} from '../document-thumbnail/document-thumbnail';

@Component({
  selector: 'app-document-card',
  imports: [DocumentThumbnail, DatePipe],
  templateUrl: './document-card.html',
})
export class DocumentCard {
  documento = input.required<Documento>();
}
