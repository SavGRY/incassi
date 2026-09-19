import {DatePipe} from '@angular/common';
import {Component, input} from '@angular/core';
import {Tag} from '@openng/optimus-ui/tag';
import type {Documento} from '../../models/documento';
import {DocumentThumbnail} from '../document-thumbnail/document-thumbnail';

@Component({
  selector: 'app-document-list-item',
  imports: [DocumentThumbnail, DatePipe, Tag],
  templateUrl: './document-list-item.html',
})
export class DocumentListItem {
  documento = input.required<Documento>();
}
