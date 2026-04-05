import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
    filterListByExactMongoId,
    rowMongoIdString,
    sortListByMongoIdPrefix,
    badgeClassMunicipio,
    badgeClassZat,
    badgeClassVia
} from '../../../shared/utils/geo-list-filters';
import {
    hasStreetViewCoords,
    openGoogleStreetView
} from '../../../shared/utils/street-view';
import {
    applyTableSort,
    type TableSortDirection
} from '../../../shared/utils/table-sort';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
    selector: 'app-via-tramo-lista',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './via-tramo-lista.html',
    styleUrls: ['./via-tramo-lista.scss', '../../../shared/styles/geo-badges.scss']
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

    /** Ordenación por cabecera (null = orden por defecto del filtro). */
    sortColumn: string | null = null;
    sortDir: TableSortDirection = 'asc';

    constructor(
        private viaTramoService: ViaTramoService,
        private jornadaService:  JornadaService,
        private confirmDialog:   ConfirmDialogService,
        public  authService:     AuthService,
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

        const exact = filterListByExactMongoId(
            base,
            this.busqueda,
            this.filtroIdTramo
        );
        if (exact) return exact;

        const qRaw = this.busqueda.trim();
        const list = base.filter((t) => {
            const zatL = rowZatLabel(t);
            const blob = [
                t.via,
                t.municipio,
                t.departamento,
                t.tipoVia,
                t.sector,
                t.zona,
                t.tipoUbic,
                t.sentidoVial,
                nomenclaturaSearchText(t),
                zatL !== '—' ? zatL : '',
                rowMongoIdString(t)
            ].join(' ');
            return textBlobMatchesQuery(blob, qRaw);
        });

        return sortListByMongoIdPrefix(list, this.filtroIdTramo);
    }

    get totalPages(): number {
        return Math.ceil(this.tramosFiltrados.length / this.pageSize) || 1;
    }

    get tramosOrdenados(): any[] {
        return applyTableSort(
            this.tramosFiltrados,
            this.sortColumn,
            this.sortDir,
            (t, c) => this.valorOrdenTramo(t, c)
        );
    }

    get tramosPaginados() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.tramosOrdenados.slice(start, start + this.pageSize);
    }

    ordenarPor(col: string) {
        if (this.sortColumn === col) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = col;
            this.sortDir = 'asc';
        }
        this.currentPage = 1;
    }

    sortIndicador(col: string): string {
        if (this.sortColumn !== col) return '';
        return this.sortDir === 'asc' ? ' ↑' : ' ↓';
    }

    private valorOrdenTramo(t: any, c: string): unknown {
        switch (c) {
            case 'id':
                return rowMongoIdString(t);
            case 'via':
                return t.via ?? '';
            case 'nomenclatura':
                return t.nomenclatura?.completa ?? '';
            case 'municipio':
                return t.municipio ?? '';
            case 'zat':
                return this.zatTxt(t);
            case 'calzada':
                return t.calzada ?? '';
            case 'diseno':
                return t.tipoUbic ?? '';
            case 'tipoVia':
                return t.tipoVia ?? '';
            case 'estado':
                return t.estadoVia ?? '';
            case 'clasNacional':
                return t.clasNacional ?? '';
            case 'fecha':
                return t.fechaCreacion ?? '';
            default:
                return '';
        }
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

    /** Valor del `<select>` de ordenación (`''` = orden por defecto del backend / tabla). */
    get sortSelectValue(): string {
        return this.sortColumn ?? '';
    }

    onOrdenSelect(value: string) {
        this.sortColumn = value === '' ? null : value;
        this.currentPage = 1;
    }

    /** Clic en la tarjeta: mismo destino que “ver” inventario por capas (estilo SINC → detalle). */
    abrirDesdeCard(id: string) {
        this.inventario(id);
    }

    limpiarFiltrosLista() {
        this.busqueda = '';
        this.filtroIdTramo = '';
        this.filtroDepartamento = '';
        this.filtroMunicipio = '';
        this.filtroZat = '';
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

    /** Pill de clasificación nacional: color por V1…V9. */
    badgeClasNacionalClass(t: any): string {
        const raw = (t?.clasNacional ?? '').toString().trim();
        if (!raw) return 'badge-cn-empty';
        const m = /^V\s*([1-9])$/i.exec(raw.replace(/\s+/g, ''));
        if (m) return `badge-cn-v${m[1]}`;
        return 'badge-cn-unknown';
    }

    nuevo()          { this.router.navigate(['/via-tramos/nuevo']); }
    editar(id: string) { this.router.navigate(['/via-tramos/editar', id]); }
    inventario(id: string) {
        this.router.navigate(['/via-tramos', id, 'inventario']);
    }
    isAdmin():    boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }
    puedeVerEstadisticas(): boolean {
        return this.authService.isAdmin() || this.authService.isSupervisor();
    }

    eliminar(id: string, via: string) {
        this.confirmDialog
            .confirm({
                title: '¿Eliminar este tramo?',
                message: `Se eliminará el tramo «${via}» del inventario. Esta acción no se puede deshacer.`,
                confirmText: 'Sí, eliminar',
                cancelText: 'Cancelar',
                variant: 'danger',
                icon: 'delete'
            })
            .subscribe((ok) => {
                if (!ok) return;
                this.viaTramoService.delete(id).subscribe({
                    next: () => this.loadTramos(),
                    error: (err) =>
                        alert(err.error?.message || 'Error al eliminar')
                });
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
