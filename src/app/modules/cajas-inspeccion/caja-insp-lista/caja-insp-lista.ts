import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CajaInspService } from '../../../core/services/caja-insp.service';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';
import {
    geoDepartamentos,
    geoMunicipios,
    geoZatOptions,
    matchesGeoFilters,
    nomenclaturaSearchText,
    textBlobMatchesQuery,
    filterListByExactMongoId,
    rowMongoIdString,
    sortListByMongoIdPrefix,
    rowDepartamento,
    rowMunicipio,
    rowZatLabel,
    rowZatValue,
    badgeClassDepartamento,
    badgeClassMunicipio,
    badgeClassZat
} from '../../../shared/utils/geo-list-filters';
import {
    applyTableSort,
    type TableSortDirection
} from '../../../shared/utils/table-sort';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';
import { ListaValorBadgeClassPipe } from '../../../shared/pipes/lista-valor-badge-class.pipe';

@Component({
    selector: 'app-caja-insp-lista',
    standalone: true,
    imports: [CommonModule, FormsModule, ListaValorBadgeClassPipe],
    templateUrl: './caja-insp-lista.html',
    styleUrls: ['./caja-insp-lista.scss', '../../../shared/styles/geo-badges.scss', '../../../shared/styles/lista-valor-badges.scss']
})
export class CajaInspListaComponent implements OnInit {

    registros: any[]   = [];
    loading:   boolean = true;
    error:     string  = '';
    jornada:   any     = null;
    busqueda:  string  = '';
    filtroId = '';
    filtroDepartamento = '';
    filtroMunicipio = '';
    filtroZat = '';
    pageSize:  number  = 30;
    currentPage: number = 1;

    sortColumn: string | null = null;
    sortDir: TableSortDirection = 'asc';

    constructor(
        private cajaInspService: CajaInspService,
        private jornadaService:  JornadaService,
        private confirmDialog:   ConfirmDialogService,
        public  authService:     AuthService,
        public  router:          Router
    ) {}

    ngOnInit() {
        this.loadJornada();
        this.loadRegistros();
    }

    loadJornada() {
        this.jornadaService.getActiva().subscribe({
            next: (res) => this.jornada = res.jornada,
            error: ()   => this.jornada = null
        });
    }

    loadRegistros() {
        this.loading = true;
        this.cajaInspService.getAll().subscribe({
            next: (res) => {
                this.registros = res.registros;
                this.loading   = false;
            },
            error: () => {
                this.error   = 'Error al cargar cajas de inspección';
                this.loading = false;
            }
        });
    }

    get registrosFiltrados() {
        const base = this.registros.filter((r) =>
            matchesGeoFilters(
                r,
                this.filtroDepartamento,
                this.filtroMunicipio,
                this.filtroZat
            )
        );

        const exact = filterListByExactMongoId(
            base,
            this.busqueda,
            this.filtroId
        );
        if (exact) return exact;

        const qRaw = this.busqueda.trim();
        const list = base.filter((r) => {
            const z = rowZatLabel(r);
            const blob = [
                rowMongoIdString(r),
                r.idViaTramo?.via,
                r.idViaTramo?.tipoUbic,
                r.idViaTramo?.municipio,
                r.idViaTramo?.departamento,
                nomenclaturaSearchText(r),
                r.materialCaja,
                r.estadoCaja,
                r.fase,
                z !== '—' ? z : ''
            ].join(' ');
            return textBlobMatchesQuery(blob, qRaw);
        });
        return sortListByMongoIdPrefix(list, this.filtroId);
    }

    get departamentosDisponibles(): string[] {
        return geoDepartamentos(this.registros);
    }

    get municipiosDisponibles(): string[] {
        return geoMunicipios(this.registros, this.filtroDepartamento);
    }

    get zatsDisponibles(): Array<{ value: string; label: string }> {
        return geoZatOptions(this.registros, this.filtroDepartamento, this.filtroMunicipio);
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

    depTxt(r: any): string { return rowDepartamento(r) || '—'; }
    munTxt(r: any): string { return rowMunicipio(r) || '—'; }
    zatTxt(r: any): string {
        const t = rowZatLabel(r);
        return t === '—' && !rowZatValue(r) ? '—' : t;
    }
    depBadge(r: any): string { return badgeClassDepartamento(rowDepartamento(r)); }
    munBadge(r: any): string { return badgeClassMunicipio(rowMunicipio(r)); }
    zatBadge(r: any): string {
        return badgeClassZat(rowZatValue(r) || rowZatLabel(r) || '—');
    }

    get totalPages(): number {
        return Math.ceil(this.registrosFiltrados.length / this.pageSize) || 1;
    }

    get registrosOrdenados() {
        return applyTableSort(
            this.registrosFiltrados,
            this.sortColumn,
            this.sortDir,
            (r, c) => this.valorOrden(r, c)
        );
    }

    get registrosPaginados() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.registrosOrdenados.slice(start, start + this.pageSize);
    }

    private valorOrden(r: any, c: string): unknown {
        switch (c) {
            case 'id':
                return rowMongoIdString(r);
            case 'departamento':
                return this.depTxt(r);
            case 'municipio':
                return this.munTxt(r);
            case 'zat':
                return this.zatTxt(r);
            case 'viaTramo':
                return r.idViaTramo?.nomenclatura?.completa || r.idViaTramo?.via || '';
            case 'diseno':
                return r.idViaTramo?.tipoUbic ?? '';
            case 'material':
                return r.materialCaja ?? '';
            case 'estado':
                return r.estadoCaja ?? '';
            case 'tapa':
                return r.tapa === true ? 1 : r.tapa === false ? 0 : '';
            case 'estadoTapa':
                return r.estadoTapa ?? '';
            case 'fase':
                return r.fase ?? '';
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

    get sortSelectValue(): string {
        return this.sortColumn ?? '';
    }

    onOrdenSelect(value: string) {
        this.sortColumn = value === '' ? null : value;
        this.currentPage = 1;
    }

    limpiarFiltrosLista() {
        this.busqueda = '';
        this.filtroId = '';
        this.filtroDepartamento = '';
        this.filtroMunicipio = '';
        this.filtroZat = '';
        this.currentPage = 1;
    }

    nuevo()            { this.router.navigate(['/cajas-inspeccion/nuevo']); }
    editar(id: string) { this.router.navigate(['/cajas-inspeccion/editar', id]); }
    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string) {
        this.confirmDialog
            .confirm({
                title: '¿Eliminar esta caja de inspección?',
                message:
                    'Se quitará del inventario. Esta acción no se puede deshacer.',
                confirmText: 'Sí, eliminar',
                cancelText: 'Cancelar',
                variant: 'danger',
                icon: 'delete'
            })
            .subscribe((ok) => {
                if (!ok) return;
                this.cajaInspService.delete(id).subscribe({
                    next: () => this.loadRegistros(),
                    error: (err) =>
                        alert(err.error?.message || 'Error al eliminar')
                });
            });
    }
}

