import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConteoService } from '../../../core/services/conteo.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
    selector: 'app-proyecto-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './proyecto-lista.html',
    styleUrl: './proyecto-lista.scss'
})
export class ProyectoListaComponent implements OnInit {

    proyectos: any[] = [];
    loading   = true;
    busqueda  = '';

    // Modal
    modal       = false;
    modoEdicion = false;
    idEdicion: string | null = null;
    guardando   = false;
    errorModal  = '';

    form = { descripcion: '', responsable: '', fechaInicio: '', fechaFin: '', notas: '' };

    constructor(
        private svc:        ConteoService,
        private authSvc:    AuthService,
        private confirmDlg: ConfirmDialogService,
        public  router:     Router
    ) {}

    ngOnInit() { this.cargar(); }

    cargar() {
        this.loading = true;
        this.svc.getProyectos().subscribe({
            next:  (r) => { this.proyectos = r.datos; this.loading = false; },
            error: ()  => { this.loading = false; }
        });
    }

    get filtrados() {
        const q = this.busqueda.toLowerCase();
        return this.proyectos.filter(p =>
            !q || JSON.stringify(p).toLowerCase().includes(q)
        );
    }

    abrirCrear() {
        this.modoEdicion = false;
        this.idEdicion   = null;
        this.errorModal  = '';
        this.form = { descripcion: '', responsable: '', fechaInicio: '', fechaFin: '', notas: '' };
        this.modal = true;
    }

    abrirEditar(p: any) {
        this.modoEdicion = true;
        this.idEdicion   = p._id;
        this.errorModal  = '';
        this.form = {
            descripcion:  p.descripcion  || '',
            responsable:  p.responsable  || '',
            fechaInicio:  p.fechaInicio?.split('T')[0] || '',
            fechaFin:     p.fechaFin?.split('T')[0]    || '',
            notas:        p.notas        || ''
        };
        this.modal = true;
    }

    guardar() {
        if (!this.form.descripcion.trim()) { this.errorModal = 'La descripción es requerida'; return; }
        this.guardando  = true;
        this.errorModal = '';
        const obs = this.modoEdicion
            ? this.svc.updateProyecto(this.idEdicion!, this.form)
            : this.svc.createProyecto(this.form);
        obs.subscribe({
            next:  () => { this.modal = false; this.guardando = false; this.cargar(); },
            error: (e) => { this.errorModal = e?.error?.message || 'Error al guardar'; this.guardando = false; }
        });
    }

    activar(p: any) {
        this.confirmDlg.confirm({
            title: '¿Activar este proyecto?',
            message: `"${p.descripcion}" pasará a ser el proyecto activo. Si hay otro activo se desactivará automáticamente.`,
            confirmText: 'Sí, activar',
            cancelText: 'Cancelar',
            variant: 'info',
            icon: 'check_circle'
        }).subscribe(ok => {
            if (!ok) return;
            this.svc.activarProyecto(p._id).subscribe({
                next: () => this.cargar(),
                error: (e) => this.confirmDlg.confirm({
                    title: 'Error',
                    message: e?.error?.message || 'No se pudo activar el proyecto.',
                    confirmText: 'Entendido', variant: 'danger', icon: 'warning', showCancel: false
                }).subscribe()
            });
        });
    }

    desactivar(p: any) {
        this.confirmDlg.confirm({
            title: '¿Desactivar el proyecto?',
            message: `El proyecto "${p.descripcion}" quedará inactivo. No habrá proyecto activo hasta que actives otro.`,
            confirmText: 'Sí, desactivar',
            cancelText: 'Cancelar',
            variant: 'warning',
            icon: 'warning'
        }).subscribe(ok => {
            if (!ok) return;
            this.svc.desactivarProyecto(p._id).subscribe({
                next: () => this.cargar(),
                error: (e) => this.confirmDlg.confirm({
                    title: 'Error',
                    message: e?.error?.message || 'No se pudo desactivar.',
                    confirmText: 'Entendido', variant: 'danger', icon: 'warning', showCancel: false
                }).subscribe()
            });
        });
    }

    eliminar(p: any) {
        this.confirmDlg.confirm({
            title: '¿Eliminar proyecto?',
            message: `Se eliminará "${p.descripcion}" permanentemente.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            variant: 'danger',
            icon: 'delete'
        }).subscribe(ok => {
            if (!ok) return;
            this.svc.deleteProyecto(p._id).subscribe({
                next: () => this.cargar(),
                error: (e) => this.confirmDlg.confirm({
                    title: 'Error al eliminar',
                    message: e?.error?.message || 'No se pudo eliminar el proyecto.',
                    confirmText: 'Entendido',
                    variant: 'danger',
                    icon: 'warning',
                    showCancel: false
                }).subscribe()
            });
        });
    }

    irEstaciones(p: any) {
        this.router.navigate(['/conteos/estaciones']);
    }

    isAdmin()      { return this.authSvc.getUsuario()?.rol === 'admin'; }
    isSupervisor() { const r = this.authSvc.getUsuario()?.rol; return r === 'admin' || r === 'supervisor'; }

    formatFecha(iso: string): string {
        if (!iso) return '—';
        try { return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return iso; }
    }
}
