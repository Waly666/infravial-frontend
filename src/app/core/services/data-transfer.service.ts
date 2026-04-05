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
    // SINC — SincEje primero; los demás lo referencian
    { key: 'sinc-ejes',            label: 'SINC Ejes',              catalog: false },
    { key: 'sinc-propiedades',     label: 'SINC Propiedades',       catalog: false },
    { key: 'sinc-fotos-eje',       label: 'SINC Fotos Eje',         catalog: false },
    { key: 'sinc-puentes',         label: 'SINC Puentes',           catalog: false },
    { key: 'sinc-pontones',        label: 'SINC Pontones',          catalog: false },
    { key: 'sinc-obras-drenaje',   label: 'SINC Obras Drenaje',     catalog: false },
    { key: 'sinc-intersecciones',  label: 'SINC Intersecciones',    catalog: false },
    { key: 'sinc-defensas',        label: 'SINC Defensas',          catalog: false },
    { key: 'sinc-muros',           label: 'SINC Muros',             catalog: false },
    { key: 'sinc-taludes',         label: 'SINC Taludes',           catalog: false },
    { key: 'sinc-tuneles',         label: 'SINC Túneles',           catalog: false },
    { key: 'sinc-est-pavimento',   label: 'SINC Est. Pavimento',    catalog: false },
    // Nivel Detallado Mc — 17 capas
    { key: 'sinc-mc-berma',           label: 'SINC MC Berma',           catalog: false },
    { key: 'sinc-mc-calzada',         label: 'SINC MC Calzada',         catalog: false },
    { key: 'sinc-mc-cco',             label: 'SINC MC CCO',             catalog: false },
    { key: 'sinc-mc-cicloruta',       label: 'SINC MC Cicloruta',       catalog: false },
    { key: 'sinc-mc-cuneta',          label: 'SINC MC Cuneta',          catalog: false },
    { key: 'sinc-mc-defensa-vial',    label: 'SINC MC Defensa Vial',    catalog: false },
    { key: 'sinc-mc-dispositivo-its', label: 'SINC MC Dispositivo ITS', catalog: false },
    { key: 'sinc-mc-drenaje',         label: 'SINC MC Drenaje',         catalog: false },
    { key: 'sinc-mc-estacion-peaje',  label: 'SINC MC Est. Peaje',      catalog: false },
    { key: 'sinc-mc-estacion-pesaje', label: 'SINC MC Est. Pesaje',     catalog: false },
    { key: 'sinc-mc-luminaria',       label: 'SINC MC Luminaria',       catalog: false },
    { key: 'sinc-mc-muro',            label: 'SINC MC Muro',            catalog: false },
    { key: 'sinc-mc-puente',          label: 'SINC MC Puente',          catalog: false },
    { key: 'sinc-mc-senal-vertical',  label: 'SINC MC Señal Vertical',  catalog: false },
    { key: 'sinc-mc-separador',       label: 'SINC MC Separador',       catalog: false },
    { key: 'sinc-mc-tunel',           label: 'SINC MC Túnel',           catalog: false },
    { key: 'sinc-mc-zona-servicio',   label: 'SINC MC Zona Servicio',   catalog: false },
    { key: 'sinc-prs',                label: 'SINC PRS',                catalog: false },
    { key: 'sinc-senales',         label: 'SINC Señales',           catalog: false },
    { key: 'sinc-sitios-criticos', label: 'SINC Sitios Críticos',   catalog: false },
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
