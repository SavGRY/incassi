import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {map, Observable} from 'rxjs';

@Injectable({providedIn: 'root'})
export class ScannerService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8000/api/v1/scanner';

  /**
   * Scans the sheet on the printer platen. The backend talks to the printer:
   * the browser cannot reach a device on the local network by itself.
   */
  scan(): Observable<File> {
    return this.http
      .post(`${this.API_URL}/scan`, null, {responseType: 'blob'})
      .pipe(map((image) => new File([image], 'scansione.jpg', {type: 'image/jpeg'})));
  }
}
