import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { SenVertService } from '../../../core/services/sen-vert.service';
import { SenHorService } from '../../../core/services/sen-hor.service';
import { SemaforoService } from '../../../core/services/semaforo.service';
import { ControlSemService } from '../../../core/services/control-sem.service';
import { CajaInspService } from '../../../core/services/caja-insp.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-reporte-via-tramo',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reporte-via-tramo.html',
    styleUrl: './reporte-via-tramo.scss'
})
export class ReporteViaTramoComponent implements OnInit {

    tramo:       any = null;
    senVerticales:   any[] = [];
    senHorizontales: any[] = [];
    semaforos:       any[] = [];
    controles:       any[] = [];
    cajas:           any[] = [];
    respuestas: any[] = [];
    preguntas:  any[] = [];
    
    loading = true;
    apiUrl  = environment.apiUrl;

    constructor(
        private route:           ActivatedRoute,
        private router:          Router,
        private viaTramoService: ViaTramoService,
        private senVertService:  SenVertService,
        private senHorService:   SenHorService,
        private semaforoService: SemaforoService,
        private api:             ApiService,
        private controlSemService: ControlSemService,
        private cajaInspService: CajaInspService
        
    ) {}

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) this.loadData(id);
    }

    loadData(id: string) {
        this.viaTramoService.getById(id).subscribe({
            next: (res: any) => {
                this.tramo = res.tramo;
                this.loadElementos(id);
            }
        });
    }

    loadElementos(idTramo: string) {
        // Cargar respuestas encuesta
            this.api.get<any>(`/encuesta-vial/tramo/${idTramo}`).subscribe({
                next: (res: any) => this.respuestas = res.respuestas || [],
                error: () => this.respuestas = []
            });

            // Cargar preguntas
            this.api.get<any>(`/encuesta-vial/preguntas`).subscribe({
                next: (res: any) => this.preguntas = res.preguntas || [],
                error: () => this.preguntas = []
            });
            // Cargar encuesta
            this.api.get<any>(`/encuesta-vial/tramo/${idTramo}`).subscribe({
                next: (res: any) => this.respuestas = res.respuestas || [],
                error: () => this.respuestas = []
            });
            this.api.get<any>(`/encuesta-vial/preguntas`).subscribe({
                next: (res: any) => this.preguntas = res.preguntas || [],
                error: () => this.preguntas = []
            });

            
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
                this.loading = false;
            }
        });

        // Cajas Inspección
        this.cajaInspService.getAll().subscribe({
            next: (res: any) => {
                this.cajas = res.registros.filter(
                    (r: any) => r.idViaTramo?._id === idTramo || r.idViaTramo === idTramo
                );
            }
        });
    }
    getRespuesta(idPregunta: string): string {
        const r = this.respuestas.find(r => 
            r.idPregunta === idPregunta || r.idPregunta?._id === idPregunta
        );
        return r?.valorRta || 'N/A';
    }

    get esCalzadaDoble(): boolean {
        return this.tramo?.calzada === 'Dos' || this.tramo?.calzada === 'Tres';
    }

    get coordLatitud(): string {
        if (!this.tramo?.ubicacion?.coordinates) return '—';
        const lat = this.tramo.ubicacion.coordinates[1][1];
        return lat ? `${lat.toFixed(6)}` : '—';
    }

    get mapUrl(): string {
        if (!this.tramo?.ubicacion?.coordinates?.length) return '';
        const coords = this.tramo.ubicacion.coordinates;
        const lat = coords[0][1];
        const lng = coords[0][0];
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.002},${lat-0.002},${lng+0.002},${lat+0.002}&layer=mapnik&marker=${lat},${lng}`;
    }

    imprimir() {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const container = document.querySelector('.reporte-container') as HTMLElement;
        if (!container) return;

        // Clonar el contenido
        const clone = container.cloneNode(true) as HTMLElement;

        // Obtener todas las imágenes y convertirlas a base64
        const images = Array.from(container.querySelectorAll('img'));
        const cloneImages = Array.from(clone.querySelectorAll('img'));

        const imagePromises = images.map((img, index) => {
            return new Promise<void>((resolve) => {
                if (!img.src || img.naturalWidth === 0) {
                    resolve();
                    return;
                }
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    try {
                        cloneImages[index].src = canvas.toDataURL('image/jpeg', 0.85);
                    } catch(e) {
                        cloneImages[index].src = img.src;
                    }
                }
                resolve();
            });
        });

        Promise.all(imagePromises).then(() => {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Reporte FE001 - ${this.tramo?.via || ''}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            background: #fff;
                            color: #000;
                            font-family: Arial, sans-serif;
                            font-size: 11px;
                        }
                        @page { size: A4; margin: 8mm; }
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                        .reporte-container {
                            width: 100%;
                            background: #fff;
                        }
                        /* Todos los estilos del reporte */
                        .reporte-header { display: grid; grid-template-columns: 80px 1fr 160px; gap: 0.5rem; align-items: center; border: 2px solid #000; padding: 0.5rem; margin-bottom: 0.5rem; background: #f8f8f8; }
                        .logo-reporte { width: 70px; height: auto; }
                        .header-titulo { text-align: center; }
                        .titulo-principal { font-size: 14px; font-weight: 800; text-transform: uppercase; }
                        .titulo-tipo { font-size: 12px; font-weight: 700; }
                        .header-numero { text-align: center; border: 2px solid #000; padding: 0.25rem 0.5rem; }
                        .numero-label { font-size: 9px; font-weight: 600; }
                        .numero-valor { font-size: 18px; font-weight: 800; font-family: monospace; }
                        .reporte-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; margin-bottom: 0.25rem; }
                        .reporte-row-3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.25rem; margin-bottom: 0.25rem; }
                        .reporte-row-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.25rem; margin-bottom: 0.5rem; }
                        .campo-reporte { border: 1px solid #000; padding: 0.2rem 0.4rem; }
                        .campo-label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #444; }
                        .campo-valor { font-size: 10px; font-weight: 600; color: #000; }
                        .campo-valor.highlight { background: #e0e8ff; padding: 0.1rem 0.3rem; font-weight: 800; }
                        .campo-valor-grande { font-size: 16px; font-weight: 800; text-transform: uppercase; }
                        .reporte-subheader { background: #f0f0f0; border: 1px solid #000; padding: 0.3rem; }
                        .esquema-mapa { margin: 0.5rem 0; gap: 0.5rem; }
                        .esquema-box, .mapa-box { border: 1px solid #000; }
                        .box-titulo { background: #000; color: #fff; font-size: 9px; font-weight: 700; text-align: center; padding: 0.2rem; text-transform: uppercase; }
                        .esquema-img-container, .mapa-container { height: 160px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                        .esquema-img { max-width: 100%; max-height: 158px; object-fit: contain; }
                        .mapa-iframe { width: 100%; height: 158px; border: none; }
                        .seccion-titulo { background: #000; color: #fff; font-size: 11px; font-weight: 800; text-align: center; padding: 0.3rem; text-transform: uppercase; margin: 0.5rem 0 0.25rem 0; }
                        .medidas-grid { display: grid; grid-template-columns: 1fr 1fr 0.8fr; gap: 0.5rem; margin: 0.25rem 0; }
                        .medida-item { display: flex; justify-content: space-between; align-items: center; border: 1px solid #ccc; padding: 0.15rem 0.4rem; background: #f8f8f8; margin-bottom: 2px; }
                        .medida-label { font-size: 8px; color: #333; font-style: italic; }
                        .medida-valor { font-size: 9px; font-weight: 700; min-width: 24px; text-align: right; border: 1px solid #000; padding: 0 3px; background: #fff; }
                        .medidas-pendiente { border: 1px solid #000; padding: 0.4rem; }
                        .pendiente-titulo { font-size: 8px; font-weight: 700; text-align: center; margin-bottom: 0.25rem; font-style: italic; }
                        .pendiente-resultado { background: #000; color: #fff; text-align: center; padding: 0.3rem; font-size: 9px; margin-top: 0.4rem; }
                        .pendiente-resultado strong { font-size: 14px; display: block; }
                        .totales-row { display: flex; justify-content: flex-end; margin-top: 0.25rem; }
                        .total-item { display: flex; gap: 0.5rem; border: 1px solid #000; padding: 0.2rem 0.5rem; font-size: 10px; }
                        .total-perfil { display: flex; justify-content: space-between; align-items: center; border: 2px solid #000; padding: 0.3rem 0.5rem; margin-top: 0.25rem; background: #f0f0f0; }
                        .total-perfil-label { font-size: 12px; font-weight: 800; font-style: italic; }
                        .total-perfil-valor { font-size: 16px; font-weight: 800; }
                        .fotos-reporte { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; border: 1px solid #000; padding: 0.25rem; }
                        .foto-reporte-item { text-align: center; }
                        .foto-reporte-label { background: #e0e0e0; font-size: 8px; font-weight: 700; padding: 0.15rem; text-transform: uppercase; margin-bottom: 0.25rem; }
                        .foto-reporte-img { width: 100%; height: 100px; object-fit: cover; border: 1px solid #ccc; }
                        .foto-reporte-placeholder { height: 100px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #999; font-size: 9px; border: 1px dashed #ccc; }
                        .caracteristicas-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
                        .caract-grupo { border: 1px solid #000; padding: 0.4rem; }
                        .caract-grupo-titulo { font-size: 9px; font-weight: 700; font-style: italic; margin-bottom: 0.3rem; border-bottom: 1px solid #ccc; padding-bottom: 0.2rem; }
                        .caract-item { display: flex; justify-content: space-between; padding: 0.1rem 0; border-bottom: 1px solid #eee; font-size: 9px; }
                        .caract-label { color: #333; font-style: italic; }
                        .caract-valor { font-weight: 700; }
                        .obs-grid { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.25rem; }
                        .obs-item { border: 1px solid #000; padding: 0.3rem 0.5rem; font-size: 10px; min-height: 22px; }
                        .tabla-reporte { width: 100%; border-collapse: collapse; font-size: 9px; margin-top: 0.25rem; }
                        .tabla-reporte th { background: #000; color: #fff; padding: 0.3rem 0.4rem; text-align: left; font-size: 8px; text-transform: uppercase; }
                        .tabla-reporte td { border: 1px solid #ccc; padding: 0.25rem 0.4rem; vertical-align: middle; }
                        .tabla-reporte tbody tr:nth-child(even) { background: #f8f8f8; }
                        .foto-tabla { width: 50px; height: 40px; object-fit: cover; border: 1px solid #ccc; }
                    </style>
                </head>
                <body>
                    ${clone.outerHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 1500);
        });
    }

        volver()   { window.history.back(); }
}