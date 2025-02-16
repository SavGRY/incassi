import {type ComponentFixture, TestBed} from '@angular/core/testing'

import {provideHttpClient} from '@angular/common/http'
import {provideHttpClientTesting} from '@angular/common/http/testing'
import {LoginComponent} from './login.component'

describe('LoginComponent', () => {
  let component: LoginComponent
  let fixture: ComponentFixture<LoginComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClientTesting(), provideHttpClient()],
    }).compileComponents()

    fixture = TestBed.createComponent(LoginComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
