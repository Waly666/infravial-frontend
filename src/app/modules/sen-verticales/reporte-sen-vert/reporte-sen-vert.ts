import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { environment } from '../../../../environments/environment';
import { SenVertService } from '../../../core/services/sen-vert.service';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { CatalogoService } from '../../../core/services/catalogo.service';

@Component({
    selector: 'app-reporte-sen-vert',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reporte-sen-vert.html',
    styleUrl: './reporte-sen-vert.scss'
})
export class ReporteSenVertComponent implements OnInit {
    loading = true;
    registro: any = null;
    tramo: any = null;
    referenciaSenal: any = null;
    qrDataUrl = '';
    apiUrl = environment.apiUrl;

    constructor(
        private route: ActivatedRoute,
        private senVertService: SenVertService,
        private viaTramoService: ViaTramoService,
        private catalogoService: CatalogoService
    ) {}

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.loading = false;
            return;
        }
        this.loadData(id);
    }

    loadData(id: string) {
        this.senVertService.getById(id).subscribe({
            next: (res: any) => {
                this.registro = res.registro;
                this.loadReferenciaSenal();
                const idTramo = this.registro?.idViaTramo?._id || this.registro?.idViaTramo;
                if (!idTramo) {
                    this.generarQR();
                    this.loading = false;
                    return;
                }
                this.viaTramoService.getById(idTramo).subscribe({
                    next: (tr: any) => {
                        this.tramo = tr.tramo;
                        this.generarQR();
                        this.loading = false;
                    },
                    error: () => {
                        this.generarQR();
                        this.loading = false;
                    }
                });
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    loadReferenciaSenal() {
        if (!this.registro?.codSe) return;
        this.catalogoService.getSenVertscat().subscribe({
            next: (res: any) => {
                const lista = res?.datos || [];
                this.referenciaSenal = lista.find((s: any) => s.codSenVert === this.registro.codSe) || null;
            }
        });
    }

    get coordenadasTexto(): string {
        const coords = this.registro?.ubicacion?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return 'N/A';
        return `${coords[1]}, ${coords[0]}`;
    }

    get nomenclatura(): string {
        return this.tramo?.nomenclatura?.completa || this.registro?.idViaTramo?.nomenclatura?.completa || 'N/A';
    }

    get municipio(): string {
        return this.tramo?.municipio || this.registro?.idViaTramo?.municipio || 'N/A';
    }

    get zat(): string {
        return this.tramo?.zat?.zatNumero || 'N/A';
    }

    async generarQR() {
        if (!this.registro) return;
        const datos = [
            `Nomenclatura: ${this.nomenclatura}`,
            `Municipio: ${this.municipio}`,
            `ZAT: ${this.zat}`,
            `Coordenadas: ${this.coordenadasTexto}`,
            `Codigo Senal: ${this.registro?.codSe || 'N/A'}`,
            `Estado: ${this.registro?.estado || 'N/A'}`,
            `Fase: ${this.registro?.fase || 'N/A'}`,
            `Accion: ${this.registro?.accion || 'N/A'}`
        ].join('\n');

        this.qrDataUrl = await QRCode.toDataURL(datos, {
            width: 120,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
        });
    }

    imprimir() { window.print(); }
    volver() { window.history.back(); }
}
