import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackupService } from '../../../core/services/backup.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-backup-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './backup-admin.html',
    styleUrl: './backup-admin.scss'
})
export class BackupAdminComponent implements OnInit {
    logs: any[] = [];
    loading = true;
    creando = false;
    restaurando = false;
    selectedArchivo = '';
    mensaje = '';
    error = '';

    constructor(
        private backupService: BackupService,
        private authService: AuthService,
        public router: Router
    ) {}

    ngOnInit(): void {
        if (!this.authService.isAdmin()) {
            this.router.navigate(['/dashboard']);
            return;
        }
        this.loadLogs();
    }

    loadLogs(): void {
        this.loading = true;
        this.error = '';
        this.backupService.getLogs().subscribe({
            next: (res: any) => {
                this.logs = res.logs || [];
                this.loading = false;
            },
            error: (err) => {
                this.error = err?.error?.message || 'No se pudo cargar el historial de respaldos.';
                this.loading = false;
            }
        });
    }

    crearBackup(): void {
        this.creando = true;
        this.error = '';
        this.mensaje = '';
        this.backupService.createBackup().subscribe({
            next: (res: any) => {
                this.mensaje = `Backup creado: ${res?.backup?.archivo || 'ok'}`;
                this.creando = false;
                this.loadLogs();
            },
            error: (err) => {
                this.error = err?.error?.message || 'No se pudo generar el backup.';
                this.creando = false;
            }
        });
    }

    restaurarBackup(): void {
        if (!this.selectedArchivo) return;
        const ok = confirm(`Vas a restaurar el backup "${this.selectedArchivo}". Esta accion reemplaza los datos actuales. Deseas continuar?`);
        if (!ok) return;

        this.restaurando = true;
        this.error = '';
        this.mensaje = '';
        this.backupService.restoreBackup(this.selectedArchivo).subscribe({
            next: (res: any) => {
                this.mensaje = `Restore aplicado: ${res?.restore?.archivo || this.selectedArchivo}`;
                this.restaurando = false;
                this.loadLogs();
            },
            error: (err) => {
                this.error = err?.error?.message || 'No se pudo restaurar el backup.';
                this.restaurando = false;
            }
        });
    }

    fmtSize(bytes: number): string {
        if (!bytes && bytes !== 0) return '—';
        if (bytes < 1024) return `${bytes} B`;
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        return `${(kb / 1024).toFixed(2)} MB`;
    }
}
