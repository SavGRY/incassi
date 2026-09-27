import {ChangeDetectionStrategy, Component, computed, inject, signal, viewChild} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {ConfirmationService} from '@openng/optimus-ui/api';
import {ButtonDirective, ButtonIcon} from '@openng/optimus-ui/button';
import {ConfirmDialog} from '@openng/optimus-ui/confirmdialog';
import type {IncassiSubmission} from '../../models/incasso';
import {ClientService} from '../../services/client-service';
import {IncassiService} from '../../services/incassi-service';
import {IncassoForm} from '../../shared/incasso-form/incasso-form';
import {CREATE_INCASSO_ERRORS} from '../../shared/utils';

@Component({
  selector: 'app-new-incasso',
  imports: [IncassoForm, ConfirmDialog, RouterLink, ButtonDirective, ButtonIcon],
  templateUrl: './new-incasso.html',
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewIncassoPage {
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);
  private readonly incassiService = inject(IncassiService);
  private readonly confirmationService = inject(ConfirmationService);

  private readonly form = viewChild.required(IncassoForm);

  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  /** The round reached the backend: nothing is left to lose. */
  private readonly isSent = signal(false);

  hasUnsavedData = computed(() => !this.isSent() && this.form().hasData());

  onGetClient(): void {
    this.clientService.askForClient();
  }

  async onSubmitIncassi({incassi, images}: IncassiSubmission): Promise<void> {
    this.isSubmitting.set(true);
    this.submitError.set(null);
    try {
      await this.incassiService.createIncasso(incassi, images);
      this.isSent.set(true);
      await this.router.navigate(['/']);
    } catch (error) {
      // The page stays, with everything the user entered, ready to try again.
      const status = (error as {status?: number}).status ?? 0;
      this.submitError.set(CREATE_INCASSO_ERRORS[status] ?? 'Non è stato possibile generare i documenti. Riprova.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /** Asks whether to leave the page and lose the incassi entered so far. */
  confirmLeave(): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationService.confirm({
        header: 'Uscire dalla pagina?',
        message: 'Gli incassi e le immagini inseriti andranno persi.',
        icon: 'fa fa-regular fa-triangle-exclamation',
        acceptLabel: 'Esci',
        rejectLabel: 'Resta',
        acceptButtonProps: {severity: 'danger'},
        rejectButtonProps: {severity: 'secondary', outlined: true},
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
