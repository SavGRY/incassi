import {DatePipe} from '@angular/common';
import {Component, input} from '@angular/core';
import {IncassiDocument} from '../../models/document';
import {DocumentThumbnail} from '../document-thumbnail/document-thumbnail';

@Component({
  selector: 'app-document-card',
  imports: [DocumentThumbnail, DatePipe],
  templateUrl: './document-card.html',
})
export class DocumentCard {
  document = input.required<IncassiDocument>();
}
