import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';

@Component({
    selector: 'app-dashboard-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './dashboard-layout.html',
    styleUrl: './dashboard.scss',
    encapsulation: ViewEncapsulation.None
})
export class DashboardLayoutComponent implements OnInit {
    usuario: any;
    jornada: any = null;
    seccionActiva = 'dashboard';
    modoClaro = false;

    menuItems = [
        { id: 'dashboard',        label: 'Dashboard',           icon: 'space_dashboard', roles: ['admin','supervisor','encuestador','invitado'] },
        { id: 'jornadas',         label: 'Jornadas',           icon: 'calendar_month', roles: ['admin','supervisor'] },
        { id: 'via-tramos',       label: 'Vía Tramos',         icon: 'route', roles: ['admin','supervisor','encuestador'] },
        { id: 'sen-verticales',   label: 'Señales Verticales', icon: 'vertical_align_top', roles: ['admin','supervisor','encuestador'] },
        { id: 'sen-horizontales', label: 'Señales Horizontales', icon: 'horizontal_rule', roles: ['admin','supervisor','encuestador'] },
        { id: 'semaforos',        label: 'Semáforos',          icon: 'traffic', roles: ['admin','supervisor','encuestador'] },
        { id: 'control-semaforo', label: 'Control Semáforo',   icon: 'tune', roles: ['admin','supervisor','encuestador'] },
        { id: 'cajas-inspeccion', label: 'Cajas Inspección',   icon: 'inventory_2', roles: ['admin','supervisor','encuestador'] },
        { id: 'catalogos',        label: 'Catálogos',          icon: 'menu_book', roles: ['admin'] },
        { id: 'usuarios',         label: 'Usuarios',           icon: 'groups', roles: ['admin'] },
        { id: 'auditoria',        label: 'Auditoría',          icon: 'fact_check', roles: ['admin'] },
        { id: 'respaldos',        label: 'Respaldos',          icon: 'settings_backup_restore', roles: ['admin'] },
        { id: 'importacion',      label: 'Importar Excel',     icon: 'upload_file', roles: ['admin'] },
        { id: 'reportes',         label: 'Reportes',           icon: 'analytics', roles: ['admin','supervisor'] },
    ];

    constructor(
        private authService: AuthService,
        private jornadaService: JornadaService,
        private router: Router
    ) {}

    ngOnInit() {
        this.usuario = this.authService.getUsuario();

        this.modoClaro = localStorage.getItem('modoClaro') === 'true';
        document.body.classList.toggle('light-mode', this.modoClaro);

        this.jornadaService.getActiva().subscribe({
            next: (res) => this.jornada = res.jornada,
            error: ()   => this.jornada = null
        });

        this.syncSeccionActiva(this.router.url);
        this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe(e => this.syncSeccionActiva(e.urlAfterRedirects));
    }

    private syncSeccionActiva(url: string) {
        const clean = (url || '').split('?')[0].split('#')[0];
        const seg = clean.replace(/^\//, '').split('/')[0] || 'dashboard';
        this.seccionActiva = seg === '' ? 'dashboard' : seg;
    }

    toggleModo() {
        this.modoClaro = !this.modoClaro;
        document.body.classList.toggle('light-mode', this.modoClaro);
        localStorage.setItem('modoClaro', this.modoClaro.toString());
    }

    getMenuItems() {
        return this.menuItems.filter(item => item.roles.includes(this.usuario?.rol));
    }

    navegarA(ruta: string) {
        this.router.navigate([`/${ruta}`]);
    }

    isAdmin(): boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }

    logout() { this.authService.logout(); }

    getInitials(): string {
        const u = this.usuario;
        if (!u) return 'U';
        return `${u.nombres?.charAt(0)}${u.apellidos?.charAt(0)}`.toUpperCase();
    }
}

