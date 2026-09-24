import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router} from '@angular/router';
import {Button} from '@openng/optimus-ui/button';
import {Dialog} from '@openng/optimus-ui/dialog';
import {filter, map} from 'rxjs';
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
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects)
    ),
    {initialValue: this.router.url}
  );
  readonly isOnLoginPage = computed(() => this.currentUrl().startsWith('/login'));
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
