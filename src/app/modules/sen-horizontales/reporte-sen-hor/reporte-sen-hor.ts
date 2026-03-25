import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as QRCode from 'qrcode';
import { environment } from '../../../../environments/environment';
import { SenHorService } from '../../../core/services/sen-hor.service';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { CatalogoService } from '../../../core/services/catalogo.service';

@Component({
    selector: 'app-reporte-sen-hor',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reporte-sen-hor.html',
    styleUrl: './reporte-sen-hor.scss'
})
export class ReporteSenHorComponent implements OnInit {
    loading = true;
    registro: any = null;
    tramo: any = null;
    referenciaDem: any = null;
    qrDataUrl = '';
    apiUrl = environment.apiUrl;

    constructor(
        private route: ActivatedRoute,
        private senHorService: SenHorService,
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
        this.senHorService.getById(id).subscribe({
            next: (res: any) => {
                this.registro = res.registro;
                this.loadReferenciaDemarcacion();
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

    loadReferenciaDemarcacion() {
        if (!this.registro?.codSeHor) return;
        this.catalogoService.getDemarcaciones().subscribe({
            next: (res: any) => {
                const lista = res?.datos || [];
                this.referenciaDem = lista.find((d: any) => d.codDem === this.registro.codSeHor) || null;
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
            `Codigo Senal: ${this.registro?.codSeHor || 'N/A'}`,
            `Estado: ${this.registro?.estadoDem || 'N/A'}`,
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
