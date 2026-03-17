import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UsuarioService {

    constructor(private api: ApiService) {}

    getAll(): Observable<any> {
        return this.api.get('/users');
    }

    getById(id: string): Observable<any> {
        return this.api.get(`/users/${id}`);
    }

    create(data: any): Observable<any> {
        return this.api.post('/users', data);
    }

    update(id: string, data: any): Observable<any> {
        return this.api.put(`/users/${id}`, data);
    }

    delete(id: string): Observable<any> {
        return this.api.delete(`/users/${id}`);
    }
}