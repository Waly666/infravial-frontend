import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SincService {

    constructor(private api: ApiService) {}

    // Dominios
    getDominios(): Observable<any> { return this.api.get('/sinc/dominios'); }

    // ─── EJES ─────────────────────────────────────────────────────────────────
    getAllEjes(filtros?: any):         Observable<any> { return this.api.get('/sinc/ejes', filtros); }
    getEjeById(id: string):            Observable<any> { return this.api.get(`/sinc/ejes/${id}`); }
    getResumenEje(id: string):         Observable<any> { return this.api.get(`/sinc/ejes/${id}/resumen`); }
    createEje(data: any):              Observable<any> { return this.api.post('/sinc/ejes', data); }
    updateEje(id: string, data: any):  Observable<any> { return this.api.put(`/sinc/ejes/${id}`, data); }
    deleteEje(id: string):             Observable<any> { return this.api.delete(`/sinc/ejes/${id}`); }

    // ─── FOTO EJE ─────────────────────────────────────────────────────────────
    getFotosByEje(idEje: string):         Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/fotos`); }
    createFotoEje(data: any):             Observable<any> { return this.api.post('/sinc/fotos-eje', data); }
    updateFotoEje(id: string, data: any): Observable<any> { return this.api.put(`/sinc/fotos-eje/${id}`, data); }
    deleteFotoEje(id: string):            Observable<any> { return this.api.delete(`/sinc/fotos-eje/${id}`); }

    // ─── PRS ──────────────────────────────────────────────────────────────────
    getPrsByEje(idEje: string):        Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/prs`); }
    createPrs(data: any):              Observable<any> { return this.api.post('/sinc/prs', data); }
    updatePrs(id: string, data: any):  Observable<any> { return this.api.put(`/sinc/prs/${id}`, data); }
    deletePrs(id: string):             Observable<any> { return this.api.delete(`/sinc/prs/${id}`); }

    // ─── PROPIEDADES ──────────────────────────────────────────────────────────
    getPropiedadesByEje(idEje: string):        Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/propiedades`); }
    createPropiedades(data: any):              Observable<any> { return this.api.post('/sinc/propiedades', data); }
    updatePropiedades(id: string, data: any):  Observable<any> { return this.api.put(`/sinc/propiedades/${id}`, data); }
    deletePropiedades(id: string):             Observable<any> { return this.api.delete(`/sinc/propiedades/${id}`); }

    // ─── PUENTES ──────────────────────────────────────────────────────────────
    getPuentesByEje(idEje: string):        Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/puentes`); }
    getPuenteById(id: string):             Observable<any> { return this.api.get(`/sinc/puentes/${id}`); }
    createPuente(data: any):               Observable<any> { return this.api.post('/sinc/puentes', data); }
    updatePuente(id: string, data: any):   Observable<any> { return this.api.put(`/sinc/puentes/${id}`, data); }
    deletePuente(id: string):              Observable<any> { return this.api.delete(`/sinc/puentes/${id}`); }

    // ─── MUROS ────────────────────────────────────────────────────────────────
    getMurosByEje(idEje: string):          Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/muros`); }
    createMuro(data: any):                 Observable<any> { return this.api.post('/sinc/muros', data); }
    updateMuro(id: string, data: any):     Observable<any> { return this.api.put(`/sinc/muros/${id}`, data); }
    deleteMuro(id: string):                Observable<any> { return this.api.delete(`/sinc/muros/${id}`); }

    // ─── TÚNELES ──────────────────────────────────────────────────────────────
    getTunelesByEje(idEje: string):        Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/tuneles`); }
    createTunel(data: any):                Observable<any> { return this.api.post('/sinc/tuneles', data); }
    updateTunel(id: string, data: any):    Observable<any> { return this.api.put(`/sinc/tuneles/${id}`, data); }
    deleteTunel(id: string):               Observable<any> { return this.api.delete(`/sinc/tuneles/${id}`); }

    // ─── SITIOS CRÍTICOS ──────────────────────────────────────────────────────
    getSitiosByEje(idEje: string):         Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/sitios-criticos`); }
    createSitio(data: any):                Observable<any> { return this.api.post('/sinc/sitios-criticos', data); }
    updateSitio(id: string, data: any):    Observable<any> { return this.api.put(`/sinc/sitios-criticos/${id}`, data); }
    deleteSitio(id: string):               Observable<any> { return this.api.delete(`/sinc/sitios-criticos/${id}`); }

    // ─── OBRAS DRENAJE ────────────────────────────────────────────────────────
    getObrasByEje(idEje: string):          Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/obras-drenaje`); }
    createObra(data: any):                 Observable<any> { return this.api.post('/sinc/obras-drenaje', data); }
    updateObra(id: string, data: any):     Observable<any> { return this.api.put(`/sinc/obras-drenaje/${id}`, data); }
    deleteObra(id: string):                Observable<any> { return this.api.delete(`/sinc/obras-drenaje/${id}`); }

    // ─── NIVEL DETALLADO Mc — CRUD genérico ──────────────────────────────────
    getMcByEje(capa: string, idEje: string):          Observable<any> { return this.api.get(`/sinc/ejes/${idEje}/mc/${capa}`); }
    createMc(capa: string, data: any):                Observable<any> { return this.api.post(`/sinc/mc/${capa}`, data); }
    updateMc(capa: string, id: string, data: any):    Observable<any> { return this.api.put(`/sinc/mc/${capa}/${id}`, data); }
    deleteMc(capa: string, id: string):               Observable<any> { return this.api.delete(`/sinc/mc/${capa}/${id}`); }
}
