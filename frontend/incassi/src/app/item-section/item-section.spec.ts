import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ItemSection} from './item-section';

describe('ItemSection', () => {
  let component: ItemSection;
  let fixture: ComponentFixture<ItemSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemSection],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemSection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
