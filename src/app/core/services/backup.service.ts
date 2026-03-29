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

    downloadBackup(archivo: string): Observable<Blob> {
        const q = encodeURIComponent(archivo);
        return this.api.getBlob(`/backups/download/${q}`);
    }

    restoreFromUploadedFile(file: File): Observable<any> {
        const fd = new FormData();
        fd.append('file', file, file.name);
        return this.api.uploadFile('/backups/restore-upload', fd);
    }

    purgeDatabase(grupos: string[], confirmacion: string): Observable<any> {
        return this.api.post('/backups/purge', { grupos, confirmacion });
    }
}
