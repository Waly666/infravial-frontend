import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BackupService {
    constructor(private api: ApiService) {}

    getLogs(): Observable<any> {
        return this.api.get('/backups/logs');
    }

    createBackup(): Observable<any> {
        return this.api.post('/backups/create', {});
    }

    restoreBackup(archivo: string): Observable<any> {
        return this.api.post('/backups/restore', { archivo });
    }
}
