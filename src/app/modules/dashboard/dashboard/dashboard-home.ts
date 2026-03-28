import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';

Chart.register(...registerables);

@Component({
    selector: 'app-dashboard-home',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dashboard-home.html',
    // Styles are provided by dashboard layout (ViewEncapsulation.None there)
    encapsulation: ViewEncapsulation.None
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
    usuario: any;
    stats: any = null;
    loading = true;

    private charts: Chart[] = [];

    constructor(
        private authService: AuthService,
        private dashboardService: DashboardService,
        private router: Router
    ) {}

    ngOnInit() {
        this.usuario = this.authService.getUsuario();
        this.loadData();
    }

    ngOnDestroy() {
        this.destroyCharts();
    }

    isAdmin(): boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }
    isEncuestador(): boolean { return this.authService.isEncuestador(); }

    navegarA(ruta: string) {
        this.router.navigate([`/${ruta}`]);
    }

    private loadData() {
        this.loading = true;

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
                        legend: { labels: { color: t.textMuted, font: { family: font } } },
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
}

