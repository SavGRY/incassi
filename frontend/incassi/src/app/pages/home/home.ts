import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {Drawer} from '@openng/optimus-ui/drawer';
import type {NewClient} from '../../models/Client';
import type {NewIncasso} from '../../models/incasso';
import {ClientService} from '../../services/client-service';
import {DocumentService} from '../../services/document-service';
import {IncassiService} from '../../services/incassi-service';
import {ClientForm} from '../../shared/cliente-form/client-form';
import {CreateToggler} from '../../shared/create-toggler/create-toggler';
import {IncassoForm} from '../../shared/incasso-form/incasso-form';
import {RecentDocuments} from '../../shared/recent-documents/recent-documents';

@Component({
  selector: 'app-home',
  imports: [RecentDocuments, CreateToggler, Drawer, IncassoForm, ClientForm],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly docService = inject(DocumentService);
  private readonly incassiService = inject(IncassiService);
  private readonly clientService = inject(ClientService);
  documents = this.docService.documents();

  isIncassoDrawerOpen = signal(false);
  isClienteDrawerOpen = signal(false);
  erroreCliente = signal('');

  /**
   * The incasso form asks for the catalogue that feeds its autocomplete when
   * the drawer builds it. `carica` is idempotent, so the API is hit once.
   */
  onGetClient(): void {
    this.clientService.askForClient();
  }

  onSaveIncasso(incasso: NewIncasso): void {
    this.incassiService.createIncasso(incasso);
    this.isIncassoDrawerOpen.set(false);
  }

  async onSaveClient(newClient: NewClient): Promise<void> {
    this.erroreCliente.set('');
    try {
      await this.clientService.createNewClient(newClient);
      this.isClienteDrawerOpen.set(false);
    } catch (errore) {
      // The drawer stays open so the user can fix the code and try again.
      this.erroreCliente.set(
        (errore as {status?: number}).status === 409
          ? 'Esiste già un cliente con questo codice.'
          : 'Non è stato possibile salvare il cliente. Riprova.'
      );
    }
  }
}
