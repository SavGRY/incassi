import {Component, ElementRef, input, viewChild} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Button} from '@openng/optimus-ui/button';
import type {Documento} from '../../models/documento';
import {DocumentCard} from '../document-card/document-card';

@Component({
  selector: 'app-recent-documents',
  imports: [DocumentCard, Button, RouterLink],
  templateUrl: './recent-documents.html',
})
export class RecentDocuments {
  documenti = input.required<Documento[]>();

  private carousel = viewChild.required<ElementRef<HTMLElement>>('carousel');

  scorriIndietro(): void {
    this.carousel().nativeElement.scrollBy({left: -160, behavior: 'smooth'});
  }

  scorriAvanti(): void {
    this.carousel().nativeElement.scrollBy({left: 160, behavior: 'smooth'});
  }
}
