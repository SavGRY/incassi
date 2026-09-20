import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {Drawer} from '@openng/optimus-ui/drawer';
import type {NuovoCliente} from '../../models/cliente';
import type {NuovoIncasso} from '../../models/incasso';
import {Clienti} from '../../services/clienti';
import {Documenti} from '../../services/documenti';
import {Incassi} from '../../services/incassi';
import {ClienteForm} from '../../shared/cliente-form/cliente-form';
import {CreateToggler} from '../../shared/create-toggler/create-toggler';
import {IncassoForm} from '../../shared/incasso-form/incasso-form';
import {RecentDocuments} from '../../shared/recent-documents/recent-documents';

@Component({
  selector: 'app-home',
  imports: [RecentDocuments, CreateToggler, Drawer, IncassoForm, ClienteForm],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly documentiService = inject(Documenti);
  private readonly incassiService = inject(Incassi);
  private readonly clientiService = inject(Clienti);
  documenti = this.documentiService.documenti;

  incassoDrawerAperto = signal(false);
  clienteDrawerAperto = signal(false);
  erroreCliente = signal('');

  /**
   * The incasso form asks for the catalogue that feeds its autocomplete when
   * the drawer builds it. `carica` is idempotent, so the API is hit once.
   */
  onGetClient(): void {
    this.clientiService.askForClient();
  }

  async onSalvaIncasso(incasso: NuovoIncasso): Promise<void> {
    await this.incassiService.crea(incasso);
    this.incassoDrawerAperto.set(false);
  }

  async onSalvaCliente(cliente: NuovoCliente): Promise<void> {
    this.erroreCliente.set('');
    try {
      await this.clientiService.crea(cliente);
      this.clienteDrawerAperto.set(false);
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
