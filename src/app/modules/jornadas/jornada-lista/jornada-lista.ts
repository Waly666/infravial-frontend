import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { JornadaService } from '../../../core/services/jornada.service';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import {
    badgeClassDepartamento,
    badgeClassMunicipio,
    badgeClassZat
} from '../../../shared/utils/geo-list-filters';

@Component({
    selector: 'app-jornada-lista',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './jornada-lista.html',
    styleUrls: ['./jornada-lista.scss', '../../../shared/styles/geo-badges.scss']
})
export class JornadaListaComponent implements OnInit {

    jornadas:  any[]  = [];
    loading:   boolean = true;
    error:     string  = '';
    editando:     boolean = false;
    jornadaEdit:  any     = null; 
    tiposLocalidad = ['Cabecera Municipal', 'Corregimiento', 'Inspección', 'Centro Poblado'];
    busquedaDivipolEdit   = '';
    resultadosDivipolEdit: any[] = [];
    buscandoEdit          = false;
    mostrarDivipolEdit    = false;

    constructor(
    private jornadaService:  JornadaService,
    private catalogoService: CatalogoService,  // ← agregar
    public  authService:     AuthService,
    public router:          Router
) {}

    ngOnInit() { this.loadJornadas(); }

    loadJornadas() {
        this.loading = true;
        this.jornadaService.getAll().subscribe({
            next: (res) => {
                this.jornadas = res.jornadas;
                this.loading  = false;
            },
            error: () => {
                this.error   = 'Error al cargar jornadas';
                this.loading = false;
            }
        });
    }

    finalizar(id: string) {
        if (!confirm('¿Estás seguro de finalizar esta jornada?')) return;
        this.jornadaService.finalizar(id).subscribe({
            next: () => this.loadJornadas(),
            error: (err) => alert(err.error?.message || 'Error al finalizar')
        });
    }

    isAdmin(): boolean { return this.authService.isAdmin(); }
    nueva()           { this.router.navigate(['/jornadas/nueva']); }

    getEstadoClass(estado: string): string {
        return estado === 'EN PROCESO' ? 'badge-activa' : 'badge-finalizada';
    }

    munClass(j: any): string {
        return badgeClassMunicipio(j?.municipio);
    }

    deptoClass(j: any): string {
        return badgeClassDepartamento(j?.dpto);
    }

    /** Paleta ZAT (tonos distintos a mun/depto) según nombre del supervisor. */
    supClass(j: any): string {
        return badgeClassZat(j?.supervisor || '—');
    }
    editar(j: any) {
        this.jornadaEdit         = { ...j };
        this.busquedaDivipolEdit = `${j.municipio} - ${j.dpto}`;
        this.editando            = true;
    }

cerrarModal() {
    this.editando    = false;
    this.jornadaEdit = null;
}

guardarEdicion() {
    if (!this.jornadaEdit.supervisor) return;
    this.jornadaService.update(this.jornadaEdit._id, this.jornadaEdit).subscribe({
        next: () => {
            this.cerrarModal();
            this.loadJornadas();
        },
        error: (err) => alert(err.error?.message || 'Error al actualizar')
    });
}
buscarDivipolEdit() {
    if (this.busquedaDivipolEdit.length < 2) return;
    this.buscandoEdit = true;
    this.catalogoService.buscarDivipol(this.busquedaDivipolEdit).subscribe({
        next: (res) => {
            this.resultadosDivipolEdit = res.datos;
            this.mostrarDivipolEdit    = true;
            this.buscandoEdit          = false;
        },
        error: () => this.buscandoEdit = false
    });
}

seleccionarMunicipioEdit(item: any) {
    this.jornadaEdit.codMunicipio   = item.divipolMunCod;
    this.jornadaEdit.municipio      = item.divipolMunicipio;
    this.jornadaEdit.dpto           = item.divipolDepto;
    this.jornadaEdit.codDepto       = item.divipolDeptoCod;
    this.busquedaDivipolEdit        = `${item.divipolMunicipio} - ${item.divipolDepto}`;
    this.mostrarDivipolEdit         = false;
    this.resultadosDivipolEdit      = [];
}
}

