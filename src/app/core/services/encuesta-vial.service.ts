import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class EncuestaVialService {

    constructor(private api: ApiService) {}

    getPreguntas(): Observable<any> {
        return this.api.get('/encuesta-vial/preguntas');
    }

    getRespuestasByTramo(idTramo: string): Observable<any> {
        return this.api.get(`/encuesta-vial/tramo/${idTramo}`);
    }

    guardarRespuestas(data: any): Observable<any> {
        return this.api.post('/encuesta-vial', data);
    }
}