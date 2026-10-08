import {registerLocaleData} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import localeIt from '@angular/common/locales/it';
import {DEFAULT_CURRENCY_CODE, LOCALE_ID, type Provider} from '@angular/core';
import type {DocumentType} from '../models/document';

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

/** The tag that tells a document type apart, on cards and list rows. */
export const DOCUMENT_TAGS: Record<DocumentType, {label: string; severity: 'info' | 'secondary'}> = {
  scan: {label: 'A4', severity: 'info'},
  busta: {label: 'Busta', severity: 'secondary'},
};

/** Why the backend refused to turn a round into documents. */
export const CREATE_INCASSO_ERRORS: Record<number, string> = {
  404: 'Uno dei clienti non esiste più: controlla gli incassi.',
  413: "Un'immagine supera i 10 MB: toglila o sostituiscila.",
  422: 'Dati non validi, oppure un file non è una foto JPEG o PNG.',
};

/** Hands `blob` to the browser as a download named `name`. */
export const saveFile = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // Freed once the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url));
};
