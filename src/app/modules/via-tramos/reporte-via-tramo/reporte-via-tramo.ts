import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { SenVertService } from '../../../core/services/sen-vert.service';
import { SenHorService } from '../../../core/services/sen-hor.service';
import { SemaforoService } from '../../../core/services/semaforo.service';
import { ControlSemService } from '../../../core/services/control-sem.service';
import { CajaInspService } from '../../../core/services/caja-insp.service';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import * as QRCode from 'qrcode';

@Component({
    selector: 'app-reporte-via-tramo',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reporte-via-tramo.html',
    styleUrl: './reporte-via-tramo.scss'
})
export class ReporteViaTramoComponent implements OnInit {

    tramo:              any     = null;
    senVerticales:      any[]   = [];
    senHorizontales:    any[]   = [];
    semaforos:          any[]   = [];
    controles:          any[]   = [];
    cajas:              any[]   = [];
    respuestas:         any[]   = [];
    preguntas:          any[]   = [];
    preguntasOrdenadas: any[]   = [];
    loading  = true;
    apiUrl   = environment.apiUrl;
    qrDataUrl = '';

    constructor(
        private route:             ActivatedRoute,
        private router:            Router,
        private viaTramoService:   ViaTramoService,
        private senVertService:    SenVertService,
        private senHorService:     SenHorService,
        private semaforoService:   SemaforoService,
        private api:               ApiService,
        private controlSemService: ControlSemService,
        private cajaInspService:   CajaInspService
    ) {}

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) this.loadData(id);
    }

    loadData(id: string) {
        this.viaTramoService.getById(id).subscribe({
            next: (res: any) => {
                this.tramo = res.tramo;
                this.generarQR();
                this.loadElementos(id);
            }
        });
    }

    loadElementos(idTramo: string) {
        // Señales Verticales
        this.senVertService.getAll().subscribe({
            next: (res: any) => {
                this.senVerticales = res.registros.filter(
                    (r: any) => r.idViaTramo?._id === idTramo || r.idViaTramo === idTramo
                );
            }
        });

        // Señales Horizontales
        this.senHorService.getAll().subscribe({
            next: (res: any) => {
                this.senHorizontales = res.registros.filter(
                    (r: any) => r.idViaTramo?._id === idTramo || r.idViaTramo === idTramo
                );
            }
        });

        // Semáforos
        this.semaforoService.getAll().subscribe({
            next: (res: any) => {
                this.semaforos = res.registros.filter(
                    (r: any) => r.idViaTramo?._id === idTramo || r.idViaTramo === idTramo
                );
            }
        });

        // Control Semafórico
        this.controlSemService.getAll().subscribe({
            next: (res: any) => {
                this.controles = res.registros.filter(
                    (r: any) => r.idViaTramo?._id === idTramo || r.idViaTramo === idTramo
                );
            },
            error: () => {}
        });

        // Cajas Inspección
        this.cajaInspService.getAll().subscribe({
            next: (res: any) => {
                this.cajas = res.registros.filter(
                    (r: any) => r.idViaTramo?._id === idTramo || r.idViaTramo === idTramo
                );
            }
        });

        // Respuestas encuesta
        this.api.get<any>(`/encuesta-vial/tramo/${idTramo}`).subscribe({
            next: (res: any) => {
                console.log('RESPUESTAS RES:', res);
                this.respuestas = res.respuestas || [];
            },
            error: (err) => console.error('ERROR RESPUESTAS:', err)
        });

        // Preguntas encuesta
        this.api.get<any>(`/encuesta-vial/preguntas`).subscribe({
            next: (res: any) => {
                this.preguntas = res.preguntas || [];
                this.preguntasOrdenadas = [...this.preguntas].sort((a, b) => {
                    const parseNum = (val: string) => {
                        const parts = val.toString().split('.');
                        const main = parseInt(parts[0]) || 0;
                        const sub  = parseInt(parts[1]) || 0;
                        return main * 100 + sub;
                    };
                    return parseNum(a.consecutivo) - parseNum(b.consecutivo);
                });
                this.loading = false;
            },
            error: () => { this.loading = false; }
        });
    }

    getRespuesta(idPregunta: string): string {
        const r = this.respuestas.find((r: any) =>
            r.idPregunta === idPregunta || r.idPregunta?._id === idPregunta
        );
        if (r) console.log('ENCONTRADA:', idPregunta, r.valorRta);
        return r?.valorRta || 'N/A';
    }

    get esCalzadaDoble(): boolean {
        return this.tramo?.calzada === 'Dos' || this.tramo?.calzada === 'Tres';
    }

    get mapUrl(): string {
        if (!this.tramo?.ubicacion?.coordinates?.length) return '';
        const coords = this.tramo.ubicacion.coordinates;
        const lat = coords[0][1];
        const lng = coords[0][0];
        const apiKey = '8f830486caea4be78d6e0e4fb95f1001';
        return `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=400&height=250&center=lonlat:${lng},${lat}&zoom=15&marker=lonlat:${lng},${lat};color:%23ff0000;size:medium&apiKey=${apiKey}`;
    }

    async generarQR() {
        if (!this.tramo) return;
        const datos = [
            `N° Encuesta: ${this.tramo._id?.slice(-8).toUpperCase()}`,
            `Depto: ${this.tramo.idJornada?.dpto || '—'}`,
            `Municipio: ${this.tramo.municipio || this.tramo.idJornada?.municipio || '—'}`,
            `Nomenclatura: ${this.tramo.nomenclatura?.completa || '—'}`,
            `Calzada: ${this.tramo.calzada || '—'}`,
            `ZAT: ${this.tramo.zat?.zatNumero || '—'}`,
            `Clas. Nacional: ${this.tramo.clasNacional || '—'}`,
            `Clas. Prelación: ${this.tramo.clasPrelacion || '—'}`,
            `Longitud: ${this.tramo.longitud_m || '—'} m`,
            `Ancho Total: ${this.tramo.anchoTotalPerfil || '—'} m`,
            `Diseño Geom.: ${this.tramo.disenioGeometrico || '—'}`,
            `Sentido Vial: ${this.tramo.sentidoVial || '—'}`
        ].join('\n');

        this.qrDataUrl = await QRCode.toDataURL(datos, {
            width: 120,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
        });
    }

    imprimir() { window.print(); }
    volver()   { window.history.back(); }
}