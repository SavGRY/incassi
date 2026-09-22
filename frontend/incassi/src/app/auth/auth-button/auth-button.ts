import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Button} from '@openng/optimus-ui/button';
import {Dialog} from '@openng/optimus-ui/dialog';
import {Auth} from '../../services/auth';

@Component({
  selector: 'app-auth-button',
  imports: [Button, Dialog],
  templateUrl: './auth-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthButton {
  private readonly router: Router = inject(Router);
  private readonly authService: Auth = inject(Auth);

  readonly isLoggedIn = this.authService.isLoggedIn;
  isConfirmingLogout = signal<boolean>(false);

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  askForConfirmation(): void {
    this.isConfirmingLogout.set(true);
  }

  cancelLogout(): void {
    this.isConfirmingLogout.set(false);
  }

  /**
   * Whatever the API answers, the session ends here: someone who asked to
   * leave must not stay logged in — and the token must not stay on the
   * device — just because the network was down.
   */
  confirmLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.endSession(),
      error: () => this.endSession(),
    });
  }

  private endSession(): void {
    this.authService.clearSession();
    this.isConfirmingLogout.set(false);
    this.router.navigate(['/login']);
  }
}
