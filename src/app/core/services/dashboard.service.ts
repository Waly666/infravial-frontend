import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {

    constructor(private api: ApiService) {}

    getStats(filters?: { departamento?: string; municipio?: string }): Observable<any> {
        return this.api.get('/dashboard/stats', filters);
    }
}