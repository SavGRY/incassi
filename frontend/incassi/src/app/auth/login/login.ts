import {CommonModule} from '@angular/common';
import {Component, computed, inject, type OnDestroy, type Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormControl,
  type FormControlStatus,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import {Router} from '@angular/router';
import {ButtonDirective, ButtonIcon, ButtonLabel} from 'primeng/button';
import {InputText} from 'primeng/inputtext';
import {Subscription} from 'rxjs';
import type {LoginResponse} from '../../models/Auth';
import {Auth} from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, FormsModule, ButtonDirective, ButtonIcon, ButtonLabel, InputText],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnDestroy {
  private readonly router: Router = inject(Router);
  private readonly authService: Auth = inject(Auth);
  private subscription: Subscription = new Subscription();

  emailDomainValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    // get the domain from the email
    // the angular validator doesn't allow to use the email validator with a custom validator
    const domain: string = email.split('@')[1];
    // if the email is not valid, return the error
    if (!email) return null;
    return domain ? null : {invalidDomain: true};
  }

  loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [this.emailDomainValidator, Validators.required]),
    password: new FormControl('', [Validators.required]),
  });

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  formStatusSignal: Signal<FormControlStatus> = toSignal(this.loginForm.statusChanges, {initialValue: 'INVALID'});
  isFormValid = computed((): boolean => this.formStatusSignal() === 'VALID');

  onLogin(): void {
    this.subscription.add(
      this.authService.login(this.loginForm.value.email, this.loginForm.value.password).subscribe({
        next: (response: LoginResponse) => {
          localStorage.setItem('token', response.token);
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error(error);
        },
      })
    );
  }

  onSubmit(): void {
    this.onLogin();
    this.loginForm.reset();
  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
