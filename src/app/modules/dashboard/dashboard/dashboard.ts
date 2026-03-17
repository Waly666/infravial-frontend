import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { JornadaService } from '../../../core/services/jornada.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {

    usuario: any;
    stats: any    = null;
    jornada: any  = null;
    loading       = true;
    seccionActiva = 'dashboard';

    menuItems = [
        { id: 'dashboard',        label: 'Dashboard',        icon: '📊', roles: ['admin','supervisor','encuestador','invitado'] },
        { id: 'jornadas',         label: 'Jornadas',         icon: '📋', roles: ['admin','supervisor'] },
        { id: 'via-tramos',       label: 'Vía Tramos',       icon: '🛣️', roles: ['admin','supervisor','encuestador'] },
        { id: 'sen-verticales',   label: 'Señales Verticales',icon: '🚧', roles: ['admin','supervisor','encuestador'] },
        { id: 'sen-horizontales', label: 'Señales Horizontales',icon: '🚦', roles: ['admin','supervisor','encuestador'] },
        { id: 'semaforos',        label: 'Semáforos',        icon: '🚥', roles: ['admin','supervisor','encuestador'] },
        { id: 'control-semaforo', label: 'Control Semáforo', icon: '🎛️', roles: ['admin','supervisor','encuestador'] },
        { id: 'cajas-inspeccion', label: 'Cajas Inspección', icon: '📦', roles: ['admin','supervisor','encuestador'] },
        { id: 'catalogos',        label: 'Catálogos',        icon: '📚', roles: ['admin'] },
        { id: 'usuarios',         label: 'Usuarios',         icon: '👥', roles: ['admin'] },
        { id: 'auditoria',        label: 'Auditoría',        icon: '🔍', roles: ['admin'] },
        { id: 'reportes',         label: 'Reportes',         icon: '📈', roles: ['admin','supervisor'] },
    ];

    constructor(
        private authService:      AuthService,
        private dashboardService: DashboardService,
        private jornadaService:   JornadaService,
        private router:           Router
    ) {}

    ngOnInit() {
        this.usuario = this.authService.getUsuario();
        this.loadData();
    }

    loadData() {
        this.loading = true;

        this.jornadaService.getActiva().subscribe({
            next: (res) => this.jornada = res.jornada,
            error: ()   => this.jornada = null
        });

        if (this.isAdmin() || this.isSupervisor()) {
            this.dashboardService.getStats().subscribe({
                next: (res) => {
                    this.stats   = res.stats;
                    this.loading = false;
                },
                error: () => this.loading = false
            });
        } else {
            this.loading = false;
        }
    }

    getMenuItems() {
        return this.menuItems.filter(item => item.roles.includes(this.usuario?.rol));
    }

    navegarA(ruta: string) {
        this.seccionActiva = ruta;
        this.router.navigate([`/${ruta}`]);
    }

    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    logout() { this.authService.logout(); }

    getInitials(): string {
        const u = this.usuario;
        if (!u) return 'U';
        return `${u.nombres?.charAt(0)}${u.apellidos?.charAt(0)}`.toUpperCase();
    }
}

