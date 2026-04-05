import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackupService } from '../../../core/services/backup.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

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
    restaurandoArchivo = false;
    purgando = false;
    descargando = '';
    selectedArchivo = '';
    manualArchivo = '';
    archivoLocal: File | null = null;
    mensaje = '';
    error = '';

    purge = {
        inventario: false,
        sinc: false,
        catalogos: false,
        geograficos: false,
        jornadas: false,
        divipol: false,
        auditoria: false,
        respaldos_log: false,
        usuarios_otros: false
    };
    purgeConfirmText = '';

    constructor(
        private backupService: BackupService,
        private authService: AuthService,
        private confirmDialog: ConfirmDialogService,
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
                this.error =
                    err?.error?.message || 'No se pudo cargar el historial de respaldos.';
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
                this.creando = false;
                this.loadLogs();
                const b = res?.backup;
                const archivo = b?.archivo || 'infravial-full-backup-….zip';
                const extras: string[] = [];
                if (b?.registros != null) {
                    extras.push(`Documentos en la copia: ${b.registros}.`);
                }
                if (b?.colecciones != null) {
                    extras.push(`Colecciones: ${b.colecciones}.`);
                }
                const extraTxt = extras.length ? `\n\n${extras.join(' ')}` : '';
                this.confirmDialog
                    .confirm({
                        title: 'Backup ejecutado correctamente',
                        message:
                            `Se generó el archivo «${archivo}» (base de datos + carpeta uploads). ` +
                            `Puedes descargarlo desde la tabla del historial cuando aparezca.${extraTxt}`,
                        confirmText: 'Entendido',
                        showCancel: false,
                        variant: 'success',
                        icon: 'check_circle'
                    })
                    .subscribe();
            },
            error: (err) => {
                this.error = err?.error?.message || 'No se pudo generar el backup.';
                this.creando = false;
            }
        });
    }

    archivoParaRestaurar(): string {
        return (this.manualArchivo || this.selectedArchivo || '').trim();
    }

    restaurarBackup(): void {
        const archivo = this.archivoParaRestaurar();
        if (!archivo) return;
        this.confirmDialog
            .confirm({
                title: '¿Restaurar desde el servidor?',
                message: `Se usará «${archivo}». Un archivo .zip reemplaza la base de datos y la carpeta uploads/ (fotos). Un .json.gz antiguo solo restaura la base de datos.`,
                confirmText: 'Sí, restaurar',
                cancelText: 'Cancelar',
                variant: 'warning',
                icon: 'upload'
            })
            .subscribe((ok) => {
                if (!ok) return;
                this.ejecutarRestaurarBackup(archivo);
            });
    }

    private ejecutarRestaurarBackup(archivo: string): void {
        this.restaurando = true;
        this.error = '';
        this.mensaje = '';
        this.backupService.restoreBackup(archivo).subscribe({
            next: (res: any) => {
                this.mensaje = `Restore aplicado: ${res?.restore?.archivo || archivo}`;
                this.restaurando = false;
                this.loadLogs();
            },
            error: (err) => {
                this.error = err?.error?.message || 'No se pudo restaurar el backup.';
                this.restaurando = false;
            }
        });
    }

    restaurarDesdeArchivoLocal(): void {
        if (!this.archivoLocal) return;
        const nombre = this.archivoLocal.name;
        this.confirmDialog
            .confirm({
                title: '¿Restaurar desde tu equipo?',
                message: `Se subirá «${nombre}». Un .zip reemplaza la base de datos y uploads/. Un .json.gz solo la base de datos.`,
                confirmText: 'Sí, restaurar',
                cancelText: 'Cancelar',
                variant: 'warning',
                icon: 'upload'
            })
            .subscribe((ok) => {
                if (!ok) return;
                this.ejecutarRestaurarArchivoLocal();
            });
    }

    private ejecutarRestaurarArchivoLocal(): void {
        const file = this.archivoLocal;
        if (!file) return;
        this.restaurandoArchivo = true;
        this.error = '';
        this.mensaje = '';
        this.backupService.restoreFromUploadedFile(file).subscribe({
            next: (res: any) => {
                this.mensaje = `Restore desde archivo: ${res?.restore?.archivo || 'ok'}`;
                this.restaurandoArchivo = false;
                this.archivoLocal = null;
                this.loadLogs();
            },
            error: (err) => {
                this.error =
                    err?.error?.message || 'No se pudo restaurar desde el archivo.';
                this.restaurandoArchivo = false;
            }
        });
    }

    descargarBackup(archivo: string): void {
        if (!archivo) return;
        this.descargando = archivo;
        this.error = '';
        this.backupService.downloadBackup(archivo).subscribe({
            next: (blob) => {
                this.descargando = '';
                if (blob.type && blob.type.includes('json') && !blob.type.includes('zip')) {
                    blob.text().then((t) => {
                        try {
                            const j = JSON.parse(t);
                            this.error = j.message || 'Error al descargar';
                        } catch {
                            this.error = 'Error al descargar';
                        }
                    });
                    return;
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = archivo;
                a.click();
                URL.revokeObjectURL(url);
                this.mensaje = `Descarga iniciada: ${archivo}`;
            },
            error: (err: any) => {
                this.descargando = '';
                const blob = err?.error;
                if (blob instanceof Blob) {
                    blob.text().then((t) => {
                        try {
                            const j = JSON.parse(t);
                            this.error = j.message || 'No se pudo descargar el archivo.';
                        } catch {
                            this.error = 'No se pudo descargar el archivo.';
                        }
                    });
                } else {
                    this.error =
                        err?.error?.message || 'No se pudo descargar el archivo.';
                }
            }
        });
    }

    gruposPurgeSeleccionados(): string[] {
        const g: string[] = [];
        if (this.purge.inventario) g.push('inventario');
        if (this.purge.sinc) g.push('sinc');
        if (this.purge.catalogos) g.push('catalogos');
        if (this.purge.geograficos) g.push('geograficos');
        if (this.purge.jornadas) g.push('jornadas');
        if (this.purge.divipol) g.push('divipol');
        if (this.purge.auditoria) g.push('auditoria');
        if (this.purge.respaldos_log) g.push('respaldos_log');
        if (this.purge.usuarios_otros) g.push('usuarios_otros');
        return g;
    }

    puedePurgar(): boolean {
        return (
            this.gruposPurgeSeleccionados().length > 0 &&
            this.purgeConfirmText === 'BORRAR'
        );
    }

    ejecutarPurge(): void {
        if (!this.puedePurgar()) return;
        const grupos = this.gruposPurgeSeleccionados();
        this.confirmDialog
            .confirm({
                title: '¿Ejecutar limpieza irreversible?',
                message: `Se eliminarán datos de: ${grupos.join(', ')}. Esta acción no se puede deshacer.`,
                confirmText: 'Sí, eliminar datos',
                cancelText: 'Cancelar',
                variant: 'danger',
                icon: 'delete'
            })
            .subscribe((ok) => {
                if (!ok) return;
                this.ejecutarPurgeConfirmed(grupos);
            });
    }

    private ejecutarPurgeConfirmed(grupos: string[]): void {
        this.purgando = true;
        this.error = '';
        this.mensaje = '';
        this.backupService.purgeDatabase(grupos, 'BORRAR').subscribe({
            next: (res: any) => {
                const n = res?.purge?.totalRemoved ?? 0;
                this.mensaje = `Limpieza aplicada. Documentos eliminados (aprox.): ${n}.`;
                this.purgando = false;
                this.purgeConfirmText = '';
                this.loadLogs();
            },
            error: (err) => {
                this.error = err?.error?.message || 'No se pudo ejecutar la limpieza.';
                this.purgando = false;
            }
        });
    }

    badgeClassTipo(tipo: string): string {
        if (tipo === 'backup') return 'badge-info';
        if (tipo === 'restore') return 'badge-warn';
        if (tipo === 'purge') return 'badge-purge';
        return 'badge-info';
    }

    fmtSize(bytes: number): string {
        if (!bytes && bytes !== 0) return '—';
        if (bytes < 1024) return `${bytes} B`;
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        return `${(kb / 1024).toFixed(2)} MB`;
    }
}
