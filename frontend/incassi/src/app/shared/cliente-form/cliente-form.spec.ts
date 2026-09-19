import {type ComponentFixture, TestBed} from '@angular/core/testing';
import type {NuovoCliente} from '../../models/cliente';
import {ClienteForm} from './cliente-form';

describe('ClienteForm', () => {
  let component: ClienteForm;
  let fixture: ComponentFixture<ClienteForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  const compila = (valori: Partial<Record<string, unknown>> = {}): void => {
    component.form.setValue({
      name: 'Bianchi S.p.A.',
      address: 'Via Roma 1',
      city: 'Milano',
      province: 'MI',
      code: 142,
      ...valori,
    } as never);
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts invalid', () => {
    expect(component.isFormValid()).toBe(false);
  });

  it('is valid once every required field is filled', () => {
    compila();
    expect(component.isFormValid()).toBe(true);
  });

  it('accepts an empty address', () => {
    compila({address: ''});
    expect(component.isFormValid()).toBe(true);
  });

  it('rejects a province that is not two letters', () => {
    compila({province: 'MIL'});
    expect(component.isFormValid()).toBe(false);

    compila({province: 'M'});
    expect(component.isFormValid()).toBe(false);

    compila({province: 'M1'});
    expect(component.isFormValid()).toBe(false);
  });

  it('rejects a code that is not positive', () => {
    compila({code: 0});
    expect(component.isFormValid()).toBe(false);
  });

  it('emits the client with an uppercased province and a null empty address', () => {
    const emessi: NuovoCliente[] = [];
    component.salva.subscribe((cliente) => emessi.push(cliente));

    compila({province: 'mi', address: '  '});
    component.onSubmit();

    expect(emessi).toEqual([
      {
        code: 142,
        name: 'Bianchi S.p.A.',
        address: null,
        city: 'Milano',
        province: 'MI',
      },
    ]);
  });

  it('does not emit when the form is invalid', () => {
    const emessi: NuovoCliente[] = [];
    component.salva.subscribe((cliente) => emessi.push(cliente));

    component.onSubmit();

    expect(emessi).toEqual([]);
  });

  it('resets the form after a submit', () => {
    compila();
    component.onSubmit();

    expect(component.form.getRawValue().name).toBeFalsy();
    expect(component.isFormValid()).toBe(false);
  });
});
