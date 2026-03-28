import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import {
    ImportService,
    ImportStatusPayload
} from '../../core/services/import.service';

@Component({
    selector: 'app-import-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './import-admin.html',
    styleUrl: './import-admin.scss'
})
export class ImportAdminComponent implements OnInit, OnDestroy {
    archivo: File | null = null;
    dryRun = true;
    subiendo = false;
    revirtiendo = false;
    mensaje = '';
    error = '';
    status: ImportStatusPayload | null = null;

    private pollId: ReturnType<typeof setInterval> | null = null;

    constructor(
        private importService: ImportService,
        private authService: AuthService,
        public router: Router
    ) {}

    ngOnInit(): void {
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/dashboard']);
            return;
        }
        this.refreshStatus();
    }

    ngOnDestroy(): void {
        this.clearPoll();
    }

    onFileChange(ev: Event): void {
        const input = ev.target as HTMLInputElement;
        const f = input.files?.[0];
        this.archivo = f ?? null;
        this.mensaje = '';
        this.error = '';
    }

    private clearPoll(): void {
        if (this.pollId != null) {
            clearInterval(this.pollId);
            this.pollId = null;
        }
    }

    refreshStatus(): void {
        this.importService.getStatus().subscribe({
            next: (res) => {
                this.status = res.status;
            },
            error: () => {
                /* silencioso si no hay sesión */
            }
        });
    }

    ejecutarImportacion(): void {
        if (!this.archivo || this.subiendo) return;
        this.error = '';
        this.mensaje = '';
        this.subiendo = true;

        this.clearPoll();
        this.pollId = setInterval(() => this.refreshStatus(), 1000);

        this.importService
            .uploadExcel(this.archivo, this.dryRun)
            .pipe(
                finalize(() => {
                    this.clearPoll();
                    this.subiendo = false;
                    this.refreshStatus();
                })
            )
            .subscribe({
                next: (res: any) => {
                    this.mensaje =
                        res?.message ||
                        (this.dryRun
                            ? 'Dry-run finalizado.'
                            : 'Importación finalizada.');
                },
                error: (err) => {
                    this.error =
                        err?.error?.message ||
                        'No se pudo completar la importación.';
                }
            });
    }

    rollback(): void {
        if (this.subiendo || this.revirtiendo) return;
        if (
            !confirm(
                '¿Revertir la última importación real? Se eliminarán tramos y señales creados en esa operación (misma jornada y ventana de tiempo).'
            )
        ) {
            return;
        }
        this.error = '';
        this.mensaje = '';
        this.revirtiendo = true;
        this.importService
            .rollbackLast()
            .pipe(finalize(() => (this.revirtiendo = false)))
            .subscribe({
                next: (res: any) => {
                    this.mensaje = res?.message || 'Rollback ejecutado.';
                },
                error: (err) => {
                    this.error =
                        err?.error?.message || 'No se pudo ejecutar el rollback.';
                }
            });
    }

    pct(block: { current: number; total: number } | undefined): number {
        if (!block?.total) return 0;
        return Math.min(
            100,
            Math.round((100 * block.current) / block.total) || 0
        );
    }
}
