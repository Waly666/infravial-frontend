import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { SenVertService } from "../../../core/services/sen-vert.service";
import { AuthService } from "../../../core/services/auth.service";
import { JornadaService } from "../../../core/services/jornada.service";
import {
    geoDepartamentos,
    geoMunicipios,
    geoZatOptions,
    matchesGeoFilters,
    rowDepartamento,
    rowMunicipio,
    rowZatLabel,
    rowZatValue,
    badgeClassDepartamento,
    badgeClassMunicipio,
    badgeClassZat
} from "../../../shared/utils/geo-list-filters";
import {
    hasStreetViewCoords,
    openGoogleStreetView
} from "../../../shared/utils/street-view";

@Component({
    selector: "app-sen-vert-lista",
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: "./sen-vert-lista.html",
    styleUrls: [
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
    filtroDepartamento = "";
    filtroMunicipio = "";
    filtroZat = "";
    /** Código de señal (codSe), exacto; opciones según filtros geo. */
    filtroCodigo = "";
    pageSize:  number  = 30;
    currentPage: number = 1;

    constructor(
        private senVertService: SenVertService,
        private jornadaService: JornadaService,
        private authService:    AuthService,
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
        const q = this.busqueda.trim().toLowerCase();
        const fc = this.filtroCodigo.trim();
        return this.registros.filter(r => {
            if (!matchesGeoFilters(r, this.filtroDepartamento, this.filtroMunicipio, this.filtroZat)) return false;
            if (fc && (r.codSe || "").trim() !== fc) return false;
            if (!q) return true;
            return (
                r.codSe?.toLowerCase().includes(q) ||
                r.idViaTramo?.via?.toLowerCase().includes(q) ||
                r.idViaTramo?.municipio?.toLowerCase().includes(q) ||
                r.idViaTramo?.departamento?.toLowerCase().includes(q) ||
                r.estado?.toLowerCase().includes(q)
            );
        });
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

    get registrosPaginados() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.registrosFiltrados.slice(start, start + this.pageSize);
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

    nuevo()            { this.router.navigate(["/sen-verticales/nuevo"]); }
    editar(id: string) { this.router.navigate(["/sen-verticales/editar", id]); }
    verReporte(id: string) { this.router.navigate(["/sen-verticales/reporte", id]); }
    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string) {
        if (!confirm("Eliminar esta señal vertical?")) return;
        this.senVertService.delete(id).subscribe({
            next: () => this.loadRegistros(),
            error: (err) => alert(err.error?.message || "Error al eliminar")
        });
    }

    tieneStreetView(r: any): boolean {
        return hasStreetViewCoords(r?.ubicacion);
    }

    abrirStreetView(r: any): void {
        openGoogleStreetView(r?.ubicacion);
    }
}
