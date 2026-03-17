import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SenHorService {

    constructor(private api: ApiService) {}

    getAll(filtros?: any): Observable<any> {
        return this.api.get('/sen-hor', filtros);
    }

    getById(id: string): Observable<any> {
        return this.api.get(`/sen-hor/${id}`);
    }

    create(data: any): Observable<any> {
        return this.api.post('/sen-hor', data);
    }

    update(id: string, data: any): Observable<any> {
        return this.api.put(`/sen-hor/${id}`, data);
    }

    delete(id: string): Observable<any> {
        return this.api.delete(`/sen-hor/${id}`);
    }
}