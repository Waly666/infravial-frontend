import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SincService } from '../../../core/services/sinc.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
    selector: 'app-sinc-eje-lista',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './sinc-eje-lista.html',
    styleUrls: ['./sinc-eje-lista.scss']
})
export class SincEjeListaComponent implements OnInit {

    ejes:     any[]   = [];
    loading:  boolean = true;
    error:    string  = '';
    jornada:  any     = null;
    busqueda: string  = '';
    filtroTipoRed: string = '';
    filtroNivel:   string = '';

    dominios: any = {};
    tiposRed: any[] = [];

    constructor(
        private sincService: SincService,
        private jornadaService: JornadaService,
        private authService: AuthService,
        private confirmDialog: ConfirmDialogService,
        private router: Router
    ) {}

    ngOnInit() {
        this.sincService.getDominios().subscribe(d => {
            this.dominios = d;
            this.tiposRed = d.tipoRed || [];
        });
        this.jornadaService.getActiva().subscribe({
            next: (res) => {
                this.jornada = res.jornada;
                this.cargar();
            },
            error: () => {
                this.jornada = null;
                this.cargar();
            }
        });
    }

    labelDominio(lista: any[], v: number | null): string {
        if (v == null || !lista) return '—';
        return lista.find((o: any) => o.v === v)?.l || String(v);
    }

    cargar() {
        this.loading = true;
        const filtros: any = {};
        if (this.jornada?._id) filtros.idJornada = this.jornada._id;
        if (this.filtroTipoRed) filtros.tipoRed = Number(this.filtroTipoRed);

        this.sincService.getAllEjes(filtros).subscribe({
            next: (res) => { this.ejes = res.ejes; this.loading = false; },
            error: (err) => { this.error = err.message; this.loading = false; }
        });
    }

    get ejesFiltrados(): any[] {
        let lista = this.ejes;
        if (this.busqueda.trim()) {
            const q = this.busqueda.toLowerCase();
            lista = lista.filter(e =>
                (e.codigoVia || '').toLowerCase().includes(q) ||
                (e.nomVia || '').toLowerCase().includes(q)
            );
        }
        if (this.filtroNivel) {
            lista = lista.filter(e => (e.nivelInventario || 'basico') === this.filtroNivel);
        }
        return lista;
    }

    get totalKm(): number {
        return Math.round(this.ejes.reduce((s, e) => s + (e.longitud_m || 0), 0) / 1000 * 10) / 10;
    }
    get countDetallado(): number { return this.ejes.filter(e => e.nivelInventario === 'detallado').length; }
    get countBasico(): number    { return this.ejes.filter(e => e.nivelInventario !== 'detallado').length; }
    get maxLongitud(): number    { return Math.max(...this.ejes.map(e => e.longitud_m || 0), 1); }

    verDetalle(id: string) { this.router.navigate(['/sinc/ejes', id]); }
    editar(id: string)     { this.router.navigate(['/sinc/ejes/editar', id]); }

    eliminar(eje: any) {
        this.confirmDialog.confirm({ title: `¿Eliminar eje "${eje.codigoVia}"?`, message: 'Se eliminarán todos sus elementos: PRS, puentes, obras de drenaje, sitios críticos, etc.', variant: 'danger', icon: 'delete' })
            .subscribe(ok => {
                if (!ok) return;
                this.sincService.deleteEje(eje._id).subscribe({
                    next: () => this.cargar(),
                    error: (err) => alert('Error: ' + err.message)
                });
            });
    }

    get esAdmin() { return ['admin', 'supervisor'].includes(this.authService.getUsuario()?.rol); }
    get puedeEditar() { return ['admin', 'supervisor', 'encuestador'].includes(this.authService.getUsuario()?.rol); }
}
