import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { JornadaService } from '../../../core/services/jornada.service';

Chart.register(...registerables);

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {

    usuario: any;
    stats: any    = null;
    jornada: any  = null;
    loading       = true;
    seccionActiva = 'dashboard';
    modoClaro = false;

    private charts: Chart[] = [];

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
        { id: 'reportes',         label: 'Reportes',           icon: 'analytics', roles: ['admin','supervisor'] },
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
        this.modoClaro = localStorage.getItem('modoClaro') === 'true';
        document.body.classList.toggle('light-mode', this.modoClaro);
    }

    ngOnDestroy() {
        this.destroyCharts();
    }

    toggleModo() {
        this.modoClaro = !this.modoClaro;
        document.body.classList.toggle('light-mode', this.modoClaro);
        localStorage.setItem('modoClaro', this.modoClaro.toString());
        requestAnimationFrame(() => requestAnimationFrame(() => this.refreshCharts()));
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
                    requestAnimationFrame(() => requestAnimationFrame(() => this.refreshCharts()));
                },
                error: () => {
                    this.loading = false;
                }
            });
        } else {
            this.loading = false;
        }
    }

    private theme() {
        const light = document.body.classList.contains('light-mode');
        return {
            text: light ? '#1a2540' : 'rgba(232, 240, 255, 0.92)',
            textMuted: light ? 'rgba(26, 37, 64, 0.55)' : 'rgba(180, 200, 255, 0.5)',
            grid: light ? 'rgba(37, 99, 235, 0.12)' : 'rgba(148, 180, 255, 0.08)'
        };
    }

    /** Tipografía para ejes, conteos y tooltips (cifras y fechas en gráficos). */
    private fontNumeric(): string {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim();
        return raw || "'JetBrains Mono', ui-monospace, monospace";
    }

    private destroyCharts() {
        this.charts.forEach(c => c.destroy());
        this.charts = [];
    }

    private refreshCharts() {
        this.destroyCharts();
        if (!this.stats) return;

        const t = this.theme();
        const font = getComputedStyle(document.body).fontFamily || "'Syne', sans-serif";
        const fontNum = this.fontNumeric();

        const barEl = document.getElementById('chart-inventario') as HTMLCanvasElement | null;
        if (barEl) {
      const bar: ChartConfiguration = {
                type: 'bar',
                data: {
                    labels: ['Vía tramos', 'Señ. verticales', 'Señ. horizontales', 'Semáforos', 'Cajas insp.'],
                    datasets: [{
                        label: 'Registros',
                        data: [
                            this.stats.totalTramos || 0,
                            this.stats.totalSenVert || 0,
                            this.stats.totalSenHor || 0,
                            this.stats.totalSemaforos || 0,
                            this.stats.totalCajasInsp ?? 0
                        ],
                        backgroundColor: [
                            'rgba(91, 143, 255, 0.75)',
                            'rgba(124, 92, 255, 0.75)',
                            'rgba(0, 229, 192, 0.55)',
                            'rgba(255, 107, 107, 0.65)',
                            'rgba(251, 191, 36, 0.7)'
                        ],
                        borderColor: [
                            'rgb(91, 143, 255)',
                            'rgb(124, 92, 255)',
                            'rgb(0, 200, 170)',
                            'rgb(255, 90, 90)',
                            'rgb(245, 180, 50)'
                        ],
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Inventario total por categoría',
                            color: t.text,
                            font: { family: font, size: 14, weight: 'bold' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: t.textMuted, font: { family: font, size: 11 } },
                            grid: { color: t.grid }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: t.textMuted, font: { family: fontNum, size: 11 }, precision: 0 },
                            grid: { color: t.grid }
                        }
                    }
                }
            };
            this.charts.push(new Chart(barEl, bar));
        }

        const lineEl = document.getElementById('chart-tramos-mes') as HTMLCanvasElement | null;
        const porMes = this.stats.tramosPorMes as { _id: string; total: number }[] | undefined;
        if (lineEl && porMes?.length) {
            const labels = porMes.map(p => this.formatMesEtiqueta(p._id));
      const line: ChartConfiguration = {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Tramos registrados',
                        data: porMes.map(p => p.total),
                        fill: true,
                        tension: 0.35,
                        borderColor: 'rgb(91, 143, 255)',
                        backgroundColor: 'rgba(91, 143, 255, 0.15)',
                        pointBackgroundColor: 'rgb(124, 92, 255)',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: { color: t.textMuted, font: { family: font } }
                        },
                        title: {
                            display: true,
                            text: 'Tramos registrados por mes (últimos 6 meses)',
                            color: t.text,
                            font: { family: font, size: 14, weight: 'bold' }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: t.textMuted, font: { family: fontNum, size: 11 } },
                            grid: { color: t.grid }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: t.textMuted, font: { family: fontNum, size: 11 }, precision: 0 },
                            grid: { color: t.grid }
                        }
                    }
                }
            };
            this.charts.push(new Chart(lineEl, line));
        }

        this.addDoughnut(
            'chart-estado-sv',
            'Señales verticales por estado',
            this.stats.senVertEstados,
            t,
            font,
            fontNum
        );
        this.addDoughnut(
            'chart-estado-sh',
            'Señales horizontales por estado',
            this.stats.senHorEstados,
            t,
            font,
            fontNum
        );
        this.addDoughnut(
            'chart-estado-sem',
            'Semáforos — pintura general',
            this.stats.semaforosEstados,
            t,
            font,
            fontNum
        );
    }

    private formatMesEtiqueta(ym: string): string {
        if (!ym || ym.length < 7) return ym || '';
        const [y, m] = ym.split('-');
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const mi = parseInt(m, 10) - 1;
        return `${meses[mi] || m} ${y?.slice(2)}`;
    }

    private colorPorEstado(label: string): string {
        const l = (label || '').toLowerCase();
        if (l.includes('buen')) return '#4ade80';
        if (l.includes('regular')) return '#fbbf24';
        if (l.includes('mal')) return '#f87171';
        if (l.includes('no se') || l.includes('no reg') || l.includes('no registra')) return '#94a3b8';
        if (l.includes('intermit')) return '#fb923c';
        if (l.includes('operativ')) return '#4ade80';
        if (l.includes('funcional')) return '#38bdf8';
        return '#7c9eff';
    }

    private addDoughnut(
        canvasId: string,
        title: string,
        rows: { _id: string | null; total: number }[] | undefined,
        t: { text: string; textMuted: string; grid: string },
        font: string,
        fontNum: string
    ) {
        const el = document.getElementById(canvasId) as HTMLCanvasElement | null;
        if (!el || !rows?.length) return;

        const labels = rows.map(r => (r._id == null || r._id === '') ? 'Sin clasificar' : String(r._id));
        const data = rows.map(r => r.total);
        const colors = labels.map(l => this.colorPorEstado(l));

        const cfg: ChartConfiguration = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: document.body.classList.contains('light-mode') ? '#fff' : 'rgba(15, 20, 40, 0.9)',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        bodyFont: { family: fontNum, size: 12 },
                        titleFont: { family: font, size: 12 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: t.textMuted,
                            font: { family: font, size: 11 },
                            padding: 12,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: true,
                        text: title,
                        color: t.text,
                        font: { family: font, size: 14, weight: 'bold' },
                        padding: { bottom: 8 }
                    }
                }
            }
        };
        this.charts.push(new Chart(el, cfg));
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
