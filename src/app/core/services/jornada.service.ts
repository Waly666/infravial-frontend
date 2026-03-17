import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class JornadaService {

    constructor(private api: ApiService) {}

    getAll(): Observable<any> {
        return this.api.get('/jornadas');
    }

    getActiva(): Observable<any> {
        return this.api.get('/jornadas/activa');
    }

    create(data: any): Observable<any> {
        return this.api.post('/jornadas', data);
    }

    finalizar(id: string): Observable<any> {
        return this.api.put(`/jornadas/${id}/finalizar`, {});
    }

    update(id: string, data: any): Observable<any> {
        return this.api.put(`/jornadas/${id}`, data);
    }
}