import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SenHorService } from '../../../core/services/sen-hor.service';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';

@Component({
    selector: 'app-sen-hor-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './sen-hor-lista.html',
    styleUrl: './sen-hor-lista.scss'
})
export class SenHorListaComponent implements OnInit {

    registros: any[]   = [];
    loading:   boolean = true;
    error:     string  = '';
    jornada:   any     = null;
    busqueda:  string  = '';

    constructor(
        private senHorService:  SenHorService,
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
        this.senHorService.getAll().subscribe({
            next: (res) => {
                this.registros = res.registros;
                this.loading   = false;
            },
            error: () => {
                this.error   = 'Error al cargar señales horizontales';
                this.loading = false;
            }
        });
    }

    get registrosFiltrados() {
        if (!this.busqueda) return this.registros;
        const q = this.busqueda.toLowerCase();
        return this.registros.filter(r =>
            r.codSeHor?.toLowerCase().includes(q) ||
            r.idViaTramo?.via?.toLowerCase().includes(q) ||
            r.estadoDem?.toLowerCase().includes(q)
        );
    }

    nuevo()            { this.router.navigate(['/sen-horizontales/nuevo']); }
    editar(id: string) { this.router.navigate(['/sen-horizontales/editar', id]); }
    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string) {
        if (!confirm('¿Eliminar esta señal horizontal?')) return;
        this.senHorService.delete(id).subscribe({
            next: () => this.loadRegistros(),
            error: (err) => alert(err.error?.message || 'Error al eliminar')
        });
    }
} {}

