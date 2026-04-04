import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { SenVertService } from "../../../core/services/sen-vert.service";
import { AuthService } from "../../../core/services/auth.service";
import { JornadaService } from "../../../core/services/jornada.service";
import {
    geoDepartamentos,
    geoMunicipios,
    geoZatOptions,
    matchesGeoFilters,
    nomenclaturaSearchText,
    rowDepartamento,
    rowMunicipio,
    rowZatLabel,
    rowZatValue,
    textBlobMatchesQuery,
    filterListByExactMongoId,
    rowMongoIdString,
    sortListByMongoIdPrefix,
    badgeClassDepartamento,
    badgeClassMunicipio,
    badgeClassZat
} from "../../../shared/utils/geo-list-filters";
import {
    hasStreetViewCoords,
    openGoogleStreetView
} from "../../../shared/utils/street-view";
import {
    applyTableSort,
    type TableSortDirection
} from "../../../shared/utils/table-sort";
import { ListaValorBadgeClassPipe } from "../../../shared/pipes/lista-valor-badge-class.pipe";
import { ConfirmDialogService } from "../../../shared/services/confirm-dialog.service";

@Component({
    selector: "app-sen-vert-lista",
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ListaValorBadgeClassPipe],
    templateUrl: "./sen-vert-lista.html",
    styleUrls: [
        "../../../shared/styles/lista-object-id-column.scss",
        "./sen-vert-lista.scss",
        "../../../shared/styles/geo-badges.scss",
        "../../../shared/styles/street-view-list-btn.scss"
    ]
})
export class SenVertListaComponent implements OnInit {

    registros: any[]   = [];
    loading:   boolean = true;
    error:     string  = "";
    jornada:   any     = null;
    busqueda:  string  = "";
    /** ObjectId completo o prefijo 4+ hex (prioridad en orden). */
    filtroId = "";
    filtroDepartamento = "";
    filtroMunicipio = "";
    filtroZat = "";
    /** Código de señal (codSe), exacto; opciones según filtros geo. */
    filtroCodigo = "";
    pageSize:  number  = 30;
    currentPage: number = 1;

    sortColumn: string | null = null;
    sortDir: TableSortDirection = "asc";

    constructor(
        private senVertService: SenVertService,
        private jornadaService: JornadaService,
        private confirmDialog:  ConfirmDialogService,
        public  authService:    AuthService,
        public  router:         Router
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
        this.senVertService.getAll().subscribe({
            next: (res) => {
                this.registros = res.registros;
                this.loading   = false;
            },
            error: () => {
                this.error   = "Error al cargar señales verticales";
                this.loading = false;
            }
        });
    }

    get registrosFiltrados() {
        const fc = this.filtroCodigo.trim();
        const base = this.registros.filter((r) => {
            if (
                !matchesGeoFilters(
                    r,
                    this.filtroDepartamento,
                    this.filtroMunicipio,
                    this.filtroZat
                )
            ) {
                return false;
            }
            if (fc && (r.codSe || "").trim() !== fc) return false;
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
            const z = rowZatLabel(r);
            const blob = [
                rowMongoIdString(r),
                r.codSe,
                r.estado,
                r.fase,
                r.accion,
                r.matPlaca,
                r.idViaTramo?.via,
                r.idViaTramo?.tipoUbic,
                r.idViaTramo?.municipio,
                r.idViaTramo?.departamento,
                nomenclaturaSearchText(r),
                z !== "—" ? z : ""
            ].join(" ");
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

    get codigosDisponibles(): string[] {
        const set = new Set<string>();
        for (const r of this.registros) {
            if (!matchesGeoFilters(r, this.filtroDepartamento, this.filtroMunicipio, this.filtroZat)) continue;
            const c = (r.codSe || "").trim();
            if (c) set.add(c);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
    }

    onDepartamentoChange() {
        this.filtroMunicipio = "";
        this.filtroZat = "";
        this.filtroCodigo = "";
        this.currentPage = 1;
    }

    onMunicipioChange() {
        this.filtroZat = "";
        this.filtroCodigo = "";
        this.currentPage = 1;
    }

    onZatChange() {
        this.filtroCodigo = "";
        this.currentPage = 1;
    }

    onCodigoChange() {
        this.currentPage = 1;
    }

    depTxt(r: any): string { return rowDepartamento(r) || "—"; }
    munTxt(r: any): string { return rowMunicipio(r) || "—"; }
    zatTxt(r: any): string {
        const t = rowZatLabel(r);
        return t === "—" && !rowZatValue(r) ? "—" : t;
    }
    depBadge(r: any): string { return badgeClassDepartamento(rowDepartamento(r)); }
    munBadge(r: any): string { return badgeClassMunicipio(rowMunicipio(r)); }
    zatBadge(r: any): string {
        return badgeClassZat(rowZatValue(r) || rowZatLabel(r) || "—");
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

    ordenarPor(col: string) {
        if (this.sortColumn === col) {
            this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
        } else {
            this.sortColumn = col;
            this.sortDir = "asc";
        }
        this.currentPage = 1;
    }

    sortIndicador(col: string): string {
        if (this.sortColumn !== col) return "";
        return this.sortDir === "asc" ? " ↑" : " ↓";
    }

    private valorOrden(r: any, c: string): unknown {
        switch (c) {
            case "id":
                return rowMongoIdString(r);
            case "senal":
                return r.codSe ?? "";
            case "departamento":
                return this.depTxt(r);
            case "municipio":
                return this.munTxt(r);
            case "zat":
                return this.zatTxt(r);
            case "viaTramo":
                return r.idViaTramo?.nomenclatura?.completa || r.idViaTramo?.via || "";
            case "diseno":
                return r.idViaTramo?.tipoUbic ?? "";
            case "estado":
                return r.estado ?? "";
            case "soporte":
                return r.tipoSoporte ?? "";
            case "fase":
                return r.fase ?? "";
            case "accion":
                return r.accion ?? "";
            default:
                return "";
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

    nuevo()            { this.router.navigate(["/sen-verticales/nuevo"]); }
    editar(id: string) { this.router.navigate(["/sen-verticales/editar", id]); }
    verReporte(id: string) { this.router.navigate(["/sen-verticales/reporte", id]); }
    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }
    puedeVerEstadisticas(): boolean {
        return this.authService.isAdmin() || this.authService.isSupervisor();
    }

    eliminar(id: string) {
        this.confirmDialog
            .confirm({
                title: "¿Eliminar esta señal vertical?",
                message:
                    "Se quitará del inventario. Esta acción no se puede deshacer.",
                confirmText: "Sí, eliminar",
                cancelText: "Cancelar",
                variant: "danger",
                icon: "delete"
            })
            .subscribe((ok) => {
                if (!ok) return;
                this.senVertService.delete(id).subscribe({
                    next: () => this.loadRegistros(),
                    error: (err) =>
                        alert(err.error?.message || "Error al eliminar")
                });
            });
    }

    tieneStreetView(r: any): boolean {
        return hasStreetViewCoords(r?.ubicacion);
    }

    abrirStreetView(r: any): void {
        openGoogleStreetView(r?.ubicacion);
    }
}
