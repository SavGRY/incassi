import {signal} from '@angular/core';
import type {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import type {NewIncassoPage} from './new-incasso';
import {unsavedIncassiGuard} from './unsaved-incassi-guard';

describe('unsavedIncassiGuard', () => {
  const leave = (page: Partial<NewIncassoPage>) =>
    unsavedIncassiGuard(
      page as NewIncassoPage,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot
    );

  it('lets the user leave when nothing would be lost', () => {
    const confirmLeave = vi.fn();

    expect(leave({hasUnsavedData: signal(false), confirmLeave})).toBe(true);
    expect(confirmLeave).not.toHaveBeenCalled();
  });

  it('asks first when a round is not sent yet', async () => {
    const confirmLeave = vi.fn().mockResolvedValue(false);

    await expect(leave({hasUnsavedData: signal(true), confirmLeave})).resolves.toBe(false);
    expect(confirmLeave).toHaveBeenCalled();
  });
});
