import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConteoService {

    readonly apiUrl = environment.apiUrl;

    constructor(private api: ApiService) {}

    // ── Catálogos ─────────────────────────────────────────────────────────────
    getCats()     { return this.api.get<any>('/conteos/catalogos/cats'); }
    getSentidos() { return this.api.get<any>('/conteos/catalogos/sentidos'); }

    // ── Proyectos ─────────────────────────────────────────────────────────────
    getProyectos()           { return this.api.get<any>('/conteos/proyectos'); }
    getProyectoActivo()      { return this.api.get<any>('/conteos/proyectos/activo'); }
    createProyecto(d: any)   { return this.api.post<any>('/conteos/proyectos', d); }
    updateProyecto(id: string, d: any)  { return this.api.put<any>(`/conteos/proyectos/${id}`, d); }
    activarProyecto(id: string)         { return this.api.put<any>(`/conteos/proyectos/${id}/activar`, {}); }
    desactivarProyecto(id: string)      { return this.api.put<any>(`/conteos/proyectos/${id}/desactivar`, {}); }
    deleteProyecto(id: string)          { return this.api.delete<any>(`/conteos/proyectos/${id}`); }

    // ── Estaciones ────────────────────────────────────────────────────────────
    getEstaciones()          { return this.api.get<any>('/conteos/estaciones'); }
    getEstacion(id: string)  { return this.api.get<any>(`/conteos/estaciones/${id}`); }
    createEstacion(d: any)   { return this.api.post<any>('/conteos/estaciones', d); }
    updateEstacion(id: string, d: any) { return this.api.put<any>(`/conteos/estaciones/${id}`, d); }
    deleteEstacion(id: string)         { return this.api.delete<any>(`/conteos/estaciones/${id}`); }

    // ── Conteos ───────────────────────────────────────────────────────────────
    getConteos(params?: any)    { return this.api.get<any>('/conteos/conteos', params); }
    getConteo(id: string)       { return this.api.get<any>(`/conteos/conteos/${id}`); }
    createConteo(d: any)        { return this.api.post<any>('/conteos/conteos', d); }
    updateConteo(id: string, d: any) { return this.api.put<any>(`/conteos/conteos/${id}`, d); }
    deleteConteo(id: string)    { return this.api.delete<any>(`/conteos/conteos/${id}`); }

    // ── Sesiones (bloqueo sentidos) ───────────────────────────────────────────
    getSesiones(idConteo: string) { return this.api.get<any>(`/conteos/sesiones/${idConteo}`); }
    tomarSentido(d: any)          { return this.api.post<any>('/conteos/sesiones/tomar', d); }
    liberarSentido(idConteo: string)      { return this.api.put<any>(`/conteos/sesiones/${idConteo}/liberar`, {}); }
    liberarTodasSesiones(idConteo: string) { return this.api.put<any>(`/conteos/sesiones/${idConteo}/liberar-todas`, {}); }

    // ── Detalle (registrar vehículo) ──────────────────────────────────────────
    registrar(d: any)               { return this.api.post<any>('/conteos/detalle', d); }
    getDetalle(idConteo: string)    { return this.api.get<any>(`/conteos/detalle/${idConteo}`); }
    getResumen(idConteo: string)    { return this.api.get<any>(`/conteos/detalle/${idConteo}/resumen`); }
    deshacer(idConteo: string)      { return this.api.delete<any>(`/conteos/detalle/${idConteo}/deshacer`); }

    // ── SSE tiempo real ───────────────────────────────────────────────────────
    sseConteo(idConteo: string): EventSource {
        const token = localStorage.getItem('accessToken') || '';
        return new EventSource(`${this.apiUrl}/conteos/sse/${idConteo}?token=${token}`);
    }
}
