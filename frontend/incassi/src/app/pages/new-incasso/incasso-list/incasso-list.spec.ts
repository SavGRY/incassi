import {ComponentFixture, TestBed} from '@angular/core/testing';
import type {Client} from '../../../models/Client';
import {type NewIncasso, TipoPagamentoEnum} from '../../../models/incasso';
import {formatEuro} from '../../../shared/utils';
import {IncassoList} from './incasso-list';

const ROSSI: Client = {code: 12, name: 'Rossi S.r.l.', address: null, city: 'Milano', province: 'MI'};
const BIANCHI: Client = {code: 7, name: 'Bianchi S.p.A.', address: null, city: 'Lodi', province: 'LO'};

const INCASSI: NewIncasso[] = [
  {cliente: ROSSI, importo: 120.5, tipoPagamento: TipoPagamentoEnum.CONTANTI},
  {cliente: BIANCHI, importo: 80, tipoPagamento: TipoPagamentoEnum.ASSEGNO},
];

describe('IncassoList', () => {
  let fixture: ComponentFixture<IncassoList>;
  let element: HTMLElement;

  const render = (incassi: NewIncasso[], readonly = false): void => {
    fixture = TestBed.createComponent(IncassoList);
    fixture.componentRef.setInput('incassi', incassi);
    fixture.componentRef.setInput('readonly', readonly);
    fixture.detectChanges();
    element = fixture.nativeElement;
  };

  const removeButton = (name: string): HTMLButtonElement | null =>
    element.querySelector(`button[aria-label="Elimina incasso di ${name}"]`);

  it('says when there is nothing yet', () => {
    render([]);

    expect(element.textContent).toContain('Nessun incasso inserito.');
  });

  it('shows client, payment type and amount of every incasso', () => {
    render(INCASSI);

    const rows = element.querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Rossi S.r.l.');
    expect(rows[0].textContent).toContain('Contanti');
    expect(rows[0].textContent).toContain(formatEuro(120.5));
    expect(rows[1].textContent).toContain('Assegno');
  });

  it('sums the amounts', () => {
    render(INCASSI);

    expect(element.querySelector('[data-testid="incassi-total"]')?.textContent).toBe(formatEuro(200.5));
  });

  it('asks to remove a row', () => {
    render(INCASSI);
    const removed: number[] = [];
    fixture.componentInstance.remove.subscribe((index) => removed.push(index));

    removeButton('Bianchi S.p.A.')?.click();

    expect(removed).toEqual([1]);
  });

  it('asks to edit a row', () => {
    render(INCASSI);
    const selected: number[] = [];
    fixture.componentInstance.select.subscribe((index) => selected.push(index));

    element.querySelector<HTMLButtonElement>('button[aria-label="Modifica incasso di Rossi S.r.l."]')?.click();

    expect(selected).toEqual([0]);
  });

  it('only shows the rows when read only', () => {
    render(INCASSI, true);

    expect(removeButton('Rossi S.r.l.')).toBeNull();
    expect(element.querySelector('button')).toBeNull();
    expect(element.textContent).toContain('Rossi S.r.l.');
  });
});
