import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SemaforoService } from '../../../core/services/semaforo.service';
import { environment } from '../../../../environments/environment';
import * as QRCode from 'qrcode';

@Component({
    selector: 'app-reporte-semaforo',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reporte-semaforo.html',
    styleUrl: './reporte-semaforo.scss'
})
export class ReporteSemaforoComponent implements OnInit {

    semaforo:  any  = null;
    loading        = true;
    apiUrl         = environment.apiUrl;
    qrDataUrl      = '';

    constructor(
        private route:           ActivatedRoute,
        private router:          Router,
        private semaforoService: SemaforoService
    ) {}

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) this.loadData(id);
    }

    loadData(id: string) {
        this.semaforoService.getById(id).subscribe({
            next: (res: any) => {
                this.semaforo = res.registro;
                this.generarQR();
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    async generarQR() {
        if (!this.semaforo) return;
        const datos = [
            `N° Externo: ${this.semaforo.numExterno || '—'}`,
            `Tramo: ${this.semaforo.idViaTramo?.via || '—'}`,
            `Municipio: ${this.semaforo.idViaTramo?.municipio || '—'}`,
            `Clase: ${this.semaforo.claseSem || '—'}`,
            `N° Caras: ${this.semaforo.numCaras || '—'}`,
            `Funciona: ${this.semaforo.semaforoFunciona ? 'Sí' : 'No'}`,
            `Fase: ${this.semaforo.fase || '—'}`,
            `Soporte: ${this.semaforo.tipoSoporte || '—'}`
        ].join('\n');

        this.qrDataUrl = await QRCode.toDataURL(datos, {
            width: 120,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
        });
    }

    get mapUrl(): string {
        if (!this.semaforo?.ubicacion?.coordinates?.length) return '';
        const lat = this.semaforo.ubicacion.coordinates[1];
        const lng = this.semaforo.ubicacion.coordinates[0];
        const apiKey = '8f830486caea4be78d6e0e4fb95f1001';
        return `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=400&height=250&center=lonlat:${lng},${lat}&zoom=17&marker=lonlat:${lng},${lat};color:%23ff0000;size:medium&apiKey=${apiKey}`;
    }

    imprimir() { window.print(); }
    volver()   { window.history.back(); }
}