import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Drawer} from '@openng/optimus-ui/drawer';
import type {NewClient} from '../../models/Client';
import {ClientService} from '../../services/client-service';
import {DocumentService} from '../../services/document-service';
import {ClientForm} from '../../shared/cliente-form/client-form';
import {CreateToggler} from '../../shared/create-toggler/create-toggler';
import {RecentDocuments} from '../../shared/recent-documents/recent-documents';

@Component({
  selector: 'app-home',
  imports: [RecentDocuments, CreateToggler, Drawer, ClientForm],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly docService = inject(DocumentService);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);
  documents = this.docService.documents();

  isClienteDrawerOpen = signal(false);
  erroreCliente = signal('');

  onCreateIncasso(): void {
    this.router.navigate(['/incassi/new']);
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
