import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CatalogoService {

    constructor(private api: ApiService) {}

    // DIVIPOL
    getDivipol(filtros?: any): Observable<any> {
        return this.api.get('/catalogos/divipol', filtros);
    }

    buscarDivipol(q: string): Observable<any> {
        return this.api.get('/catalogos/divipol/buscar', { q });
    }

    // Esquema Perfil
    getEsquemasPerfil(filtros?: any): Observable<any> {
        return this.api.get('/catalogos/esquema-perfil', filtros);
    }

    // Señales Verticales catálogo
    getSenVertscat(): Observable<any> {
        return this.api.get('/catalogos/sen-vert');
    }

    // Ubicaciones Señales Horizontales
    getUbicSenHor(): Observable<any> {
        return this.api.get('/catalogos/ubic-sen-hor');
    }

    // Demarcaciones
    getDemarcaciones(): Observable<any> {
        return this.api.get('/catalogos/demarcaciones');
    }

    // Observaciones
    getObsVias(): Observable<any> {
        return this.api.get('/catalogos/obs-vias');
    }

    getObsSV(): Observable<any> {
        return this.api.get('/catalogos/obs-sv');
    }

    getObsSH(): Observable<any> {
        return this.api.get('/catalogos/obs-sh');
    }

    getObsSemaforos(): Observable<any> {
        return this.api.get('/catalogos/obs-semaforos');
    }

    // ZATs, Comunas, Barrios
    getZats(filtros?: any): Observable<any> {
        return this.api.get('/catalogos/zats', filtros);
    }

    getComunas(filtros?: any): Observable<any> {
        return this.api.get('/catalogos/comunas', filtros);
    }

    getBarrios(filtros?: any): Observable<any> {
        return this.api.get('/catalogos/barrios', filtros);
    }

    // CRUD genérico catálogos
    create(catalogo: string, data: any): Observable<any> {
        return this.api.post(`/catalogos/${catalogo}`, data);
    }

    update(catalogo: string, id: string, data: any): Observable<any> {
        return this.api.put(`/catalogos/${catalogo}/${id}`, data);
    }

    delete(catalogo: string, id: string): Observable<any> {
        return this.api.delete(`/catalogos/${catalogo}/${id}`);
    }

    uploadImagen(catalogo: string, formData: FormData): Observable<any> {
        return this.api.uploadFile(`/catalogos/${catalogo}`, formData);
    }
}