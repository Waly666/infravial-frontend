import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { JornadaService } from '../../../core/services/jornada.service';

const UTILS_ROUTE_IDS       = ['data-transfer', 'catalogos', 'usuarios', 'auditoria', 'respaldos'] as const;
const INVENTARIO_ROUTE_IDS  = ['via-tramos', 'sen-verticales', 'sen-horizontales', 'semaforos', 'control-semaforo', 'cajas-inspeccion', 'mapa-inventario'] as const;
const CARRETERAS_ROUTE_IDS  = ['categorizacion-vial', 'sinc'] as const;
const CONTEOS_ROUTE_IDS     = ['conteos-proyectos', 'conteos-estaciones', 'conteos-conteos', 'conteos-sesion', 'conteos-panel'] as const;

type MenuLink = { id: string; label: string; icon: string };
type MenuEntry =
    | { kind: 'link';  id: string; label: string; icon: string; roles: string[] }
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

    /** Estado abierto/cerrado de cada grupo por su id. */
    private groupOpen: Record<string, boolean> = {
        inventario: false,
        carreteras: false,
        conteos: false,
        utils: false,
    };

    private readonly menuEntries: MenuEntry[] = [
        { kind: 'link',  id: 'dashboard',   label: 'Dashboard', icon: 'space_dashboard', roles: ['admin','supervisor','encuestador','invitado'] },
        { kind: 'link',  id: 'jornadas',    label: 'Jornadas',  icon: 'calendar_month',  roles: ['admin','supervisor'] },
        {
            kind: 'group',
            id: 'inventario',
            label: 'Inventario Vial Urbano',
            icon: 'location_city',
            roles: ['admin','supervisor','encuestador'],
            children: [
                { id: 'via-tramos',       label: 'Vía Tramos',           icon: 'route' },
                { id: 'sen-verticales',   label: 'Señales Verticales',   icon: 'vertical_align_top' },
                { id: 'sen-horizontales', label: 'Señales Horizontales', icon: 'horizontal_rule' },
                { id: 'semaforos',        label: 'Semáforos',            icon: 'traffic' },
                { id: 'control-semaforo', label: 'Control Semáforo',     icon: 'tune' },
                { id: 'cajas-inspeccion', label: 'Cajas Inspección',     icon: 'inventory_2' },
                { id: 'mapa-inventario',  label: 'Mapa Inventario',      icon: 'map' },
            ],
        },
        {
            kind: 'group',
            id: 'carreteras',
            label: 'Inventario Carreteras',
            icon: 'add_road',
            roles: ['admin','supervisor','encuestador'],
            children: [
                { id: 'categorizacion-vial', label: 'Clasificación Vías', icon: 'account_tree' },
                { id: 'sinc',                label: 'SINC',               icon: 'conversion_path' },
            ],
        },
        {
            kind: 'group',
            id: 'conteos',
            label: 'Conteos Vehiculares',
            icon: 'traffic',
            roles: ['admin','supervisor','encuestador'],
            children: [
                { id: 'conteos-proyectos',  label: 'Proyectos',   icon: 'work' },
                { id: 'conteos-estaciones', label: 'Estaciones',  icon: 'location_on' },
                { id: 'conteos-conteos',    label: 'Conteos',     icon: 'bar_chart' },
            ]
        },
        {
            kind: 'group',
            id: 'utils',
            label: 'Utils',
            icon: 'construction',
            roles: ['admin'],
            children: [
                { id: 'data-transfer', label: 'Transferencia Datos', icon: 'sync_alt' },
                { id: 'catalogos',     label: 'Catálogos',           icon: 'menu_book' },
                { id: 'usuarios',      label: 'Usuarios',            icon: 'groups' },
                { id: 'auditoria',     label: 'Auditoría',           icon: 'fact_check' },
                { id: 'respaldos',     label: 'Respaldos',           icon: 'settings_backup_restore' },
            ],
        },
        { kind: 'link',  id: 'reportes', label: 'Reportes', icon: 'analytics', roles: ['admin','supervisor'] },
    ];

    constructor(
        private authService: AuthService,
        private jornadaService: JornadaService,
        private router: Router
    ) {}

    ngOnInit() {
        this.usuario  = this.authService.getUsuario();
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
        const parts = clean.replace(/^\//, '').split('/');
        const seg0  = parts[0] || 'dashboard';
        const seg1  = parts[1] || '';

        // Para grupos con subrutas, construir id compuesto (ej: /conteos/proyectos → 'conteos-proyectos')
        if (seg0 === 'conteos' && seg1) {
            this.seccionActiva = `conteos-${seg1}`;
        } else {
            this.seccionActiva = seg0 === '' ? 'dashboard' : seg0;
        }

        // Abrir automáticamente el grupo cuya ruta está activa
        this.groupOpen['utils']      = (UTILS_ROUTE_IDS      as readonly string[]).includes(this.seccionActiva);
        this.groupOpen['inventario'] = (INVENTARIO_ROUTE_IDS as readonly string[]).includes(this.seccionActiva);
        this.groupOpen['carreteras'] = (CARRETERAS_ROUTE_IDS as readonly string[]).includes(this.seccionActiva);
        this.groupOpen['conteos']    = this.seccionActiva.startsWith('conteos-');
    }

    // ── Grupo genérico ──────────────────────────────────────────────────────────

    toggleGroup(id: string): void {
        this.groupOpen[id] = !this.groupOpen[id];
    }

    isGroupSectionActive(id: string): boolean {
        if (id === 'utils')      return (UTILS_ROUTE_IDS      as readonly string[]).includes(this.seccionActiva);
        if (id === 'inventario') return (INVENTARIO_ROUTE_IDS as readonly string[]).includes(this.seccionActiva);
        if (id === 'carreteras') return (CARRETERAS_ROUTE_IDS as readonly string[]).includes(this.seccionActiva);
        if (id === 'conteos')    return this.seccionActiva.startsWith('conteos-');
        return false;
    }

    isGroupVisible(id: string): boolean {
        return this.isGroupSectionActive(id) || !!this.groupOpen[id];
    }

    groupChevron(id: string): string {
        return this.isGroupVisible(id) ? 'expand_less' : 'expand_more';
    }

    // ── Compatibilidad con template (utils) ────────────────────────────────────

    /** @deprecated usar isGroupSectionActive('utils') */
    isUtilsSectionActive(): boolean { return this.isGroupSectionActive('utils'); }
    /** @deprecated usar isGroupVisible('utils') */
    get utilsChildrenVisible(): boolean { return this.isGroupVisible('utils'); }
    /** @deprecated usar toggleGroup('utils') */
    toggleUtilsMenu(): void { this.toggleGroup('utils'); }
    /** @deprecated usar groupChevron('utils') */
    utilsChevronIcon(): string { return this.groupChevron('utils'); }

    // ── Resto ──────────────────────────────────────────────────────────────────

    toggleModo() {
        this.modoClaro = !this.modoClaro;
        document.body.classList.toggle('light-mode', this.modoClaro);
        localStorage.setItem('modoClaro', this.modoClaro.toString());
    }

    getMenuEntries(): MenuEntry[] {
        const rol = this.usuario?.rol;
        return this.menuEntries.filter(e => e.roles.includes(rol));
    }

    navegarA(ruta: string) {
        let destino: string;
        if      (ruta === 'sinc')               destino = '/sinc/ejes';
        else if (ruta === 'conteos')            destino = '/conteos/proyectos';
        else if (ruta === 'conteos-proyectos')  destino = '/conteos/proyectos';
        else if (ruta === 'conteos-estaciones') destino = '/conteos/estaciones';
        else if (ruta === 'conteos-conteos')    destino = '/conteos/conteos';
        else                                    destino = `/${ruta}`;
        this.router.navigate([destino]);
    }

    isAdmin():      boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }
    isEncuestador():boolean { return this.authService.isEncuestador(); }

    logout() { this.authService.logout(); }

    getInitials(): string {
        const u = this.usuario;
        if (!u) return 'U';
        return `${u.nombres?.charAt(0)}${u.apellidos?.charAt(0)}`.toUpperCase();
    }
}
