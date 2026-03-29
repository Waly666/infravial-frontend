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
    rowDepartamento,
    rowMunicipio,
    rowZatLabel,
    rowZatValue,
    badgeClassDepartamento,
    badgeClassMunicipio,
    badgeClassZat
} from '../../../shared/utils/geo-list-filters';

@Component({
    selector: 'app-caja-insp-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './caja-insp-lista.html',
    styleUrls: ['./caja-insp-lista.scss', '../../../shared/styles/geo-badges.scss']
})
export class CajaInspListaComponent implements OnInit {

    registros: any[]   = [];
    loading:   boolean = true;
    error:     string  = '';
    jornada:   any     = null;
    busqueda:  string  = '';
    filtroDepartamento = '';
    filtroMunicipio = '';
    filtroZat = '';
    pageSize:  number  = 30;
    currentPage: number = 1;

    constructor(
        private cajaInspService: CajaInspService,
        private jornadaService:  JornadaService,
        private authService:     AuthService,
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
        const qRaw = this.busqueda.trim();
        return this.registros.filter(r => {
            if (!matchesGeoFilters(r, this.filtroDepartamento, this.filtroMunicipio, this.filtroZat)) return false;
            const z = rowZatLabel(r);
            const blob = [
                r.idViaTramo?.via,
                r.idViaTramo?.municipio,
                r.idViaTramo?.departamento,
                nomenclaturaSearchText(r),
                r.materialCaja,
                r.estadoCaja,
                z !== '—' ? z : ''
            ].join(' ');
            return textBlobMatchesQuery(blob, qRaw);
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

    nuevo()            { this.router.navigate(['/cajas-inspeccion/nuevo']); }
    editar(id: string) { this.router.navigate(['/cajas-inspeccion/editar', id]); }
    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string) {
        if (!confirm('¿Eliminar esta caja de inspección?')) return;
        this.cajaInspService.delete(id).subscribe({
            next: () => this.loadRegistros(),
            error: (err) => alert(err.error?.message || 'Error al eliminar')
        });
    }
}

