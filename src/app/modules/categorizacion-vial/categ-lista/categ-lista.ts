import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
    CategorizacionVialService,
    CategorizacionVial
} from '../../../core/services/categorizacion-vial.service';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';
import {
    geoDepartamentos,
    geoMunicipios,
    matchesGeoFilters,
    textBlobMatchesQuery,
    filterListByExactMongoId,
    rowMongoIdString,
    sortListByMongoIdPrefix
} from '../../../shared/utils/geo-list-filters';
import {
    openGoogleStreetView
} from '../../../shared/utils/street-view';
import {
    applyTableSort,
    type TableSortDirection
} from '../../../shared/utils/table-sort';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

const FETCH_LIMIT = 10000;

@Component({
    selector: 'app-categ-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './categ-lista.html',
    styleUrls: [
        '../../../shared/styles/lista-object-id-column.scss',
        './categ-lista.scss',
        '../../../shared/styles/street-view-list-btn.scss'
    ]
})
export class CategListaComponent implements OnInit {

    registros: CategorizacionVial[] = [];
    loading   = true;
    error     = '';
    jornada:  any = null;

    busqueda = '';
    /** ObjectId completo o prefijo 4+ hex (prioridad en orden). */
    filtroId = '';
    filtroDepartamento = '';
    filtroMunicipio    = '';
    /** Valor de clasificación o vacío = todas */
    filtroClasif = '';

    pageSize     = 30;
    currentPage  = 1;

    sortColumn: string | null = null;
    sortDir: TableSortDirection = 'asc';

    readonly CLASIFICACIONES = ['PRIMARIA', 'SECUNDARIA', 'TERCIARIA'] as const;

    constructor(
        private svc: CategorizacionVialService,
        private jornadaService: JornadaService,
        private confirmDialog: ConfirmDialogService,
        public  authService: AuthService,
        public  router: Router
    ) {}

    ngOnInit(): void {
        this.loadJornada();
        this.cargar();
    }

    loadJornada(): void {
        this.jornadaService.getActiva().subscribe({
            next: (res) => (this.jornada = res.jornada),
            error: () => (this.jornada = null)
        });
    }

    cargar(): void {
        this.loading = true;
        this.error   = '';
        this.svc.getAll({ page: 1, limit: FETCH_LIMIT }).subscribe({
            next: (res) => {
                this.registros = res.datos ?? [];
                this.loading   = false;
            },
            error: () => {
                this.error   = 'Error al cargar las categorizaciones';
                this.loading = false;
            }
        });
    }

    get registrosFiltrados(): CategorizacionVial[] {
        const fc = this.filtroClasif.trim();
        const base = this.registros.filter((r) => {
            if (!matchesGeoFilters(r, this.filtroDepartamento, this.filtroMunicipio, '')) {
                return false;
            }
            if (fc && (r.clasificacion || '') !== fc) return false;
            return true;
        });

        const exact = filterListByExactMongoId(
            base,
            this.busqueda,
            this.filtroId
        );
        if (exact) return exact;

        const qRaw = this.busqueda.trim();
        const list = base.filter((r) => {
            const blob = [
                rowMongoIdString(r),
                r.nombreVia,
                r.departamento,
                r.municipio,
                r.nombreFuncionario,
                r.entidadFuncionario,
                r.codigoPR,
                r.clasificacion,
                this.labelClasif(r.clasificacion),
                r.observaciones
            ].join(' ');
            return textBlobMatchesQuery(blob, qRaw);
        });
        return sortListByMongoIdPrefix(list, this.filtroId);
    }

    get countPrimaria():   number { return this.registros.filter(r => r.clasificacion === 'PRIMARIA').length; }
    get countSecundaria(): number { return this.registros.filter(r => r.clasificacion === 'SECUNDARIA').length; }
    get countTerciaria():  number { return this.registros.filter(r => r.clasificacion === 'TERCIARIA').length; }

    /** Porcentaje para la barra de longitud (relativo al máximo del conjunto filtrado). */
    lonBarPct(r: CategorizacionVial): number {
        const maxKm = Math.max(...this.registrosPaginados.map(x => x.longitud_km ?? 0), 1);
        return Math.min(((r.longitud_km ?? 0) / maxKm) * 100, 100);
    }

    get departamentosDisponibles(): string[] {
        return geoDepartamentos(this.registros);
    }

    get municipiosDisponibles(): string[] {
        return geoMunicipios(this.registros, this.filtroDepartamento);
    }

    get totalPages(): number {
        return Math.ceil(this.registrosFiltrados.length / this.pageSize) || 1;
    }

    get registrosOrdenados(): CategorizacionVial[] {
        return applyTableSort(
            this.registrosFiltrados,
            this.sortColumn,
            this.sortDir,
            (r, c) => this.valorOrden(r, c)
        );
    }

    get registrosPaginados(): CategorizacionVial[] {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.registrosOrdenados.slice(start, start + this.pageSize);
    }

    ordenarPor(col: string): void {
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

    private valorOrden(r: CategorizacionVial, c: string): unknown {
        switch (c) {
            case 'id':
                return rowMongoIdString(r);
            case 'via':
                return r.nombreVia ?? '';
            case 'departamento':
                return r.departamento ?? '';
            case 'municipio':
                return r.municipio ?? '';
            case 'longKm':
                return r.longitud_km ?? '';
            case 'geoM':
                return r.longitud_tramo_m ?? '';
            case 'clasif':
                return r.clasificacion ?? '';
            case 'fechaClasif':
                return r.fechaClasificacion ?? '';
            case 'funcionario':
                return r.nombreFuncionario ?? '';
            case 'entidad':
                return r.entidadFuncionario ?? '';
            case 'pts':
                return r.ptsPrimerOrden ?? '';
            case 'fechaCreacion':
                return r.fechaCreacion ?? '';
            default:
                return '';
        }
    }

    cambiarPageSize(size: number): void {
        this.pageSize = size;
        this.currentPage = 1;
    }

    paginaAnterior(): void {
        if (this.currentPage > 1) this.currentPage--;
    }

    paginaSiguiente(): void {
        if (this.currentPage < this.totalPages) this.currentPage++;
    }

    onBusquedaChange(): void {
        this.currentPage = 1;
    }

    onFiltroIdChange(): void {
        this.currentPage = 1;
    }

    onDepartamentoChange(): void {
        this.filtroMunicipio = '';
        this.currentPage = 1;
    }

    onMunicipioChange(): void {
        this.currentPage = 1;
    }

    onClasifChange(): void {
        this.currentPage = 1;
    }

    nuevo(): void {
        this.router.navigate(['/categorizacion-vial/nueva']);
    }

    editar(id: string | undefined): void {
        if (!id) return;
        this.router.navigate(['/categorizacion-vial/editar', id]);
    }

    eliminar(id: string | undefined): void {
        if (!id) return;
        this.confirmDialog
            .confirm({
                title: '¿Eliminar esta categorización?',
                message:
                    'El registro se quitará del inventario. Esta acción no se puede deshacer.',
                confirmText: 'Sí, eliminar',
                cancelText: 'Cancelar',
                variant: 'danger',
                icon: 'delete'
            })
            .subscribe((ok) => {
                if (!ok) return;
                this.svc.remove(id).subscribe({
                    next: () => this.cargar(),
                    error: (err) =>
                        alert(err.error?.message || 'Error al eliminar')
                });
            });
    }

    isAdmin(): boolean {
        return this.authService.isAdmin();
    }

    isSupervisor(): boolean {
        return this.authService.isSupervisor();
    }

    depTxt(r: CategorizacionVial): string {
        return (r.departamento || '').trim() || '—';
    }

    munTxt(r: CategorizacionVial): string {
        return (r.municipio || '').trim() || '—';
    }

    badgeClasif(clasif: string | undefined): string {
        if (clasif === 'PRIMARIA') return 'badge-primaria';
        if (clasif === 'SECUNDARIA') return 'badge-secundaria';
        return 'badge-terciaria';
    }

    labelClasif(clasif: string | undefined): string {
        if (!clasif) return '';
        if (clasif === 'PRIMARIA') return '1er Orden — Primaria';
        if (clasif === 'SECUNDARIA') return '2do Orden — Secundaria';
        return '3er Orden — Terciaria';
    }

    /** Street View en el punto de inicio del tramo (mismo criterio que otras listas). */
    tieneStreetView(r: CategorizacionVial): boolean {
        const lat = r.lat_inicio;
        const lng = r.lng_inicio;
        return (
            lat != null &&
            lng != null &&
            Number.isFinite(Number(lat)) &&
            Number.isFinite(Number(lng))
        );
    }

    abrirStreetView(r: CategorizacionVial): void {
        const lat = Number(r.lat_inicio);
        const lng = Number(r.lng_inicio);
        openGoogleStreetView({
            type: 'Point',
            coordinates: [lng, lat]
        });
    }
}
