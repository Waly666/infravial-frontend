import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/** Referencia poblada opcional desde GET */
export interface JornadaCategRef {
    _id?: string;
    municipio?: string;
    dpto?: string;
    codMunicipio?: string;
    codDepto?: string;
    fechaJornada?: string;
    estado?: string;
}

export interface CategorizacionVial {
    _id?: string;
    /** Jornada de levantamiento; dpto/mun/códigos se alinean con ella al guardar */
    idJornada?: string | JornadaCategRef | null;
    nombreVia: string;
    departamento: string;
    municipio: string;
    munDivipol?: string | null;
    deptoDivipol?: string | null;
    codigoPR?: string;
    longitud_km?: number;
    ancho_m?: number;
    observaciones?: string;
    lat_inicio?: number | null;
    lng_inicio?: number | null;
    lat_fin?: number | null;
    lng_fin?: number | null;
    /** Longitud geodésica entre inicio y fin (metros) */
    longitud_tramo_m?: number | null;
    funcionalidad: 'A' | 'B' | 'C';
    tpd: 'A' | 'B' | 'C';
    tpdValor?: number;
    disenoGeometrico: 'A' | 'B' | 'C';
    poblacion: 'A' | 'B' | 'C';
    poblacionValor?: number;
    ptsPrimerOrden?: number;
    ptsSegundoOrden?: number;
    ptsTercerOrden?: number;
    clasificacion?: 'PRIMARIA' | 'SECUNDARIA' | 'TERCIARIA';
    /** Fecha del acto / registro de clasificación */
    fechaClasificacion?: string;
    nombreFuncionario?: string;
    entidadFuncionario?: string;
    fechaCreacion?: string;
    creadoPor?: any;
}

export interface ScoringPreview {
    ptsPrimerOrden: number;
    ptsSegundoOrden: number;
    ptsTercerOrden: number;
    clasificacion: 'PRIMARIA' | 'SECUNDARIA' | 'TERCIARIA';
}

export interface ListResponse {
    total: number;
    page: number;
    limit: number;
    datos: CategorizacionVial[];
}

@Injectable({ providedIn: 'root' })
export class CategorizacionVialService {

    constructor(private api: ApiService) {}

    getAll(params?: any): Observable<ListResponse> {
        return this.api.get<ListResponse>('/categorizacion-vial', params);
    }

    getById(id: string): Observable<CategorizacionVial> {
        return this.api.get<CategorizacionVial>(`/categorizacion-vial/${id}`);
    }

    create(data: CategorizacionVial): Observable<CategorizacionVial> {
        return this.api.post<CategorizacionVial>('/categorizacion-vial', data);
    }

    update(id: string, data: CategorizacionVial): Observable<CategorizacionVial> {
        return this.api.put<CategorizacionVial>(`/categorizacion-vial/${id}`, data);
    }

    remove(id: string): Observable<any> {
        return this.api.delete(`/categorizacion-vial/${id}`);
    }

    preview(funcionalidad: string, tpd: string, disenoGeometrico: string, poblacion: string): Observable<ScoringPreview> {
        return this.api.get<ScoringPreview>('/categorizacion-vial/preview', {
            funcionalidad, tpd, disenoGeometrico, poblacion
        });
    }

    estadisticas(): Observable<any> {
        return this.api.get('/categorizacion-vial/estadisticas');
    }

    /** Matriz oficial (Excel o PDF) para reporte MinTransporte */
    downloadMatrizBlob(id: string, format: 'xlsx' | 'pdf'): Observable<Blob> {
        return this.api.getBlob(
            `/categorizacion-vial/${id}/matriz?format=${format}`
        );
    }
}
