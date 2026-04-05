import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';

Chart.register(...registerables, ChartDataLabels);

type ChartDim = 'estado' | 'fase' | 'accion';

export interface EstadoDistribFila {
    label: string;
    count: number;
    pct: number;
}

@Component({
    selector: 'app-dashboard-home',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard-home.html',
    encapsulation: ViewEncapsulation.None
})
export class DashboardHomeComponent implements OnInit, OnDestroy {
    usuario: any;
    stats: any = null;
    loading = true;
    chartDimension: ChartDim = 'estado';

    /** Geo filters */
    departamentos: string[] = [];
    municipios: string[] = [];
    filtroDepartamento = '';
    filtroMunicipio = '';

    /** Vía tramos + señales V/H (una tarjeta de tablas) */
    readonly estadoDistribucionBloquesVial: ReadonlyArray<{
        statKey: string;
        titulo: string;
        subtitulo: string;
    }> = [
        { statKey: 'tramosPorEstadoVia', titulo: 'Vía tramos', subtitulo: 'Estado de vía' },
        { statKey: 'senVertEstados', titulo: 'Señales verticales', subtitulo: 'Estado' },
        { statKey: 'senHorEstados', titulo: 'Señales horizontales', subtitulo: 'Estado demarcación' }
    ];

    /** Semáforos + control (otra tarjeta, misma fila que la anterior) */
    readonly estadoDistribucionBloquesSem: ReadonlyArray<{
        statKey: string;
        titulo: string;
        subtitulo: string;
    }> = [
        { statKey: 'semaforosEstados', titulo: 'Semáforos', subtitulo: 'Pintura general' },
        { statKey: 'controlSemPorEstadoCtrl', titulo: 'Control semafórico', subtitulo: 'Estado del controlador' }
    ];

    estadoFilasPorBloque: Record<string, EstadoDistribFila[]> = {};

    private charts: Chart[] = [];
    private themeObserver?: MutationObserver;
    private themeDebounceHandle?: ReturnType<typeof setTimeout>;
    private lastChartLightMode: boolean | null = null;

    constructor(
        private authService: AuthService,
        private dashboardService: DashboardService,
        private router: Router,
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.usuario = this.authService.getUsuario();
        this.loadData();
        this.ngZone.runOutsideAngular(() => {
            this.themeObserver = new MutationObserver(() => {
                clearTimeout(this.themeDebounceHandle);
                this.themeDebounceHandle = setTimeout(() => {
                    if (!this.stats || this.loading) return;
                    const light = document.body.classList.contains('light-mode');
                    if (this.lastChartLightMode === light) return;
                    this.lastChartLightMode = light;
                    requestAnimationFrame(() => {
                        this.ngZone.run(() => this.refreshCharts());
                    });
                }, 200);
            });
            this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        });
    }

    ngOnDestroy() {
        clearTimeout(this.themeDebounceHandle);
        this.themeObserver?.disconnect();
        this.destroyCharts();
    }

    isAdmin(): boolean { return this.authService.isAdmin(); }
    isSupervisor(): boolean { return this.authService.isSupervisor(); }
    isEncuestador(): boolean { return this.authService.isEncuestador(); }

    navegarA(ruta: string) { this.router.navigate([`/${ruta}`]); }

    setChartDimension(d: ChartDim) {
        this.chartDimension = d;
        this.cdr.detectChanges();
        this.scheduleChartRefresh();
    }

    onDepartamentoChange() {
        this.filtroMunicipio = '';
        this.loadData();
    }

    onMunicipioChange() {
        this.loadData();
    }

    dimRows(bloque: 'tramos' | 'sv' | 'sh' | 'sem' | 'cs'): { _id: string | null; total: number }[] | undefined {
        const s = this.stats;
        if (!s) return undefined;
        const d = this.chartDimension;
        if (d === 'estado') {
            if (bloque === 'tramos') return s.tramosPorEstadoVia;
            if (bloque === 'sv') return s.senVertEstados;
            if (bloque === 'sh') return s.senHorEstados;
            if (bloque === 'sem') return s.semaforosEstados;
            return s.controlSemPorEstadoCtrl;
        }
        if (d === 'fase') {
            if (bloque === 'tramos') return s.tramosPorFase;
            if (bloque === 'sv') return s.senVertFases;
            if (bloque === 'sh') return s.senHorFases;
            if (bloque === 'sem') return s.semaforosFases;
            return s.controlSemFases;
        }
        if (bloque === 'tramos') return s.tramosPorAccion;
        if (bloque === 'sv') return s.senVertAcciones;
        if (bloque === 'sh') return s.senHorAcciones;
        if (bloque === 'sem') return s.semaforosAcciones;
        return s.controlSemAcciones;
    }

    dimTituloBloque(bloque: 'tramos' | 'sv' | 'sh' | 'sem' | 'cs'): string {
        const n =
            bloque === 'tramos' ? 'Vía tramos'
                : bloque === 'sv' ? 'Señales V.'
                    : bloque === 'sh' ? 'Señales H.'
                        : bloque === 'sem' ? 'Semáforos'
                            : 'Control sem.';
        const dim = this.chartDimension === 'estado' ? 'estado'
            : this.chartDimension === 'fase' ? 'fase' : 'acción';
        return `${n} — ${dim}`;
    }

    private buildEstadoFilasDesdeRaw(raw: { _id: string | null; total: number }[] | undefined): EstadoDistribFila[] {
        if (!raw?.length) return [];
        const sorted = [...raw].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
        const sum = sorted.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
        if (sum <= 0) return [];
        return sorted.map(r => {
            const count = Number(r.total) || 0;
            const pct = Math.round((count * 1000) / sum) / 10;
            return { label: r._id == null || r._id === '' ? 'Sin definir' : String(r._id), count, pct };
        });
    }

    private rebuildEstadoFilasTablas() {
        const next: Record<string, EstadoDistribFila[]> = {};
        const todos = [...this.estadoDistribucionBloquesVial, ...this.estadoDistribucionBloquesSem];
        for (const b of todos) {
            next[b.statKey] = this.buildEstadoFilasDesdeRaw(this.stats?.[b.statKey]);
        }
        this.estadoFilasPorBloque = next;
    }

    estadoFilasTotal(filas: EstadoDistribFila[]): number {
        return filas.reduce((a, f) => a + f.count, 0);
    }

    trackByEstadoLabel(_i: number, fila: EstadoDistribFila): string { return fila.label; }

    private loadData() {
        this.loading = true;

        if (this.isAdmin() || this.isSupervisor()) {
            const params: any = {};
            if (this.filtroDepartamento) params.departamento = this.filtroDepartamento;
            if (this.filtroMunicipio) params.municipio = this.filtroMunicipio;

            this.dashboardService.getStats(params).subscribe({
                next: (res) => {
                    this.stats = res.stats;
                    if (res.stats.departamentos) this.departamentos = res.stats.departamentos;
                    if (res.stats.municipios) this.municipios = res.stats.municipios;
                    this.rebuildEstadoFilasTablas();
                    this.loading = false;
                    this.lastChartLightMode = document.body.classList.contains('light-mode');
                    this.cdr.detectChanges();
                    this.scheduleChartRefresh();
                },
                error: () => { this.loading = false; }
            });
        } else {
            this.loading = false;
        }
    }

    private scheduleChartRefresh(attempt = 0) {
        const delay = attempt === 0 ? 50 : 100;
        setTimeout(() => {
            const bar = document.getElementById('chart-inventario');
            const pie = document.getElementById('chart-inventario-pie');
            if (bar && pie) {
                this.refreshCharts();
            } else if (attempt < 8) {
                this.scheduleChartRefresh(attempt + 1);
            }
        }, delay);
    }

    private theme() {
        const light = document.body.classList.contains('light-mode');
        return {
            light,
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
        if (!this.stats) return;
        this.destroyCharts();

        const t = this.theme();
        const font = getComputedStyle(document.body).fontFamily || "'Inter', sans-serif";
        const fontNum = this.fontNumeric();

        const invLabels = ['Vía tramos', 'Señ. V.', 'Señ. H.', 'Semáforos', 'Ctrl sem.', 'Cajas', 'Cat. vial'];
        const invData = [
            this.stats.totalTramos || 0,
            this.stats.totalSenVert || 0,
            this.stats.totalSenHor || 0,
            this.stats.totalSemaforos || 0,
            this.stats.totalControlSem ?? 0,
            this.stats.totalCajasInsp ?? 0,
            this.stats.totalCategVial ?? 0
        ];
        const invBarBg = [
            'rgba(91,143,255,0.75)', 'rgba(124,92,255,0.75)', 'rgba(0,229,192,0.55)',
            'rgba(255,107,107,0.65)', 'rgba(244,114,182,0.65)', 'rgba(251,191,36,0.7)',
            'rgba(52,211,153,0.72)'
        ];
        const invPieBg = [
            'rgba(91,143,255,0.88)', 'rgba(124,92,255,0.88)', 'rgba(0,229,192,0.75)',
            'rgba(255,107,107,0.82)', 'rgba(244,114,182,0.82)', 'rgba(251,191,36,0.85)',
            'rgba(52,211,153,0.88)'
        ];
        const invBorder = [
            'rgb(91,143,255)', 'rgb(124,92,255)', 'rgb(0,200,170)',
            'rgb(255,90,90)', 'rgb(236,72,153)', 'rgb(245,180,50)', 'rgb(16,185,129)'
        ];
        const invTotal = invData.reduce((a, b) => a + b, 0);

        const barEl = document.getElementById('chart-inventario') as HTMLCanvasElement | null;
        if (barEl) {
            const bar: ChartConfiguration = {
                type: 'bar',
                data: {
                    labels: invLabels,
                    datasets: [{
                        label: 'Registros',
                        data: invData,
                        backgroundColor: invBarBg,
                        borderColor: invBorder,
                        borderWidth: 1,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 0 },
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Inventario total por categoría (barras)',
                            color: t.text,
                            font: { family: font, size: 14, weight: 'bold' }
                        },
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            color: t.text,
                            font: { family: fontNum, size: 11, weight: 'bold' },
                            formatter: (v: number) => v > 0 ? v : ''
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

        const pieEl = document.getElementById('chart-inventario-pie') as HTMLCanvasElement | null;
        if (pieEl) {
            const pie: ChartConfiguration = {
                type: 'pie',
                data: {
                    labels: invLabels,
                    datasets: [{
                        data: invData,
                        backgroundColor: invPieBg,
                        borderColor: t.light ? '#fff' : 'rgba(15,20,40,0.92)',
                        borderWidth: 2,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 0 },
                    layout: { padding: { top: 4, bottom: 8 } },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Inventario total por categoría (distribución)',
                            color: t.text,
                            font: { family: font, size: 14, weight: 'bold' },
                            padding: { bottom: 8 }
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: t.text,
                                font: { family: font, size: 10 },
                                padding: 12,
                                usePointStyle: true,
                                boxWidth: 8
                            }
                        },
                        tooltip: {
                            bodyFont: { family: fontNum, size: 12 },
                            titleFont: { family: font, size: 12 },
                            callbacks: {
                                label: (ctx) => {
                                    const v = Number(ctx.raw) || 0;
                                    const pct = invTotal > 0 ? ((v / invTotal) * 100).toFixed(1) : '0';
                                    return ` ${ctx.label}: ${v} (${pct}%)`;
                                }
                            }
                        },
                        datalabels: {
                            color: '#fff',
                            font: { family: fontNum, size: 11, weight: 'bold' },
                            textShadowColor: 'rgba(0,0,0,0.55)',
                            textShadowBlur: 3,
                            formatter: (value: number) => {
                                const v = Number(value) || 0;
                                if (v <= 0) return '';
                                const pct = invTotal > 0 ? (v / invTotal) * 100 : 0;
                                if (pct < 4) return '';
                                return `${v}\n${pct.toFixed(1)}%`;
                            }
                        }
                    }
                }
            };
            this.charts.push(new Chart(pieEl, pie));
        }

        const bloques: Array<{ id: string; key: 'tramos' | 'sv' | 'sh' | 'sem' | 'cs' }> = [
            { id: 'chart-dim-tramos', key: 'tramos' },
            { id: 'chart-dim-sv', key: 'sv' },
            { id: 'chart-dim-sh', key: 'sh' },
            { id: 'chart-dim-sem', key: 'sem' },
            { id: 'chart-dim-cs', key: 'cs' }
        ];
        for (const b of bloques) {
            this.addDoughnutDim(b.id, this.dimTituloBloque(b.key), this.dimRows(b.key), t, font, fontNum);
        }
    }

    private readonly paletaGenerica = [
        '#5b8cff', '#a78bfa', '#2dd4bf', '#fb923c', '#f472b6',
        '#facc15', '#94a3b8', '#38bdf8', '#4ade80', '#c084fc'
    ];

    private colorPorEstado(label: string): string {
        const l = (label || '').toLowerCase();
        if (l.includes('buen')) return '#4ade80';
        if (l.includes('regular')) return '#fbbf24';
        if (l.includes('mal')) return '#f87171';
        if (l.includes('no se') || l.includes('no reg')) return '#94a3b8';
        if (l.includes('intermit')) return '#fb923c';
        if (l.includes('operativ')) return '#4ade80';
        if (l.includes('funcional')) return '#38bdf8';
        return '#7c9eff';
    }

    private colorPorEtiqueta(label: string, index: number): string {
        if (this.chartDimension === 'estado') return this.colorPorEstado(label);
        return this.paletaGenerica[index % this.paletaGenerica.length];
    }

    private addDoughnutDim(
        canvasId: string, title: string,
        rows: { _id: string | null; total: number }[] | undefined,
        t: { light: boolean; text: string; textMuted: string; grid: string },
        font: string, fontNum: string
    ) {
        const el = document.getElementById(canvasId) as HTMLCanvasElement | null;
        if (!el || !rows?.length) return;

        const labels = rows.map(r => r._id == null || r._id === '' ? 'Sin definir' : String(r._id));
        const data = rows.map(r => r.total);
        const total = data.reduce((a, b) => a + b, 0);
        const colors = labels.map((l, i) => this.colorPorEtiqueta(l, i));

        const cfg: ChartConfiguration = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: t.light ? '#fff' : 'rgba(15,20,40,0.9)',
                    borderWidth: 2,
                    hoverOffset: 8,
                    offset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                layout: { padding: { top: 4, bottom: 4 } },
                plugins: {
                    tooltip: {
                        bodyFont: { family: fontNum, size: 12 },
                        titleFont: { family: font, size: 12 },
                        callbacks: {
                            label: (ctx) => {
                                const v = ctx.parsed;
                                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                                return ` ${ctx.label}: ${v}  (${pct}%)`;
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: t.text,
                            font: { family: font, size: 10 },
                            padding: 10,
                            usePointStyle: true,
                            generateLabels: (chart) => {
                                const ds = chart.data.datasets[0];
                                return (chart.data.labels as string[]).map((lbl, i) => {
                                    const val = (ds.data as number[])[i] || 0;
                                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                                    return {
                                        text: `${lbl}  ${val} (${pct}%)`,
                                        fontColor: t.text,
                                        fillStyle: (ds.backgroundColor as string[])[i],
                                        strokeStyle: (ds.borderColor as string),
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: title,
                        color: t.text,
                        font: { family: font, size: 13, weight: 'bold' },
                        padding: { bottom: 6 }
                    },
                    datalabels: {
                        color: '#fff',
                        font: { family: fontNum, size: 11, weight: 'bold' },
                        textShadowColor: 'rgba(0,0,0,0.55)',
                        textShadowBlur: 3,
                        formatter: (value: number, ctx: any) => {
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                            if (Number(pct) < 5) return '';
                            return `${value}\n${pct}%`;
                        },
                        textAlign: 'center' as const
                    }
                }
            }
        };
        this.charts.push(new Chart(el, cfg));
    }
}
