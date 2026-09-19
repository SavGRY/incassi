import {Component, inject, signal} from '@angular/core';
import {Drawer} from '@openng/optimus-ui/drawer';
import type {NuovoIncasso} from '../../models/incasso';
import {Documenti} from '../../services/documenti';
import {Incassi} from '../../services/incassi';
import type {NuovoCliente} from '../../shared/cliente-form/cliente-form';
import {ClienteForm} from '../../shared/cliente-form/cliente-form';
import {CreateToggler} from '../../shared/create-toggler/create-toggler';
import {IncassoForm} from '../../shared/incasso-form/incasso-form';
import {RecentDocuments} from '../../shared/recent-documents/recent-documents';

@Component({
  selector: 'app-home',
  imports: [RecentDocuments, CreateToggler, Drawer, IncassoForm, ClienteForm],
  templateUrl: './home.html',
})
export class Home {
  private readonly documentiService = inject(Documenti);
  private readonly incassiService = inject(Incassi);
  documenti = this.documentiService.documenti;

  incassoDrawerAperto = signal(false);
  clienteDrawerAperto = signal(false);

  onSalvaIncasso(incasso: NuovoIncasso): void {
    this.incassiService.crea(incasso).subscribe();
    this.incassoDrawerAperto.set(false);
  }

  onSalvaCliente(cliente: NuovoCliente): void {
    console.log('Nuovo cliente', cliente);
    this.clienteDrawerAperto.set(false);
  }
}
