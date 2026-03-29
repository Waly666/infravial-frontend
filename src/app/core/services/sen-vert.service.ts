import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SenVertService {

    constructor(private api: ApiService) {}

    getAll(filtros?: any): Observable<any> {
        return this.api.get('/sen-vert', filtros);
    }

    getById(id: string): Observable<any> {
        return this.api.get(`/sen-vert/${id}`);
    }

    create(data: any): Observable<any> {
        return this.api.post('/sen-vert', data);
    }

    update(id: string, data: any): Observable<any> {
        return this.api.put(`/sen-vert/${id}`, data);
    }

    delete(id: string): Observable<any> {
        return this.api.delete(`/sen-vert/${id}`);
    }

    getEstadisticas(params?: Record<string, string | undefined>): Observable<any> {
        return this.api.get('/sen-vert/estadisticas', params);
    }
}