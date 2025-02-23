import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, UrlTree} from '@angular/router';
import {Router} from '@angular/router';
import {EMPTY} from 'rxjs';
import {LoginComponent} from './login.component';

const fakeActivatedRoute = {
  snapshot: {data: {}},
} as ActivatedRoute;

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  const mockRouter = {
    navigate: jasmine.createSpy('navigate'),
    events: EMPTY,
    createUrlTree: () => new UrlTree(),
    serializeUrl: () => '',
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        {provide: Router, useValue: mockRouter},
        {provide: ActivatedRoute, useValue: fakeActivatedRoute},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
