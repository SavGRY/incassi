import {CurrencyPipe, DatePipe} from '@angular/common';
import {Component, computed, input} from '@angular/core';
import {Tag} from '@openng/optimus-ui/tag';
import type {IncassiDocument} from '../../models/document';
import {DocumentThumbnail} from '../document-thumbnail/document-thumbnail';
import {DOCUMENT_TAGS} from '../utils';

@Component({
  selector: 'app-document-list-item',
  imports: [DocumentThumbnail, DatePipe, CurrencyPipe, Tag],
  templateUrl: './document-list-item.html',
})
export class DocumentListItem {
  document = input.required<IncassiDocument>();

  tag = computed(() => DOCUMENT_TAGS[this.document().type_of_media]);
}
