import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JornadaService } from '../../../core/services/jornada.service';
import { CatalogoService } from '../../../core/services/catalogo.service';

@Component({
    selector: 'app-jornada-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './jornada-form.html',
    styleUrl: './jornada-form.scss'
})
export class JornadaFormComponent implements OnInit {

    form: any = {
        contratante:   '',
        entidadResVia: '',
        codDepto:      '',
        dpto:          '',
        codMunicipio:  '',
        municipio:     '',
        supervisor:    '',
        localidad:     '',
        tipoLocalidad: ''
    };

    // DIVIPOL
    busquedaDivipol  = '';
    resultadosDivipol: any[] = [];
    buscando         = false;
    mostrarDivipol   = false;

    loading = false;
    error   = '';

    tiposLocalidad = ['Cabecera Municipal', 'Corregimiento', 'Inspección', 'Centro Poblado'];

    constructor(
        private jornadaService:  JornadaService,
        private catalogoService: CatalogoService,
        private router:          Router
    ) {}

    ngOnInit() {}

    buscarDivipol() {
        if (this.busquedaDivipol.length < 2) return;
        this.buscando = true;
        this.catalogoService.buscarDivipol(this.busquedaDivipol).subscribe({
            next: (res) => {
                this.resultadosDivipol = res.datos;
                this.mostrarDivipol    = true;
                this.buscando          = false;
            },
            error: () => this.buscando = false
        });
    }

    seleccionarMunicipio(item: any) {
        this.form.codMunicipio  = item.divipolMunCod;
        this.form.municipio     = item.divipolMunicipio;
        this.form.dpto          = item.divipolDepto;
        this.form.codDepto      = item.divipolDeptoCod;
        this.busquedaDivipol    = `${item.divipolMunicipio} - ${item.divipolDepto}`;
        this.mostrarDivipol     = false;
        this.resultadosDivipol  = [];
    }

    guardar() {
        if (!this.form.municipio) {
            this.error = 'Selecciona un municipio';
            return;
        }
        if (!this.form.supervisor) {
            this.error = 'El supervisor es requerido';
            return;
        }

        this.loading = true;
        this.error   = '';

        this.jornadaService.create(this.form).subscribe({
            next: () => {
                this.loading = false;
                this.router.navigate(['/jornadas']);
            },
            error: (err) => {
                this.loading = false;
                this.error   = err.error?.message || 'Error al crear jornada';
            }
        });
    }

    cancelar() { this.router.navigate(['/jornadas']); }
}