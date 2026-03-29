import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { FormsModule } from '@angular/forms';
import {
    geoDepartamentos,
    geoMunicipios,
    geoZatOptions,
    matchesGeoFilters,
    nomenclaturaSearchText,
    rowZatLabel,
    rowZatValue,
    textBlobMatchesQuery,
    extractMongoObjectId,
    badgeClassMunicipio,
    badgeClassZat,
    badgeClassVia
} from '../../../shared/utils/geo-list-filters';
import {
    hasStreetViewCoords,
    openGoogleStreetView
} from '../../../shared/utils/street-view';
@Component({
    selector: 'app-via-tramo-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './via-tramo-lista.html',
    styleUrls: [
        './via-tramo-lista.scss',
        '../../../shared/styles/geo-badges.scss',
        '../../../shared/styles/street-view-list-btn.scss'
    ]
})
export class ViaTramoListaComponent implements OnInit {

    tramos:   any[]  = [];
    loading:  boolean = true;
    error:    string  = '';
    jornada:  any     = null;
    busqueda: string  = '';
    /** Fragmento del _id de MongoDB; las coincidencias suben al inicio de la lista. */
    filtroIdTramo = '';
    filtroDepartamento: string = '';
    filtroMunicipio: string = '';
    filtroZat: string = '';
    pageSize: number  = 30;
    currentPage: number = 1;

    constructor(
        private viaTramoService: ViaTramoService,
        private jornadaService:  JornadaService,
        private authService:     AuthService,
        public  router:          Router
    ) {}

    ngOnInit() {
        this.loadJornada();
        this.loadTramos();
    }

    loadJornada() {
        this.jornadaService.getActiva().subscribe({
            next: (res) => this.jornada = res.jornada,
            error: ()   => this.jornada = null
        });
    }

    loadTramos() {
        this.loading = true;
        this.viaTramoService.getAll().subscribe({
            next: (res) => {
                this.tramos  = res.tramos;
                this.loading = false;
            },
            error: () => {
                this.error   = 'Error al cargar tramos';
                this.loading = false;
            }
        });
    }

    get tramosFiltrados(): any[] {
        const base = this.tramos.filter(t =>
            matchesGeoFilters(t, this.filtroDepartamento, this.filtroMunicipio, this.filtroZat)
        );

        /** Prioridad: campo ID; si no, texto general (pegar ObjectId desde Compass). */
        const idExact =
            extractMongoObjectId(this.filtroIdTramo) ||
            extractMongoObjectId(this.busqueda);

        if (idExact) {
            const hit = base.find(
                t => (t._id ?? '').toString().toLowerCase() === idExact
            );
            return hit ? [hit] : [];
        }

        const qRaw = this.busqueda.trim();
        let list = base.filter(t => {
            const zatL = rowZatLabel(t);
            const blob = [
                t.via,
                t.municipio,
                t.departamento,
                nomenclaturaSearchText(t),
                zatL !== '—' ? zatL : '',
                (t._id ?? '').toString()
            ].join(' ');
            return textBlobMatchesQuery(blob, qRaw);
        });

        const idQ = this.filtroIdTramo.trim().toLowerCase().replace(/[\s\r\n\u00a0]+/g, '');
        if (idQ.length < 4) {
            return list;
        }

        const matches = list.filter(t => (t._id ?? '').toString().toLowerCase().includes(idQ));
        const others = list.filter(t => !(t._id ?? '').toString().toLowerCase().includes(idQ));

        const rankId = (id: string | undefined): number => {
            const x = (id ?? '').toString().toLowerCase();
            if (x === idQ) return 0;
            if (x.startsWith(idQ)) return 1;
            return 2;
        };
        matches.sort(
            (a, b) =>
                rankId(a._id) - rankId(b._id) ||
                (a._id ?? '').toString().localeCompare((b._id ?? '').toString())
        );

        return [...matches, ...others];
    }

    get totalPages(): number {
        return Math.ceil(this.tramosFiltrados.length / this.pageSize) || 1;
    }

    get tramosPaginados() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.tramosFiltrados.slice(start, start + this.pageSize);
    }

    cambiarPageSize(size: number) {
        this.pageSize = size;
        this.currentPage = 1;
    }

    paginaAnterior() {
        if (this.currentPage > 1) this.currentPage--;
    }

    paginaSiguiente() {
        if (this.currentPage < this.totalPages) this.currentPage++;
    }

    onBusquedaChange() {
        this.currentPage = 1;
    }

    onFiltroIdChange() {
        this.currentPage = 1;
    }

    get departamentosDisponibles(): string[] {
        return geoDepartamentos(this.tramos);
    }

    get municipiosDisponibles(): string[] {
        return geoMunicipios(this.tramos, this.filtroDepartamento);
    }

    get zatsDisponibles(): Array<{ value: string; label: string }> {
        return geoZatOptions(this.tramos, this.filtroDepartamento, this.filtroMunicipio);
    }

    onDepartamentoChange() {
        this.filtroMunicipio = '';
        this.filtroZat = '';
        this.currentPage = 1;
    }

    onMunicipioChange() {
        this.filtroZat = '';
        this.currentPage = 1;
    }

    onZatChange() {
        this.currentPage = 1;
    }

    viaBadge(t: any): string {
        return badgeClassVia(t.via);
    }

    munBadge(t: any): string {
        return badgeClassMunicipio(t.municipio);
    }

    zatTxt(t: any): string {
        const x = rowZatLabel(t);
        return x === '—' && !rowZatValue(t) ? '—' : x;
    }

    zatBadge(t: any): string {
        return badgeClassZat(rowZatValue(t) || rowZatLabel(t) || '—');
    }

    nuevo()          { this.router.navigate(['/via-tramos/nuevo']); }
    editar(id: string) { this.router.navigate(['/via-tramos/editar', id]); }
    isAdmin():    boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string, via: string) {
        if (!confirm(`¿Eliminar el tramo "${via}"?`)) return;
        this.viaTramoService.delete(id).subscribe({
            next: () => this.loadTramos(),
            error: (err) => alert(err.error?.message || 'Error al eliminar')
        });
    }
    generarReporte(id: string) {
        this.router.navigate(['/via-tramos/reporte', id]);
    }

    tieneStreetView(t: any): boolean {
        return hasStreetViewCoords(t?.ubicacion);
    }

    abrirStreetView(t: any): void {
        openGoogleStreetView(t?.ubicacion);
    }
}
