import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {Button} from '@openng/optimus-ui/button';
import {Tag} from '@openng/optimus-ui/tag';
import {type NewIncasso, TipoPagamentoEnum} from '../../models/incasso';
import {formatEuro} from '../utils';

@Component({
  selector: 'app-incasso-list',
  imports: [Button, Tag],
  templateUrl: './incasso-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncassoList {
  incassi = input.required<NewIncasso[]>();
  /** Only shows the list: no row can be picked or removed. */
  readonly = input(false);
  /** The row being edited, highlighted in the list. */
  selectedIndex = input<number | null>(null);

  /** The index of the row to remove. */
  remove = output<number>();
  /** The index of the row to edit. */
  select = output<number>();

  readonly formatEuro = formatEuro;
  readonly ASSEGNO = TipoPagamentoEnum.ASSEGNO;

  total = computed(() => this.incassi().reduce((sum, incasso) => sum + incasso.importo, 0));
}
