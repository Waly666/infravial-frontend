import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SemaforoService } from '../../../core/services/semaforo.service';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';

@Component({
    selector: 'app-semaforo-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './semaforo-lista.html',
    styleUrl: './semaforo-lista.scss'
})
export class SemaforoListaComponent implements OnInit {

    registros: any[]   = [];
    loading:   boolean = true;
    error:     string  = '';
    jornada:   any     = null;
    busqueda:  string  = '';

    constructor(
        private semaforoService: SemaforoService,
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
        this.semaforoService.getAll().subscribe({
            next: (res) => {
                this.registros = res.registros;
                this.loading   = false;
            },
            error: () => {
                this.error   = 'Error al cargar semáforos';
                this.loading = false;
            }
        });
    }
    generarReporte(id: string) {
        this.router.navigate(['/semaforos/reporte', id]);
    }

    get registrosFiltrados() {
        if (!this.busqueda) return this.registros;
        const q = this.busqueda.toLowerCase();
        return this.registros.filter(r =>
            r.idViaTramo?.via?.toLowerCase().includes(q) ||
            r.claseSem?.toLowerCase().includes(q) ||
            r.fase?.toLowerCase().includes(q)
        );
    }

    nuevo()            { this.router.navigate(['/semaforos/nuevo']); }
    editar(id: string) { this.router.navigate(['/semaforos/editar', id]); }
    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string) {
        if (!confirm('¿Eliminar este semáforo?')) return;
        this.semaforoService.delete(id).subscribe({
            next: () => this.loadRegistros(),
            error: (err) => alert(err.error?.message || 'Error al eliminar')
        });
    }
}

