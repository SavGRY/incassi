import {ComponentFixture, TestBed} from '@angular/core/testing';

import {provideAnimations} from '@angular/platform-browser/animations';
import {BottomSheetComponent} from './bottom-sheet.component';

describe('BottomSheetComponent', () => {
  let component: BottomSheetComponent;
  let fixture: ComponentFixture<BottomSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomSheetComponent],
      providers: [provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', 'false');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
