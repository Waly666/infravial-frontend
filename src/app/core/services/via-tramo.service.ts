import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ViaTramoService {

    constructor(private api: ApiService) {}

    getAll(filtros?: any): Observable<any> {
        return this.api.get('/via-tramos', filtros);
    }

    getById(id: string): Observable<any> {
        return this.api.get(`/via-tramos/${id}`);
    }

    create(data: any): Observable<any> {
        return this.api.post('/via-tramos', data);
    }

    update(id: string, data: any): Observable<any> {
        return this.api.put(`/via-tramos/${id}`, data);
    }

    delete(id: string): Observable<any> {
        return this.api.delete(`/via-tramos/${id}`);
    }
}