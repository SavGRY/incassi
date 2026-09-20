import {Component, ElementRef, input, viewChild} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Button} from '@openng/optimus-ui/button';
import type {IncassiDocument} from '../../models/document';
import {DocumentCard} from '../document-card/document-card';

@Component({
  selector: 'app-recent-documents',
  imports: [DocumentCard, Button, RouterLink],
  templateUrl: './recent-documents.html',
})
export class RecentDocuments {
  documents = input.required<IncassiDocument[]>();

  private carousel = viewChild.required<ElementRef<HTMLElement>>('carousel');

  scrollBack(): void {
    this.carousel().nativeElement.scrollBy({left: -160, behavior: 'smooth'});
  }

  scrollForward(): void {
    this.carousel().nativeElement.scrollBy({left: 160, behavior: 'smooth'});
  }
}
