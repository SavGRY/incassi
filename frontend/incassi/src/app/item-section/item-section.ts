import {LowerCasePipe, NgStyle} from '@angular/common';
import {Component, input} from '@angular/core';
import {Button} from 'primeng/button';
import {Carousel} from 'primeng/carousel';
import {Tag} from 'primeng/tag';

@Component({
  selector: 'app-item-section',
  imports: [Carousel, Tag, Button, NgStyle, LowerCasePipe],
  templateUrl: './item-section.html',
  styleUrl: './item-section.scss',
})
export class ItemSection {
  title = input('');
  products = [
    {
      name: 'p1',
      inventoryStatus: 'ok',
      price: 100,
    },
    {
      name: 'p2',
      inventoryStatus: 'ok',
      price: 100,
    },
  ];
}
