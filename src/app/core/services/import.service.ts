import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ImportProgressBlock {
    current: number;
    total: number;
    ok: number;
    err: number;
}

export interface ImportStatusPayload {
    running: boolean;
    startedAt: string | null;
    finishedAt: string | null;
    dryRun: boolean;
    archivo: string | null;
    municipio: string | null;
    jornadaActiva: string | null;
    currentModule: string | null;
    lastLine: string;
    via: ImportProgressBlock;
    vert: ImportProgressBlock;
    hor: ImportProgressBlock;
}

@Injectable({ providedIn: 'root' })
export class ImportService {
    constructor(private api: ApiService) {}

    getStatus(): Observable<{ status: ImportStatusPayload }> {
        return this.api.get<{ status: ImportStatusPayload }>('/imports/status');
    }

    uploadExcel(file: File, dryRun: boolean): Observable<unknown> {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('dryRun', dryRun ? 'true' : 'false');
        return this.api.uploadFile('/imports/excel', fd);
    }

    rollbackLast(): Observable<unknown> {
        return this.api.post('/imports/rollback-last', {});
    }
}
