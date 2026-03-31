import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ControlSemService } from "../../../core/services/control-sem.service";
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
    applyTableSort,
    type TableSortDirection
} from "../../../shared/utils/table-sort";

@Component({
    selector: "app-control-sem-lista",
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: "./control-sem-lista.html",
    styleUrls: [
        "../../../shared/styles/lista-object-id-column.scss",
        "./control-sem-lista.scss",
        "../../../shared/styles/geo-badges.scss"
    ]
})
export class ControlSemListaComponent implements OnInit {

    registros: any[]   = [];
    loading:   boolean = true;
    error:     string  = "";
    jornada:   any     = null;
    busqueda:  string  = "";
    filtroId = "";
    filtroDepartamento = "";
    filtroMunicipio = "";
    filtroZat = "";
    pageSize:  number  = 30;
    currentPage: number = 1;

    sortColumn: string | null = null;
    sortDir: TableSortDirection = "asc";

    constructor(
        private controlSemService: ControlSemService,
        private jornadaService:    JornadaService,
        public  authService:       AuthService,
        public  router:            Router
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
        this.controlSemService.getAll().subscribe({
            next: (res) => {
                this.registros = res.registros;
                this.loading   = false;
            },
            error: () => {
                this.error   = "Error al cargar controladores";
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
            const ne = r.numExterno != null ? String(r.numExterno) : "";
            const blob = [
                rowMongoIdString(r),
                ne,
                r.idViaTramo?.via,
                r.idViaTramo?.tipoUbic,
                r.idViaTramo?.municipio,
                r.idViaTramo?.departamento,
                nomenclaturaSearchText(r),
                r.tipoControlador,
                r.estadoControlador,
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

    onDepartamentoChange() {
        this.filtroMunicipio = "";
        this.filtroZat = "";
        this.currentPage = 1;
    }

    onMunicipioChange() {
        this.filtroZat = "";
        this.currentPage = 1;
    }

    onZatChange() {
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
            case "numExterno":
                return r.numExterno != null ? String(r.numExterno) : "";
            case "tipoControlador":
                return r.tipoControlador ?? "";
            case "estado":
                return r.estadoControlador ?? "";
            case "implementacion":
                return r.implementacion ?? "";
            case "ups":
                return r.ups === true ? 1 : r.ups === false ? 0 : "";
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

    nuevo()            { this.router.navigate(["/control-semaforo/nuevo"]); }
    editar(id: string) { this.router.navigate(["/control-semaforo/editar", id]); }
    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string) {
        if (!confirm("Eliminar este controlador semafórico?")) return;
        this.controlSemService.delete(id).subscribe({
            next: () => this.loadRegistros(),
            error: (err) => alert(err.error?.message || "Error al eliminar")
        });
    }
}
