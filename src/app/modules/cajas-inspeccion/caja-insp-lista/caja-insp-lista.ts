import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CajaInspService } from '../../../core/services/caja-insp.service';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';

@Component({
    selector: 'app-caja-insp-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './caja-insp-lista.html',
    styleUrl: './caja-insp-lista.scss'
})
export class CajaInspListaComponent implements OnInit {

    registros: any[]   = [];
    loading:   boolean = true;
    error:     string  = '';
    jornada:   any     = null;
    busqueda:  string  = '';

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
        if (!this.busqueda) return this.registros;
        const q = this.busqueda.toLowerCase();
        return this.registros.filter(r =>
            r.idViaTramo?.via?.toLowerCase().includes(q) ||
            r.materialCaja?.toLowerCase().includes(q) ||
            r.estadoCaja?.toLowerCase().includes(q)
        );
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

