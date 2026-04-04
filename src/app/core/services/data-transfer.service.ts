import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface TableProgress {
    label: string;
    total: number;
    current: number;
    ok: number;
    err: number;
    status: 'pending' | 'running' | 'done';
}

export interface PhotoProgress {
    total: number;
    current: number;
    ok: number;
    err: number;
}

export interface JobSnapshot {
    type: 'snapshot';
    tables: Record<string, TableProgress>;
    photos: PhotoProgress;
    status: 'running' | 'done' | 'error';
    error: string | null;
}

export interface JobComplete {
    type: 'complete';
    jobId: string;
    jobType: 'export' | 'import';
}

export const ALL_TABLES = [
    // Jornadas primero — las demás tablas la referencian con idJornada
    { key: 'jornadas',         label: 'Jornadas',           catalog: false },
    { key: 'via-tramos',       label: 'Vía Tramos',         catalog: false },
    { key: 'sen-verticales',   label: 'Señales Verticales', catalog: false },
    { key: 'sen-horizontales', label: 'Señales Horiz.',     catalog: false },
    { key: 'semaforos',        label: 'Semáforos',          catalog: false },
    { key: 'control-semaforo', label: 'Control Semáforo',   catalog: false },
    { key: 'cajas-inspeccion', label: 'Cajas Inspección',   catalog: false },
    { key: 'categorizacion-vial', label: 'Categorización Vial', catalog: false },
    { key: 'divipol',          label: 'Divipol',            catalog: true  },
    { key: 'zat',              label: 'ZAT',                catalog: true  },
    { key: 'comunas',          label: 'Comunas',            catalog: true  },
    { key: 'barrios',          label: 'Barrios',            catalog: true  },
];

@Injectable({ providedIn: 'root' })
export class DataTransferService {
    private apiUrl = environment.apiUrl;

    constructor(
        private api: ApiService,
        private auth: AuthService
    ) {}

    getOpciones(): Observable<{ departamentos: string[]; municipios: string[]; jornadas: any[] }> {
        return this.api.get('/data-transfer/opciones');
    }

    startExport(payload: {
        tipoFiltro: string;
        valorFiltro: string;
        fechaDesde?: string;
        fechaHasta?: string;
        tablas: string[];
    }): Observable<{ jobId: string }> {
        return this.api.post('/data-transfer/export/start', payload);
    }

    startImport(file: File, dryRun: boolean): Observable<{ jobId: string }> {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('dryRun', dryRun ? 'true' : 'false');
        return this.api.uploadFile('/data-transfer/import/start', fd);
    }

    openProgressStream(jobId: string): EventSource {
        const token = this.auth.getToken() ?? '';
        return new EventSource(
            `${this.apiUrl}/data-transfer/progress/${jobId}?token=${encodeURIComponent(token)}`
        );
    }

    downloadExport(jobId: string): Observable<Blob> {
        return this.api.getBlob(`/data-transfer/export/download/${jobId}`);
    }
}
