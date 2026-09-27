import {HttpErrorResponse} from '@angular/common/http';
import {formatEuro, hasHttpStatus, retryDelay} from './utils';

describe('retryDelay', () => {
  it('doubles the wait at every retry', () => {
    expect([1, 2, 3, 4, 5].map(retryDelay)).toEqual([1000, 2000, 4000, 8000, 16000]);
  });

  it('never waits longer than 16 seconds', () => {
    expect(retryDelay(10)).toBe(16000);
  });
});

describe('hasHttpStatus', () => {
  it('matches an HTTP answer with one of the statuses', () => {
    expect(hasHttpStatus(new HttpErrorResponse({status: 503}), [401, 503])).toBe(true);
  });

  it('does not match an HTTP answer with another status', () => {
    expect(hasHttpStatus(new HttpErrorResponse({status: 504}), [401, 503])).toBe(false);
  });

  it('does not match an error that is not an HTTP answer', () => {
    expect(hasHttpStatus(new Error('The scanner is Processing'), [401, 503])).toBe(false);
  });
});

describe('formatEuro', () => {
  it('writes the amount the italian way, with two decimals', () => {
    // The space before the symbol is a non-breaking one.
    expect(formatEuro(1234.5)).toBe('1234,50\u00a0€');
  });
});
