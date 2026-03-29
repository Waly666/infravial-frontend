import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ControlSemService {

    constructor(private api: ApiService) {}

    getAll(filtros?: any): Observable<any> {
        return this.api.get('/control-semaforo', filtros);
    }

    getById(id: string): Observable<any> {
        return this.api.get(`/control-semaforo/${id}`);
    }

    /** Un control por tramo (si existe). */
    getByTramo(idViaTramo: string): Observable<any> {
        return this.api.get(`/control-semaforo/tramo/${idViaTramo}`);
    }

    create(data: any): Observable<any> {
        return this.api.post('/control-semaforo', data);
    }

    update(id: string, data: any): Observable<any> {
        return this.api.put(`/control-semaforo/${id}`, data);
    }

    delete(id: string): Observable<any> {
        return this.api.delete(`/control-semaforo/${id}`);
    }
}