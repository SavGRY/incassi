import {CommonModule} from '@angular/common';
import {Component, type OnDestroy, type Signal, computed, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormControl,
  type FormControlStatus,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {Subscription} from 'rxjs';
import type {LoginResponse} from '../services/auth/Models';
import {AuthService} from '../services/auth/auth.service';
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnDestroy {
  private readonly router: Router = inject(Router);
  private readonly authService: AuthService = inject(AuthService);
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

  formStatusSignal: Signal<FormControlStatus> = toSignal(this.loginForm.statusChanges, {initialValue: 'INVALID'});
  isFormValid = computed((): boolean => this.formStatusSignal() === 'VALID');
  get loginFormElement(): string[] {
    return Object.keys(this.loginForm.controls);
  }

  getValue(): void {
    console.log(this.isFormValid());
  }

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
