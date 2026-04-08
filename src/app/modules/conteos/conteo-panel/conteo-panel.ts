import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ConteoService } from '../../../core/services/conteo.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-conteo-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './conteo-panel.html',
    styleUrl: './conteo-panel.scss'
})
export class ConteoPanelComponent implements OnInit, OnDestroy {

    idConteo = '';
    conteo: any = null;
    loading = true;

    // Catálogo completo de sentidos
    todosSentidos: any[] = [];

    // Datos del resumen SSE
    porSentido: any[] = [];
    total      = 0;
    sesiones:  any[] = [];

    private sse: EventSource | null = null;

    liberandoSesiones = false;

    constructor(
        private svc:     ConteoService,
        private authSvc: AuthService,
        private confirm: ConfirmDialogService,
        private zone:    NgZone,
        public  router:  Router,
        private route:   ActivatedRoute
    ) {}

    ngOnInit() {
        this.idConteo = this.route.snapshot.paramMap.get('idConteo') || '';
        this.svc.getConteo(this.idConteo).subscribe({
            next:  (r) => { this.conteo = r.dato; this.loading = false; },
            error: ()  => { this.loading = false; }
        });
        this.svc.getSentidos().subscribe({
            next: (r) => { this.todosSentidos = r.datos || []; }
        });
        this.conectarSSE();
    }

    ngOnDestroy() {
        this.sse?.close();
    }

    private conectarSSE() {
        this.sse = this.svc.sseConteo(this.idConteo);
        this.sse.onmessage = (ev) => {
            this.zone.run(() => {
                try {
                    const data = JSON.parse(ev.data);
                    if (data.resumen) this.aplicarResumen(data.resumen);
                    // Sesion events no traen resumen: refrescar manualmente
                    else if (data.tipo === 'sesion') {
                        this.svc.getResumen(this.idConteo).subscribe({
                            next: (r) => this.aplicarResumen(r)
                        });
                    }
                } catch (_) {}
            });
        };
        this.sse.onerror = () => {
            // EventSource reconecta automáticamente; no hacer nada
        };
    }

    private aplicarResumen(resumen: any) {
        this.porSentido = resumen.por_sentido || [];
        this.total      = resumen.total || 0;
        this.sesiones   = resumen.sesiones || [];
    }

    // Vista unificada: todos los sentidos con estado activo/inactivo y sus conteos
    get sentidosVista(): any[] {
        return this.todosSentidos.map(s => {
            const sid     = s._id;
            const sesion  = this.sesiones.find((x: any) => String(x.idSentido?._id || x.idSentido) === String(sid));
            const bloque  = this.porSentido.find((b: any) => String(b.idSentido) === String(sid));
            return {
                _id:        sid,
                codSentido: s.codSentido,
                sentido:    s.sentido,
                urlSentImg: s.urlSentImg,
                activo:     !!sesion,
                usuario:    sesion?.usuario || '',
                total:      bloque?.total || 0,
                cats:       bloque?.cats  || {}
            };
        });
    }

    usuarioEnSentido(idSentido: string): string {
        const s = this.sesiones.find((x: any) => {
            const sid = x.idSentido?._id || x.idSentido;
            return sid === idSentido;
        });
        return s?.usuario || '';
    }

    catsDeBloque(bloque: any): { cat: string; n: number }[] {
        return Object.entries(bloque.cats || {}).map(([cat, n]) => ({ cat, n: n as number }));
    }

    vehiculos(bloque: any): { cat: string; n: number }[] {
        return this.catsDeBloque(bloque).filter(i => i.cat.toUpperCase() !== 'PERSONAS');
    }

    personas(bloque: any): number {
        return (bloque.cats || {})['Personas'] || 0;
    }

    totalVehiculos(bloque: any): number {
        return this.vehiculos(bloque).reduce((s, i) => s + i.n, 0);
    }

    formatHora(iso: string): string {
        if (!iso) return '';
        try { const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
        catch { return ''; }
    }

    imgUrl(url: string): string {
        if (!url) return '';
        return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
    }

    isSupervisor() { return this.authSvc.isAdmin() || this.authSvc.isSupervisor(); }

    liberarTodasSesiones() {
        this.confirm.confirm({
            title: 'Liberar todas las sesiones',
            message: '¿Liberar todas las sesiones activas de este conteo? Los encuestadores deberán volver a tomar un sentido.',
            confirmText: 'Liberar',
            variant: 'warning',
            icon: 'warning'
        }).subscribe(ok => {
            if (!ok) return;
            this.liberandoSesiones = true;
            this.svc.liberarTodasSesiones(this.idConteo).subscribe({
                next:  () => { this.liberandoSesiones = false; },
                error: () => { this.liberandoSesiones = false; }
            });
        });
    }

    volverLista() {
        const idEst = this.conteo?.idEstacion?._id || this.conteo?.idEstacion || '';
        const nom   = this.conteo?.idEstacion?.nomenclatura || '';
        this.router.navigate(['/conteos/conteos'], { queryParams: { idEstacion: idEst, nomEstacion: nom } });
    }
}
