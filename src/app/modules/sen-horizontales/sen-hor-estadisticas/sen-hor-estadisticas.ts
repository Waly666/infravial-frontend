import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
    ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import * as XLSX from 'xlsx';
import { SenHorService } from '../../../core/services/sen-hor.service';
import { AuthService } from '../../../core/services/auth.service';

Chart.register(...registerables);

export interface FilaDistribucion {
    categoria: string;
    cantidad: number;
    porcentaje: number;
}

export interface BloqueEstadistica {
    id: string;
    tituloHumano: string;
    tituloVariable: string;
    filas: FilaDistribucion[];
}

export interface SeccionEstadistica {
    id: string;
    titulo: string;
    descripcion: string;
    bloques: BloqueEstadistica[];
}

@Component({
    selector: 'app-sen-hor-estadisticas',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './sen-hor-estadisticas.html',
    styleUrl: './sen-hor-estadisticas.scss',
    encapsulation: ViewEncapsulation.None
})
export class SenHorEstadisticasComponent implements OnInit, OnDestroy {
    loading = true;
    error = '';

    totalRegistros = 0;
    secciones: SeccionEstadistica[] = [];
    catalogos: {
        departamentos: string[];
        municipios: string[];
        tiposLocalidad: string[];
        jornadas: { _id: string; etiqueta: string }[];
    } = { departamentos: [], municipios: [], tiposLocalidad: [], jornadas: [] };

    filtroDepartamento = '';
    filtroMunicipio = '';
    filtroTipoLocalidad = '';
    filtroIdJornada = '';
    fechaDesde = '';
    fechaHasta = '';

    private charts = new Map<string, Chart>();
    private themeObserver?: MutationObserver;
    private chartRedrawTimer?: ReturnType<typeof setTimeout>;

    constructor(
        private senHorService: SenHorService,
        private auth: AuthService,
        public router: Router,
        private cdr: ChangeDetectorRef,
        private ngZone: NgZone
    ) {}

    ngOnInit() {
        if (!this.auth.isAdmin() && !this.auth.isSupervisor()) {
            this.router.navigate(['/dashboard']);
            return;
        }
        this.load();
        this.ngZone.runOutsideAngular(() => {
            this.themeObserver = new MutationObserver(() => {
                clearTimeout(this.chartRedrawTimer);
                this.chartRedrawTimer = setTimeout(() => {
                    if (!this.secciones.length || this.loading) return;
                    this.ngZone.run(() => this.scheduleCharts());
                }, 250);
            });
            this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        });
    }

    ngOnDestroy() {
        clearTimeout(this.chartRedrawTimer);
        this.themeObserver?.disconnect();
        this.destroyCharts();
    }

    load() {
        this.loading = true;
        this.error = '';
        const q = this.queryParams();
        this.senHorService.getEstadisticas(q).subscribe({
            next: (res) => {
                this.totalRegistros = res.totalRegistros ?? 0;
                this.secciones = res.secciones ?? [];
                this.catalogos = res.catalogos ?? this.catalogos;
                this.loading = false;
                this.cdr.detectChanges();
                this.scheduleCharts();
            },
            error: (e) => {
                this.error = e?.error?.message || 'No se pudieron cargar las estadísticas.';
                this.loading = false;
            }
        });
    }

    onDepartamentoChange() {
        this.filtroMunicipio = '';
        this.load();
    }

    aplicarFiltros() {
        this.load();
    }

    limpiarFiltros() {
        this.filtroDepartamento = '';
        this.filtroMunicipio = '';
        this.filtroTipoLocalidad = '';
        this.filtroIdJornada = '';
        this.fechaDesde = '';
        this.fechaHasta = '';
        this.load();
    }

    canvasId(secId: string, bloqueId: string, orient: 'h' | 'v' | 'd'): string {
        return `sh-${secId}-${bloqueId}-${orient}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    trackSec(_i: number, s: SeccionEstadistica) {
        return s.id;
    }

    trackBloque(_i: number, b: BloqueEstadistica) {
        return b.id;
    }

    sumaCantidades(filas: FilaDistribucion[]): number {
        return filas.reduce((a, f) => a + f.cantidad, 0);
    }

    descargarGrafico(secId: string, bloqueId: string, orient: 'h' | 'v' | 'd') {
        const id = this.canvasId(secId, bloqueId, orient);
        const ch = this.charts.get(id);
        if (!ch) return;
        const url = ch.toBase64Image('image/png', 1);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sen-hor_${bloqueId}_${orient}.png`;
        a.click();
    }

    exportarExcel() {
        if (!this.secciones.length) return;
        const wb = XLSX.utils.book_new();
        const used = new Set<string>();

        const metaRows: (string | number)[][] = [
            ['INFRAVIAL — Estadísticas Señales horizontales (ExistSenHor)'],
            ['Generado', new Date().toLocaleString('es-CO')],
            ['Registros (filtro actual)', this.totalRegistros],
            [],
            ['Nota', 'Departamento / municipio / tipo localidad filtran por el tramo vinculado (ViaTramo).'],
            [],
            ['Filtros'],
            ['Departamento (vía tramo)', this.filtroDepartamento || '(todos)'],
            ['Municipio (vía tramo)', this.filtroMunicipio || '(todos)'],
            ['Tipo localidad (vía tramo)', this.filtroTipoLocalidad || '(todos)'],
            ['Id jornada (señal)', this.filtroIdJornada || '(todas)'],
            ['Fecha creación señal desde', this.fechaDesde || '(sin límite)'],
            ['Fecha creación señal hasta', this.fechaHasta || '(sin límite)']
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaRows), this.uniqueSheet('Metadatos', used));

        for (const sec of this.secciones) {
            for (const b of sec.bloques) {
                const rows: (string | number)[][] = [
                    ['Sección', sec.titulo],
                    ['Variable', b.tituloVariable],
                    ['Descripción humana', b.tituloHumano],
                    [],
                    ['Categoría', 'Cantidad', '%']
                ];
                for (const f of b.filas) {
                    rows.push([f.categoria, f.cantidad, f.porcentaje]);
                }
                rows.push([]);
                rows.push(['Total filas', b.filas.length]);
                rows.push(['Suma cantidades', this.sumaCantidades(b.filas)]);

                const sh = this.uniqueSheet(`${sec.titulo.slice(0, 12)}_${b.tituloVariable}`, used);
                XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sh);
            }
        }

        XLSX.writeFile(wb, `estadisticas-sen-hor_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    private uniqueSheet(base: string, used: Set<string>): string {
        let s = base.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
        if (!s) s = 'Hoja';
        if (!used.has(s)) {
            used.add(s);
            return s;
        }
        let n = 2;
        let cand = `${s.slice(0, 28)}_${n}`;
        while (used.has(cand)) {
            n++;
            cand = `${s.slice(0, 28)}_${n}`;
        }
        used.add(cand);
        return cand;
    }

    private queryParams(): Record<string, string | undefined> {
        const o: Record<string, string | undefined> = {};
        if (this.filtroDepartamento) o['departamento'] = this.filtroDepartamento;
        if (this.filtroMunicipio) o['municipio'] = this.filtroMunicipio;
        if (this.filtroTipoLocalidad) o['tipoLocalidad'] = this.filtroTipoLocalidad;
        if (this.filtroIdJornada) o['idJornada'] = this.filtroIdJornada;
        if (this.fechaDesde) o['fechaDesde'] = this.fechaDesde;
        if (this.fechaHasta) o['fechaHasta'] = this.fechaHasta;
        return o;
    }

    private scheduleCharts() {
        setTimeout(() => {
            this.destroyCharts();
            this.renderCharts();
        }, 60);
    }

    private destroyCharts() {
        this.charts.forEach((c) => c.destroy());
        this.charts.clear();
    }

    private theme() {
        const light = document.body.classList.contains('light-mode');
        return {
            light,
            text: light ? '#1a2540' : 'rgba(232, 240, 255, 0.92)',
            muted: light ? 'rgba(26, 37, 64, 0.55)' : 'rgba(180, 200, 255, 0.55)',
            grid: light ? 'rgba(37, 99, 235, 0.12)' : 'rgba(148, 180, 255, 0.08)'
        };
    }

    private paleta(i: number): string {
        const c = [
            'rgba(96, 165, 250, 0.88)',
            'rgba(59, 130, 246, 0.88)',
            'rgba(45, 212, 191, 0.88)',
            'rgba(251, 146, 60, 0.88)',
            'rgba(244, 114, 182, 0.88)',
            'rgba(250, 204, 21, 0.88)',
            'rgba(148, 163, 184, 0.88)',
            'rgba(56, 189, 248, 0.88)',
            'rgba(74, 222, 128, 0.88)',
            'rgba(129, 140, 248, 0.88)'
        ];
        return c[i % c.length];
    }

    private renderCharts() {
        const t = this.theme();
        const font = getComputedStyle(document.body).fontFamily || 'system-ui,sans-serif';

        for (const sec of this.secciones) {
            for (const bloque of sec.bloques) {
                if (!bloque.filas?.length) continue;
                this.drawBar(sec.id, bloque, 'h', t, font);
                this.drawBar(sec.id, bloque, 'v', t, font);
                this.drawDoughnut(sec.id, bloque, t, font);
            }
        }
    }

    private drawBar(
        secId: string,
        bloque: BloqueEstadistica,
        orient: 'h' | 'v',
        t: { light: boolean; text: string; muted: string; grid: string },
        font: string
    ) {
        const id = this.canvasId(secId, bloque.id, orient);
        const el = document.getElementById(id) as HTMLCanvasElement | null;
        if (!el) return;

        const labels = bloque.filas.map((f) =>
            f.categoria.length > 42 ? f.categoria.slice(0, 40) + '…' : f.categoria
        );
        const values = bloque.filas.map((f) => f.cantidad);
        const bg = bloque.filas.map((_, i) => this.paleta(i));

        const horizontal = orient === 'h';
        const cfg: ChartConfiguration = {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Cantidad',
                        data: values,
                        backgroundColor: bg,
                        borderColor: t.light ? 'rgba(37,99,235,0.25)' : 'rgba(15,20,40,0.5)',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                indexAxis: horizontal ? 'y' : 'x',
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: horizontal ? 'Barras horizontales' : 'Columnas (barras verticales)',
                        color: t.text,
                        font: { family: font, size: 12, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (ctx) => {
                                const f = bloque.filas[ctx.dataIndex];
                                return f ? `${f.porcentaje}% del total filtrado` : '';
                            }
                        }
                    }
                },
                scales: horizontal
                    ? {
                          x: {
                              beginAtZero: true,
                              ticks: { color: t.muted, font: { size: 10 } },
                              grid: { color: t.grid }
                          },
                          y: {
                              ticks: { color: t.muted, font: { size: 10 } },
                              grid: { display: false }
                          }
                      }
                    : {
                          x: {
                              ticks: { color: t.muted, font: { size: 9 }, maxRotation: 50 },
                              grid: { color: t.grid }
                          },
                          y: {
                              beginAtZero: true,
                              ticks: { color: t.muted, font: { size: 10 } },
                              grid: { color: t.grid }
                          }
                      }
            }
        };

        this.charts.set(id, new Chart(el, cfg));
    }

    private drawDoughnut(
        secId: string,
        bloque: BloqueEstadistica,
        t: { text: string; muted: string; light: boolean },
        font: string
    ) {
        const id = this.canvasId(secId, bloque.id, 'd');
        const el = document.getElementById(id) as HTMLCanvasElement | null;
        if (!el) return;

        const labels = bloque.filas.map((f) =>
            f.categoria.length > 28 ? f.categoria.slice(0, 26) + '…' : f.categoria
        );
        const values = bloque.filas.map((f) => f.cantidad);
        const bg = bloque.filas.map((_, i) => this.paleta(i));

        const cfg: ChartConfiguration = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [
                    {
                        data: values,
                        backgroundColor: bg,
                        borderColor: t.light ? '#fff' : 'rgba(12,16,32,0.95)',
                        borderWidth: 2,
                        hoverOffset: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: t.muted,
                            font: { family: font, size: 9 },
                            boxWidth: 10
                        }
                    },
                    title: {
                        display: true,
                        text: 'Distribución proporcional',
                        color: t.text,
                        font: { family: font, size: 12, weight: 'bold' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const f = bloque.filas[ctx.dataIndex];
                                const v = ctx.parsed;
                                return f ? `${ctx.label}: ${v} (${f.porcentaje}%)` : `${v}`;
                            }
                        }
                    }
                }
            }
        };

        this.charts.set(id, new Chart(el, cfg));
    }
}
