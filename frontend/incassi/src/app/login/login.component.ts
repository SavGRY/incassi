import {CommonModule} from '@angular/common'
import {Component, type Signal, computed} from '@angular/core'
import {toSignal} from '@angular/core/rxjs-interop'
import {
  type AbstractControl,
  FormControl,
  type FormControlStatus,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms'
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  emailDomainValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value
    // get the domain from the email
    // the angular validator doesn't allow to use the email validator with a custom validator
    const domain: string = email.split('@')[1]
    // if the email is not valid, return the error
    if (!email) return null
    return domain ? null : {invalidDomain: true}
  }

  loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, this.emailDomainValidator.bind(this)]),
    password: new FormControl('', [Validators.required]),
  })

  isFormInvalid = computed((): boolean => this.loginForm.invalid)
  formStatusSignal: Signal<FormControlStatus> = toSignal(this.loginForm.statusChanges, {initialValue: 'INVALID'})
  isFormValid = computed((): boolean => this.formStatusSignal() === 'VALID')
  get lognFormElement(): string[] {
    return Object.keys(this.loginForm.controls)
  }

  getValue() {
    console.log(this.isFormValid())
  }

  onSubmit() {
    console.log(this.loginForm.value)
    this.loginForm.reset()
  }
}
