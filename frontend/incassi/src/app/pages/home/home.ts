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

  constructor() {
    // The catalogue feeds the autocomplete of the incasso form.
    this.clientiService.carica().subscribe({error: () => undefined});
  }

  onSalvaIncasso(incasso: NuovoIncasso): void {
    this.incassiService.crea(incasso).subscribe();
    this.incassoDrawerAperto.set(false);
  }

  onSalvaCliente(cliente: NuovoCliente): void {
    this.erroreCliente.set('');
    this.clientiService.crea(cliente).subscribe({
      next: () => this.clienteDrawerAperto.set(false),
      // The drawer stays open so the user can fix the code and try again.
      error: (errore: {status?: number}) =>
        this.erroreCliente.set(
          errore.status === 409
            ? 'Esiste già un cliente con questo codice.'
            : 'Non è stato possibile salvare il cliente. Riprova.'
        ),
    });
  }
}
