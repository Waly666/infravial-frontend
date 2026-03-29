import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';

/** Rutas del submenú Utils (mismo orden que en el menú). */
const UTILS_ROUTE_IDS = ['importacion', 'catalogos', 'usuarios', 'auditoria', 'respaldos'] as const;

type MenuLink = { id: string; label: string; icon: string };
type MenuEntry =
    | { kind: 'link'; id: string; label: string; icon: string; roles: string[] }
    | { kind: 'group'; id: string; label: string; icon: string; roles: string[]; children: MenuLink[] };

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
    /** Submenú Utils desplegado (se abre solo al entrar a una de sus rutas). */
    utilsOpen = false;

    private readonly menuEntries: MenuEntry[] = [
        { kind: 'link', id: 'dashboard',        label: 'Dashboard',            icon: 'space_dashboard', roles: ['admin','supervisor','encuestador','invitado'] },
        { kind: 'link', id: 'jornadas',         label: 'Jornadas',             icon: 'calendar_month', roles: ['admin','supervisor'] },
        { kind: 'link', id: 'via-tramos',       label: 'Vía Tramos',           icon: 'route', roles: ['admin','supervisor','encuestador'] },
        { kind: 'link', id: 'sen-verticales',   label: 'Señales Verticales',   icon: 'vertical_align_top', roles: ['admin','supervisor','encuestador'] },
        { kind: 'link', id: 'sen-horizontales', label: 'Señales Horizontales', icon: 'horizontal_rule', roles: ['admin','supervisor','encuestador'] },
        { kind: 'link', id: 'semaforos',        label: 'Semáforos',            icon: 'traffic', roles: ['admin','supervisor','encuestador'] },
        { kind: 'link', id: 'control-semaforo', label: 'Control Semáforo',     icon: 'tune', roles: ['admin','supervisor','encuestador'] },
        { kind: 'link', id: 'cajas-inspeccion', label: 'Cajas Inspección',     icon: 'inventory_2', roles: ['admin','supervisor','encuestador'] },
        {
            kind: 'group',
            id: 'utils',
            label: 'Utils',
            icon: 'construction',
            roles: ['admin'],
            children: [
                { id: 'importacion', label: 'Importar Excel', icon: 'upload_file' },
                { id: 'catalogos',   label: 'Catálogos',      icon: 'menu_book' },
                { id: 'usuarios',    label: 'Usuarios',       icon: 'groups' },
                { id: 'auditoria',   label: 'Auditoría',      icon: 'fact_check' },
                { id: 'respaldos',   label: 'Respaldos',      icon: 'settings_backup_restore' },
            ],
        },
        { kind: 'link', id: 'mapa-inventario',  label: 'Mapa inventario',      icon: 'map', roles: ['admin','supervisor','encuestador'] },
        { kind: 'link', id: 'reportes',         label: 'Reportes',             icon: 'analytics', roles: ['admin','supervisor'] },
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
        if ((UTILS_ROUTE_IDS as readonly string[]).includes(this.seccionActiva)) {
            this.utilsOpen = true;
        } else {
            this.utilsOpen = false;
        }
    }

    toggleModo() {
        this.modoClaro = !this.modoClaro;
        document.body.classList.toggle('light-mode', this.modoClaro);
        localStorage.setItem('modoClaro', this.modoClaro.toString());
    }

    getMenuEntries(): MenuEntry[] {
        const rol = this.usuario?.rol;
        return this.menuEntries.filter(e => e.roles.includes(rol));
    }

    toggleUtilsMenu(): void {
        this.utilsOpen = !this.utilsOpen;
    }

    /** Cabecera Utils resaltada si estás en una de sus pantallas. */
    isUtilsSectionActive(): boolean {
        return (UTILS_ROUTE_IDS as readonly string[]).includes(this.seccionActiva);
    }

    /** Muestra el submenú si hay ruta Utils activa o el usuario abrió el grupo en el dashboard. */
    get utilsChildrenVisible(): boolean {
        return this.isUtilsSectionActive() || this.utilsOpen;
    }

    utilsChevronIcon(): string {
        return this.utilsChildrenVisible ? 'expand_less' : 'expand_more';
    }

    navegarA(ruta: string) {
        this.router.navigate([`/${ruta}`]);
    }

    isAdmin(): boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }
    isEncuestador(): boolean { return this.authService.isEncuestador(); }

    logout() { this.authService.logout(); }

    getInitials(): string {
        const u = this.usuario;
        if (!u) return 'U';
        return `${u.nombres?.charAt(0)}${u.apellidos?.charAt(0)}`.toUpperCase();
    }
}

