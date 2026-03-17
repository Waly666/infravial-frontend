import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuditService {

    constructor(private api: ApiService) {}

    getAll(filtros?: any): Observable<any> {
        return this.api.get('/audit', filtros);
    }

    getByUser(userId: string): Observable<any> {
        return this.api.get(`/audit/user/${userId}`);
    }
}