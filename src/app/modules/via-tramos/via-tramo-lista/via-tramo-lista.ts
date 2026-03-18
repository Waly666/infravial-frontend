import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { FormsModule } from '@angular/forms';
@Component({
    selector: 'app-via-tramo-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './via-tramo-lista.html',
    styleUrl: './via-tramo-lista.scss'
})
export class ViaTramoListaComponent implements OnInit {

    tramos:   any[]  = [];
    loading:  boolean = true;
    error:    string  = '';
    jornada:  any     = null;
    busqueda: string  = '';

    constructor(
        private viaTramoService: ViaTramoService,
        private jornadaService:  JornadaService,
        private authService:     AuthService,
        public  router:          Router
    ) {}

    ngOnInit() {
        this.loadJornada();
        this.loadTramos();
    }

    loadJornada() {
        this.jornadaService.getActiva().subscribe({
            next: (res) => this.jornada = res.jornada,
            error: ()   => this.jornada = null
        });
    }

    loadTramos() {
        this.loading = true;
        this.viaTramoService.getAll().subscribe({
            next: (res) => {
                this.tramos  = res.tramos;
                this.loading = false;
            },
            error: () => {
                this.error   = 'Error al cargar tramos';
                this.loading = false;
            }
        });
    }

    get tramosFiltrados() {
        if (!this.busqueda) return this.tramos;
        const q = this.busqueda.toLowerCase();
        return this.tramos.filter(t =>
            t.via?.toLowerCase().includes(q) ||
            t.municipio?.toLowerCase().includes(q) ||
            t.nomenclatura?.completa?.toLowerCase().includes(q)
        );
    }

    nuevo()          { this.router.navigate(['/via-tramos/nuevo']); }
    editar(id: string) { this.router.navigate(['/via-tramos/editar', id]); }
    isAdmin():    boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    eliminar(id: string, via: string) {
        if (!confirm(`¿Eliminar el tramo "${via}"?`)) return;
        this.viaTramoService.delete(id).subscribe({
            next: () => this.loadTramos(),
            error: (err) => alert(err.error?.message || 'Error al eliminar')
        });
    }
}
