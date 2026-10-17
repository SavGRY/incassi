export enum ScannerStatusEnum {
  IDLE = 'Idle',
  PROCESSING = 'Processing',
  TESTING = 'Testing',
  STOPPED = 'Stopped',
  DOWN = 'Down',
}
export type ScannerStatus =
  | ScannerStatusEnum.IDLE
  | ScannerStatusEnum.PROCESSING
  | ScannerStatusEnum.TESTING
  | ScannerStatusEnum.STOPPED
  | ScannerStatusEnum.DOWN;

export interface ScannerResponse {
  info: string;
  scanner_status: ScannerStatus;
}

/** What the app makes of the scanner state: only `available` can take a scan. */
export type ScannerAvailability = 'checking' | 'available' | 'unavailable';
