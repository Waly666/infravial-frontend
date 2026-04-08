import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ConteoService } from '../../../core/services/conteo.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-conteo-sesion',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './conteo-sesion.html',
    styleUrl: './conteo-sesion.scss'
})
export class ConteoSesionComponent implements OnInit, OnDestroy {

    idConteo = '';
    conteo: any = null;
    sentidos: any[] = [];
    cats: any[] = [];

    // sesiones activas: { idSentido: usuario }
    sesionesMap: Record<string, string> = {};
    miSesion: any = null;  // el sentido que tomó el usuario actual
    miUsuario = '';

    // conteos del usuario (per cat)
    misTotales: Record<string, number> = {};
    totalMio = 0;

    loading = true;
    tomando = false;
    liberando = false;
    contando = false;
    errorMsg = '';

    private sse: EventSource | null = null;

    constructor(
        private svc:     ConteoService,
        private authSvc: AuthService,
        private zone:    NgZone,
        public  router:  Router,
        private route:   ActivatedRoute
    ) {}

    ngOnInit() {
        this.idConteo  = this.route.snapshot.paramMap.get('idConteo') || '';
        const u = this.authSvc.getUsuario();
        this.miUsuario = (`${u?.nombres || ''} ${u?.apellidos || ''}`).trim() || u?.user || '';

        this.cargar();
        this.conectarSSE();
    }

    ngOnDestroy() {
        this.sse?.close();
    }

    cargar() {
        this.loading = true;
        // Cargar conteo, sentidos y cats en paralelo
        this.svc.getConteo(this.idConteo).subscribe({
            next: (r) => {
                this.conteo = r.dato;
                this.cargarSentidosYCats();
            },
            error: () => { this.loading = false; this.errorMsg = 'No se pudo cargar el conteo.'; }
        });
    }

    private cargarSentidosYCats() {
        let pendientes = 2;
        const done = () => { if (--pendientes === 0) { this.loading = false; } };

        this.svc.getSentidos().subscribe({
            next: (r) => { this.sentidos = r.datos; done(); },
            error: done
        });
        this.svc.getCats().subscribe({
            next: (r) => { this.cats = r.datos; done(); },
            error: done
        });

        this.svc.getSesiones(this.idConteo).subscribe({
            next: (r) => {
                this.sesionesMap = {};
                for (const s of r.sesiones) {
                    this.sesionesMap[s.idSentido?._id || s.idSentido] = s.usuario;
                    if (s.usuario === this.miUsuario) this.miSesion = s;
                }
            },
            error: () => {}
        });
    }

    private conectarSSE() {
        this.sse = this.svc.sseConteo(this.idConteo);
        this.sse.onmessage = (ev) => {
            this.zone.run(() => {
                try {
                    const data = JSON.parse(ev.data);
                    if (data.tipo === 'sesion') this.actualizarSesiones(data);
                    if (data.resumen)           this.actualizarResumen(data.resumen);
                } catch (_) {}
            });
        };
    }

    private actualizarSesiones(data: any) {
        const { action, idSentido, usuario } = data;
        if (action === 'tomar') {
            this.sesionesMap = { ...this.sesionesMap, [idSentido]: usuario };
            if (usuario === this.miUsuario) {
                this.miSesion = { idSentido: { _id: idSentido }, usuario };
            }
        } else if (action === 'liberar') {
            const map = { ...this.sesionesMap };
            delete map[idSentido];
            this.sesionesMap = map;
            if (usuario === this.miUsuario) this.miSesion = null;
        }
        // Refrescar la lista de sesiones para obtener datos populados
        this.svc.getSesiones(this.idConteo).subscribe({
            next: (r) => {
                this.sesionesMap = {};
                for (const s of r.sesiones) {
                    this.sesionesMap[s.idSentido?._id || s.idSentido] = s.usuario;
                    if (s.usuario === this.miUsuario) this.miSesion = s;
                }
            },
            error: () => {}
        });
    }

    private actualizarResumen(resumen: any) {
        if (!resumen) return;
        const miIdSentido = String(this.miSesion?.idSentido?._id || this.miSesion?.idSentido || '');
        const miBloque = resumen.por_sentido?.find((s: any) => String(s.idSentido) === miIdSentido);
        if (miBloque) {
            this.misTotales = { ...miBloque.cats };
            this.totalMio   = miBloque.total || 0;
        }
        // Si no se encuentra el bloque aún, NO resetear — los datos locales son correctos
    }

    tomarSentido(idSentido: string) {
        if (this.tomando) return;
        this.tomando = true;
        this.errorMsg = '';
        this.svc.tomarSentido({ idConteo: this.idConteo, idSentido }).subscribe({
            next: (r) => {
                this.miSesion = r.sesion;
                this.tomando = false;
            },
            error: (e) => { this.errorMsg = e?.error?.message || 'Error al tomar sentido'; this.tomando = false; }
        });
    }

    liberarSentido() {
        if (this.liberando) return;
        this.liberando = true;
        this.errorMsg  = '';
        this.svc.liberarSentido(this.idConteo).subscribe({
            next:  () => { this.miSesion = null; this.liberando = false; this.misTotales = {}; this.totalMio = 0; },
            error: (e) => { this.errorMsg = e?.error?.message || 'Error al liberar'; this.liberando = false; }
        });
    }

    registrar(cat: any) {
        if (this.contando || !this.miSesion) return;
        this.contando = true;
        const payload = {
            idConteo:  this.idConteo,
            idEstacion: this.conteo?.idEstacion?._id || this.conteo?.idEstacion,
            idSentido: this.miSesion?.idSentido?._id || this.miSesion?.idSentido,
            idCatCont: cat._id
        };
        this.svc.registrar(payload).subscribe({
            next:  () => { this.contando = false; },
            error: (e) => { this.errorMsg = e?.error?.message || 'Error al registrar'; this.contando = false; }
        });
    }

    deshacer() {
        this.errorMsg = '';
        this.svc.deshacer(this.idConteo).subscribe({
            next:  () => {},
            error: (e) => { this.errorMsg = e?.error?.message || 'Nada para deshacer'; }
        });
    }

    sentidoOcupado(s: any): boolean {
        return !!this.sesionesMap[s._id];
    }

    sentidoOcupadoPor(s: any): string {
        return this.sesionesMap[s._id] || '';
    }

    miSentidoId(): string {
        return this.miSesion?.idSentido?._id || this.miSesion?.idSentido || '';
    }

    esMiSentido(s: any): boolean {
        return s._id === this.miSentidoId();
    }

    estaEnProceso(): boolean {
        return this.conteo?.estado === 'EN PROCESO';
    }

    imgUrl(url: string): string {
        if (!url) return '';
        return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
    }

    formatHora(iso: string): string {
        if (!iso) return '';
        try { const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
        catch { return ''; }
    }
}
