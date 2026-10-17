import {HttpClient} from '@angular/common/http';
import {computed, Injectable, inject, type ResourceRef, signal} from '@angular/core';
import {rxResource, toObservable} from '@angular/core/rxjs-interop';
import {catchError, distinctUntilChanged, EMPTY, map, type Observable, of, repeat, switchMap, timer} from 'rxjs';
import {type ScannerAvailability, ScannerResponse, ScannerStatusEnum} from '../models/Scanner';
import {hasHttpStatus, retryDelay, SCANNER_RECHECK_INTERVAL_MS} from '../shared/utils';

@Injectable({providedIn: 'root'})
export class ScannerService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1/scanner';

  /**
   * Answers that another attempt cannot change: the session is gone (401) or
   * no scanner is configured at all (503).
   */
  private readonly FINAL_STATUSES = [401, 503];
  /** How many times a busy or unreachable scanner is asked again in a row. */
  private readonly MAX_RETRIES = 10;

  scannerInfo = signal('');

  /**
   * Whether the scanner can take a scan, as a resource bound to the caller:
   * call it while a component is being built (e.g. a field initializer) and
   * the resource, with any pending retry or check, dies with that component.
   *
   * @param enabled The scanner is only asked while this is true: turning it
   *   false stops the checks, turning it true again starts them over.
   */
  createScannerStatus(enabled: () => boolean = () => true): ResourceRef<ScannerAvailability> {
    // Not `params`: a resource whose params turn `undefined` goes idle but
    // keeps its stream running. `switchMap` drops the checks instead.
    const enabled$ = toObservable(computed(enabled));
    return rxResource({
      stream: () =>
        enabled$.pipe(switchMap((on) => (on ? this.watchAvailability() : of<ScannerAvailability>('checking')))),
      defaultValue: 'checking',
    });
  }

  /**
   * Scans the sheet on the printer platen. The backend talks to the printer:
   * the browser cannot reach a device on the local network by itself.
   */
  scan(): Observable<File> {
    return this.http
      .post(`${this.API_URL}/scan`, null, {responseType: 'blob'})
      .pipe(map((image) => new File([image], 'scansione.jpg', {type: 'image/jpeg'})));
  }

  /**
   * Asks the backend for the scanner state, over and over while the caller
   * lives, and emits what it means each time it changes:
   * - `available`: asked again every `SCANNER_RECHECK_INTERVAL_MS`, someone may start
   *   using the printer (a copy, a scan from another device) meanwhile;
   * - `checking`: busy or unreachable, asked again with a growing delay;
   * - `unavailable`: the retries ran out, or the answer was a 401 or a 503
   *   that asking again will not change. Nothing is asked any more.
   */
  private watchAvailability(): Observable<ScannerAvailability> {
    let failures = 0;
    let stop = false;

    return this.checkStatus().pipe(
      map((): ScannerAvailability => {
        failures = 0;
        return 'available';
      }),
      catchError((error: unknown) => {
        failures++;
        stop = hasHttpStatus(error, this.FINAL_STATUSES) || failures > this.MAX_RETRIES;
        return of<ScannerAvailability>(stop ? 'unavailable' : 'checking');
      }),
      // Subscribing again sends a new request; `EMPTY` ends the loop.
      repeat({
        delay: () => (stop ? EMPTY : timer(failures === 0 ? SCANNER_RECHECK_INTERVAL_MS : retryDelay(failures))),
      }),
      distinctUntilChanged()
    );
  }

  /** Asks the backend once: it errors unless the scanner is `Idle`. */
  private checkStatus(): Observable<void> {
    return this.http.get<ScannerResponse>(`${this.API_URL}/status`).pipe(
      map((res: ScannerResponse) => {
        if (res.scanner_status !== ScannerStatusEnum.IDLE) throw new Error(`The scanner is ${res.scanner_status}`);
        this.scannerInfo.set(res.info);
      })
    );
  }
}
