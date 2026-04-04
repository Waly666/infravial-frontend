import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import {
    DataTransferService,
    ALL_TABLES,
    TableProgress,
    PhotoProgress
} from '../../core/services/data-transfer.service';

@Component({
    selector: 'app-data-transfer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './data-transfer.html',
    styleUrl: './data-transfer.scss'
})
export class DataTransferComponent implements OnInit, OnDestroy {

    // ── Tabs ──────────────────────────────────────────────────────────────────
    tabActiva: 'exportar' | 'importar' = 'exportar';

    // ── Opciones de filtros ───────────────────────────────────────────────────
    departamentos: string[] = [];
    municipios: string[]    = [];
    jornadas: any[]         = [];
    cargandoOpciones        = false;

    // ── Exportar ──────────────────────────────────────────────────────────────
    tipoFiltro: 'departamento' | 'municipio' | 'jornada' = 'municipio';
    valorFiltro = '';
    fechaDesde  = '';
    fechaHasta  = '';
    tablasSeleccionadas: Set<string> = new Set([
        'jornadas',
        'via-tramos', 'sen-verticales', 'sen-horizontales',
        'semaforos', 'control-semaforo', 'cajas-inspeccion'
    ]);
    exportando = false;

    // ── Importar ──────────────────────────────────────────────────────────────
    archivoImport: File | null = null;
    dryRun    = true;
    importando = false;

    // ── Progreso compartido ───────────────────────────────────────────────────
    estadoJob: 'idle' | 'running' | 'done' | 'error' = 'idle';
    jobId: string | null = null;
    tablaProgreso: Record<string, TableProgress> = {};
    fotosProgreso: PhotoProgress = { total: 0, current: 0, ok: 0, err: 0 };
    errorMsg   = '';
    mensajeOk  = '';

    readonly allTables = ALL_TABLES;
    private sse: EventSource | null = null;

    constructor(
        private dtService: DataTransferService,
        private authService: AuthService,
        private ngZone: NgZone,
        public router: Router
    ) {}

    ngOnInit(): void {
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/dashboard']);
            return;
        }
        this.cargarOpciones();
    }

    ngOnDestroy(): void {
        this.cerrarSSE();
    }

    // ── Opciones ──────────────────────────────────────────────────────────────
    cargarOpciones(): void {
        this.cargandoOpciones = true;
        this.dtService.getOpciones()
            .pipe(finalize(() => this.cargandoOpciones = false))
            .subscribe({
                next: (res) => {
                    this.departamentos = res.departamentos;
                    this.municipios    = res.municipios;
                    this.jornadas      = res.jornadas;
                },
                error: () => { /* silencioso */ }
            });
    }

    get filtroOpciones(): string[] {
        if (this.tipoFiltro === 'departamento') return this.departamentos;
        if (this.tipoFiltro === 'municipio')    return this.municipios;
        return [];
    }

    onTipoFiltroChange(): void {
        this.valorFiltro = '';
    }

    jornadaLabel(j: any): string {
        return `${j.municipio} — ${j.dpto} (${j.estado})`;
    }

    // ── Tablas ────────────────────────────────────────────────────────────────
    toggleTabla(key: string): void {
        if (this.tablasSeleccionadas.has(key)) this.tablasSeleccionadas.delete(key);
        else this.tablasSeleccionadas.add(key);
    }

    toggleTodas(sol: boolean): void {
        if (sol) this.allTables.forEach(t => this.tablasSeleccionadas.add(t.key));
        else     this.tablasSeleccionadas.clear();
    }

    get operacionales() { return this.allTables.filter(t => !t.catalog); }
    get catalogos()     { return this.allTables.filter(t =>  t.catalog); }

    // ── Archivo importación ───────────────────────────────────────────────────
    onFileChange(ev: Event): void {
        const f = (ev.target as HTMLInputElement).files?.[0];
        this.archivoImport = f ?? null;
        this.resetProgreso();
    }

    // ── SSE ───────────────────────────────────────────────────────────────────
    private cerrarSSE(): void {
        this.sse?.close();
        this.sse = null;
    }

    private iniciarSSE(jobId: string): void {
        this.cerrarSSE();
        this.jobId        = jobId;
        this.estadoJob    = 'running';
        this.tablaProgreso = {};
        this.fotosProgreso = { total: 0, current: 0, ok: 0, err: 0 };

        this.sse = this.dtService.openProgressStream(jobId);

        this.sse.onmessage = (event) => {
            // EventSource corre fuera de la zona Angular → usar ngZone.run()
            this.ngZone.run(() => {
                const data = JSON.parse(event.data);

                if (data.type === 'snapshot') {
                    this.tablaProgreso = data.tables ?? {};
                    this.fotosProgreso = data.photos  ?? this.fotosProgreso;
                    // Reflejar estado real del job en el snapshot
                    if (data.status === 'error') {
                        this.estadoJob  = 'error';
                        this.errorMsg   = data.error ?? 'Error en el servidor durante el proceso.';
                        this.exportando = false;
                        this.importando = false;
                        this.cerrarSSE();
                    } else if (data.status === 'done') {
                        this.estadoJob = 'done';
                    } else {
                        this.estadoJob = 'running';
                    }
                } else if (data.type === 'complete') {
                    this.estadoJob = 'done';
                    this.mensajeOk = data.jobType === 'export'
                        ? 'Exportación completada. Puedes descargar el ZIP.'
                        : 'Importación completada correctamente.';
                    this.exportando = false;
                    this.importando = false;
                    this.cerrarSSE();
                }
            });
        };

        this.sse.onerror = () => {
            this.ngZone.run(() => {
                this.estadoJob  = 'error';
                this.errorMsg   = 'Se perdió la conexión con el servidor durante el proceso.';
                this.exportando = false;
                this.importando = false;
                this.cerrarSSE();
            });
        };
    }

    // ── Acciones ──────────────────────────────────────────────────────────────
    ejecutarExportacion(): void {
        if (this.exportando || !this.valorFiltro || !this.tablasSeleccionadas.size) return;

        this.resetProgreso();
        this.exportando = true;

        this.dtService.startExport({
            tipoFiltro:  this.tipoFiltro,
            valorFiltro: this.valorFiltro,
            fechaDesde:  this.fechaDesde  || undefined,
            fechaHasta:  this.fechaHasta  || undefined,
            tablas:      Array.from(this.tablasSeleccionadas)
        }).subscribe({
            next: ({ jobId }) => this.iniciarSSE(jobId),
            error: (err) => {
                this.exportando = false;
                this.errorMsg   = err?.error?.message ?? 'Error al iniciar la exportación.';
                this.estadoJob  = 'error';
            }
        });
    }

    ejecutarImportacion(): void {
        if (this.importando || !this.archivoImport) return;

        this.resetProgreso();
        this.importando = true;

        this.dtService.startImport(this.archivoImport, this.dryRun).subscribe({
            next: ({ jobId }) => this.iniciarSSE(jobId),
            error: (err) => {
                this.importando = false;
                this.errorMsg   = err?.error?.message ?? 'Error al iniciar la importación.';
                this.estadoJob  = 'error';
            }
        });
    }

    descargarExport(): void {
        if (!this.jobId) return;
        this.dtService.downloadExport(this.jobId).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const a   = document.createElement('a');
                a.href     = url;
                a.download = `infravial-export-${new Date().toISOString().slice(0, 10)}.zip`;
                a.click();
                URL.revokeObjectURL(url);
            },
            error: () => { this.errorMsg = 'No se pudo descargar el archivo.'; }
        });
    }

    // ── Progreso helpers ──────────────────────────────────────────────────────
    private resetProgreso(): void {
        this.estadoJob    = 'idle';
        this.tablaProgreso = {};
        this.fotosProgreso = { total: 0, current: 0, ok: 0, err: 0 };
        this.errorMsg     = '';
        this.mensajeOk    = '';
        this.jobId        = null;
    }

    pct(current: number, total: number): number {
        if (!total) return 0;
        return Math.min(100, Math.round((100 * current) / total));
    }

    tableEntries(): Array<[string, TableProgress]> {
        return Object.entries(this.tablaProgreso);
    }

    get hayProgreso(): boolean {
        return this.estadoJob !== 'idle';
    }
}
