import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ConteoService } from '../../../core/services/conteo.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

const CLIM = ['DESPEJADO', 'NUBLADO', 'LLUVIOSO', 'PARCIALMENTE NUBLADO'];

@Component({
    selector: 'app-conteo-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './conteo-lista.html',
    styleUrl: './conteo-lista.scss'
})
export class ConteoListaComponent implements OnInit {

    // Contexto de estación (opcional — viene por query params desde estacion-lista)
    idEstacion  = '';
    nomEstacion = '';
    modoGlobal  = false;   // true = vista sin filtro de estación (todos los conteos)

    conteos:        any[] = [];
    estaciones:     any[] = [];
    proyectos:      any[] = [];
    proyectoActivo: any   = null;
    loading = true;

    // Filtros locales
    busqueda    = '';
    filtroEstado = '';

    // Modal crear/editar
    modal       = false;
    modoEdicion = false;
    idEdicion: string | null = null;
    guardando   = false;
    errorModal  = '';

    condClimOpts = CLIM;

    form: any = {
        fecha: '', horaIni: '', horaFin: '', condClim: '',
        idProyecto: '', observaciones: '', estado: 'EN PROCESO'
    };

    constructor(
        private svc:        ConteoService,
        private authSvc:    AuthService,
        private confirmDlg: ConfirmDialogService,
        public  router:     Router,
        private route:      ActivatedRoute
    ) {}

    ngOnInit() {
        this.idEstacion  = this.route.snapshot.queryParamMap.get('idEstacion')  || '';
        this.nomEstacion = this.route.snapshot.queryParamMap.get('nomEstacion') || '';
        this.modoGlobal  = !this.idEstacion;

        this.svc.getProyectos().subscribe({ next: (r) => this.proyectos = r.datos, error: () => {} });
        this.svc.getProyectoActivo().subscribe({ next: (r) => this.proyectoActivo = r.dato, error: () => {} });
        this.svc.getEstaciones().subscribe({ next: (r) => this.estaciones = r.datos, error: () => {} });
        this.cargar();
    }

    cargar() {
        this.loading = true;
        const params: any = {};
        if (this.idEstacion) params.idEstacion = this.idEstacion;
        this.svc.getConteos(params).subscribe({
            next:  (r) => { this.conteos = r.datos; this.loading = false; },
            error: ()  => { this.loading = false; }
        });
    }

    get filtrados() {
        return this.conteos.filter(c => {
            const matchEstado  = !this.filtroEstado || c.estado === this.filtroEstado;
            const matchBusqueda = !this.busqueda ||
                JSON.stringify(c).toLowerCase().includes(this.busqueda.toLowerCase());
            return matchEstado && matchBusqueda;
        });
    }

    // ── Modal ──────────────────────────────────────────────────────────────────
    abrirCrear() {
        this.modoEdicion = false;
        this.idEdicion   = null;
        this.errorModal  = '';
        const hoy = new Date().toISOString().split('T')[0];
        this.form = {
            fecha: hoy, horaIni: '07:00', horaFin: '08:00',
            condClim: 'DESPEJADO',
            idProyecto: this.proyectoActivo?._id || '',
            observaciones: '', estado: 'EN PROCESO',
            idEstacion: this.idEstacion   // vacío en modo global → usuario elige
        };
        this.modal = true;
    }

    abrirEditar(c: any) {
        this.modoEdicion = true;
        this.idEdicion   = c._id;
        this.errorModal  = '';
        this.form = {
            fecha:         c.fecha?.split('T')[0] || '',
            horaIni:       c.horaIni ? this.toTimeStr(c.horaIni) : '',
            horaFin:       c.horaFin ? this.toTimeStr(c.horaFin) : '',
            condClim:      c.condClim || '',
            idProyecto:    c.idProyecto?._id || c.idProyecto || '',
            observaciones: c.observaciones || '',
            estado:        c.estado || 'EN PROCESO'
        };
        this.modal = true;
    }

    guardar() {
        if (!this.form.idEstacion && !this.idEstacion) { this.errorModal = 'Selecciona una estación'; return; }
        if (!this.form.fecha)    { this.errorModal = 'La fecha es requerida';        return; }
        if (!this.form.horaIni)  { this.errorModal = 'La hora inicio es requerida';  return; }
        if (!this.form.horaFin)  { this.errorModal = 'La hora fin es requerida';     return; }
        if (!this.form.condClim) { this.errorModal = 'La condición climática es requerida'; return; }

        this.guardando = true;
        const payload = {
            ...this.form,
            idEstacion: this.idEstacion || this.form.idEstacion,
            horaIni: this.buildDatetime(this.form.fecha, this.form.horaIni),
            horaFin: this.buildDatetime(this.form.fecha, this.form.horaFin)
        };

        const obs = this.modoEdicion
            ? this.svc.updateConteo(this.idEdicion!, payload)
            : this.svc.createConteo(payload);

        obs.subscribe({
            next:  () => { this.modal = false; this.guardando = false; this.cargar(); },
            error: (e) => { this.errorModal = e?.error?.message || 'Error al guardar'; this.guardando = false; }
        });
    }

    eliminar(c: any) {
        this.confirmDlg.confirm({
            title: '¿Eliminar conteo?',
            message: `Se eliminará el conteo del ${c.fecha?.split('T')[0] || ''} de forma permanente.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            variant: 'danger',
            icon: 'delete'
        }).subscribe(ok => {
            if (!ok) return;
            this.svc.deleteConteo(c._id).subscribe({
                next: () => this.cargar(),
                error: (e) => this.confirmDlg.confirm({
                    title: 'Error', message: e?.error?.message || 'No se pudo eliminar.',
                    confirmText: 'Entendido', variant: 'danger', icon: 'warning', showCancel: false
                }).subscribe()
            });
        });
    }

    irSesion(c: any)  { this.router.navigate(['/conteos/sesion',  c._id]); }
    irPanel(c: any)   { this.router.navigate(['/conteos/panel',   c._id]); }

    irEstacion(c: any) {
        const id  = c.idEstacion?._id  || c.idEstacion;
        const nom = c.idEstacion?.nomenclatura || '';
        this.router.navigate(['/conteos/conteos'], { queryParams: { idEstacion: id, nomEstacion: nom } });
    }

    estadoBadge(estado: string) {
        return estado === 'EN PROCESO' ? 'badge-proceso' : 'badge-completado';
    }

    private toTimeStr(iso: string): string {
        try {
            const d = new Date(iso);
            return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        } catch { return ''; }
    }

    private buildDatetime(fecha: string, hora: string): string {
        // new Date('YYYY-MM-DDTHH:mm:ss') es hora local → toISOString() da UTC correcto
        return new Date(`${fecha}T${hora}:00`).toISOString();
    }

    isSupervisor() { const r = this.authSvc.getUsuario()?.rol; return r === 'admin' || r === 'supervisor'; }
    isAdmin()      { return this.authSvc.getUsuario()?.rol === 'admin'; }
}
