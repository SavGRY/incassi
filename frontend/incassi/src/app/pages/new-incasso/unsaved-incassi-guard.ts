import type {CanDeactivateFn} from '@angular/router';
import type {NewIncassoPage} from './new-incasso';

/** Leaving the page with a round not sent yet asks first: it would be lost. */
export const unsavedIncassiGuard: CanDeactivateFn<NewIncassoPage> = (page) =>
  page.hasUnsavedData() ? page.confirmLeave() : true;
