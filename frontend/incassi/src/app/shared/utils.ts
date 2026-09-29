import {registerLocaleData} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import localeIt from '@angular/common/locales/it';
import {DEFAULT_CURRENCY_CODE, LOCALE_ID, type Provider} from '@angular/core';

/** What each backend answer means for someone standing next to the printer. */
export const SCAN_ERRORS: Record<number, string> = {
  409: 'Lo scanner è in uso, ad esempio da un altro dispositivo: il pulsante si riattiva appena si libera.',
  503: 'Nessuno scanner configurato.',
  504: 'Lo scanner non è raggiungibile: controlla che la stampante sia accesa.',
};

/**
 * How often an available scanner is checked again: someone may start using
 * the printer (a copy, a scan from another device) while the form is open.
 */
export const SCANNER_RECHECK_INTERVAL_MS = 15000;

/** Delay before the n-th retry in a row (1-based): 1s, 2s, 4s, 8s, then 16s. */
export const retryDelay = (attempt: number): number => Math.min(1000 * 2 ** (attempt - 1), 16000);

/** Whether `error` is an HTTP answer with one of `statuses`. */
export const hasHttpStatus = (error: unknown, statuses: number[]): boolean =>
  error instanceof HttpErrorResponse && statuses.includes(error.status);

/** Makes the pipes speak Italian: `date` writes `29 set 2026`, a bare `currency` writes `120,50 €`. */
export const provideItalianLocale = (): Provider[] => {
  registerLocaleData(localeIt);
  return [
    {provide: LOCALE_ID, useValue: 'it'},
    {provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR'},
  ];
};

/** Why the backend refused to turn a round into documents. */
export const CREATE_INCASSO_ERRORS: Record<number, string> = {
  404: 'Uno dei clienti non esiste più: controlla gli incassi.',
  413: "Un'immagine supera i 10 MB: toglila o sostituiscila.",
  422: 'Dati non validi, oppure un file non è una foto JPEG o PNG.',
};
