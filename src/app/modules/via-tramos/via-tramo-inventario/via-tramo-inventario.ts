import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { environment } from '../../../../environments/environment';

type InvTabId = 'senVert' | 'senHor' | 'caja' | 'controlSem' | 'semaforo';

@Component({
    selector: 'app-via-tramo-inventario',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './via-tramo-inventario.html',
    styleUrl: './via-tramo-inventario.scss'
})
export class ViaTramoInventarioComponent implements OnInit {
    idTramo = '';
    loading = true;
    error = '';
    data: {
        tramo: any;
        senVerticales: any[];
        senHorizontales: any[];
        cajasInspeccion: any[];
        controlesSemaforicos: any[];
        semaforos: any[];
    } | null = null;

    tabActiva: InvTabId = 'senVert';

    /** Catálogos para vista previa por código (misma lógica que formularios / reportes). */
    catalogoSenVert: any[] = [];
    catalogoDemarcaciones: any[] = [];
    readonly apiUrl = environment.apiUrl;

    readonly tabs: { id: InvTabId; label: string; icon: string; color: string }[] = [
        { id: 'senVert', label: 'Señales verticales', icon: 'traffic', color: '#42a5f5' },
        { id: 'senHor', label: 'Señales horizontales', icon: 'horizontal_rule', color: '#ff9800' },
        { id: 'caja', label: 'Cajas inspección', icon: 'electrical_services', color: '#8bc34a' },
        { id: 'controlSem', label: 'Control semafórico', icon: 'settings_remote', color: '#ab47bc' },
        { id: 'semaforo', label: 'Semáforos', icon: 'traffic_light', color: '#ef5350' }
    ];

    constructor(
        private route: ActivatedRoute,
        public router: Router,
        private viaTramoService: ViaTramoService,
        private catalogoService: CatalogoService
    ) {}

    ngOnInit() {
        this.catalogoService.getSenVertscat().subscribe({
            next: (res: any) => {
                this.catalogoSenVert = res?.datos ?? [];
            }
        });
        this.catalogoService.getDemarcaciones().subscribe({
            next: (res: any) => {
                this.catalogoDemarcaciones = res?.datos ?? [];
            }
        });

        this.route.paramMap.subscribe((pm) => {
            const id = pm.get('id');
            if (id) {
                this.idTramo = id;
                this.cargar();
            }
        });
    }

    cargar() {
        this.loading = true;
        this.error = '';
        this.viaTramoService.getInventario(this.idTramo).subscribe({
            next: (r: any) => {
                this.data = {
                    tramo: r.tramo,
                    senVerticales: r.senVerticales || [],
                    senHorizontales: r.senHorizontales || [],
                    cajasInspeccion: r.cajasInspeccion || [],
                    controlesSemaforicos: r.controlesSemaforicos || [],
                    semaforos: r.semaforos || []
                };
                this.loading = false;
            },
            error: (e) => {
                this.error = e?.error?.message || e?.message || 'Error al cargar inventario';
                this.loading = false;
            }
        });
    }

    setTab(id: InvTabId) {
        this.tabActiva = id;
    }

    countTab(id: InvTabId): number {
        if (!this.data) return 0;
        switch (id) {
            case 'senVert':
                return this.data.senVerticales.length;
            case 'senHor':
                return this.data.senHorizontales.length;
            case 'caja':
                return this.data.cajasInspeccion.length;
            case 'controlSem':
                return this.data.controlesSemaforicos.length;
            case 'semaforo':
                return this.data.semaforos.length;
            default:
                return 0;
        }
    }

    get itemsActuales(): any[] {
        if (!this.data) return [];
        switch (this.tabActiva) {
            case 'senVert':
                return this.data.senVerticales;
            case 'senHor':
                return this.data.senHorizontales;
            case 'caja':
                return this.data.cajasInspeccion;
            case 'controlSem':
                return this.data.controlesSemaforicos;
            case 'semaforo':
                return this.data.semaforos;
            default:
                return [];
        }
    }

    rutaNuevo(): string {
        switch (this.tabActiva) {
            case 'senVert':
                return '/sen-verticales/nuevo';
            case 'senHor':
                return '/sen-horizontales/nuevo';
            case 'caja':
                return '/cajas-inspeccion/nuevo';
            case 'controlSem':
                return '/control-semaforo/nuevo';
            case 'semaforo':
                return '/semaforos/nuevo';
            default:
                return '/via-tramos';
        }
    }

    rutaEditar(item: any): string {
        const id = item?._id;
        if (!id) return '/via-tramos';
        switch (this.tabActiva) {
            case 'senVert':
                return `/sen-verticales/editar/${id}`;
            case 'senHor':
                return `/sen-horizontales/editar/${id}`;
            case 'caja':
                return `/cajas-inspeccion/editar/${id}`;
            case 'controlSem':
                return `/control-semaforo/editar/${id}`;
            case 'semaforo':
                return `/semaforos/editar/${id}`;
            default:
                return '/via-tramos';
        }
    }

    zatLabel(t: any): string {
        const z = t?.zat;
        if (!z) return '—';
        const n = z.zatNumero != null ? String(z.zatNumero) : '';
        const l = z.zatLetra != null ? String(z.zatLetra) : '';
        return (n + l).trim() || '—';
    }

    get tabLabelActiva(): string {
        const t = this.tabs.find((x) => x.id === this.tabActiva);
        return t ? t.label.toUpperCase() : '';
    }

    private static normCod(c: string | null | undefined): string {
        return (c ?? '').trim().toUpperCase();
    }

    private catSenVertPorCod(codSe: string | null | undefined): any | null {
        const c = ViaTramoInventarioComponent.normCod(codSe);
        if (!c) return null;
        return (
            this.catalogoSenVert.find(
                (s: any) => ViaTramoInventarioComponent.normCod(s?.codSenVert) === c
            ) ?? null
        );
    }

    private catDemPorCod(codSeHor: string | null | undefined): any | null {
        const c = ViaTramoInventarioComponent.normCod(codSeHor);
        if (!c) return null;
        return (
            this.catalogoDemarcaciones.find(
                (d: any) => ViaTramoInventarioComponent.normCod(d?.codDem) === c
            ) ?? null
        );
    }

    /** URL absoluta imagen catálogo señal vertical (`codSe` ↔ `codSenVert`). */
    urlImgCatalogoSenVert(item: any): string {
        const row = this.catSenVertPorCod(item?.codSe);
        const path = row?.urlImgSenVert;
        return path ? `${this.apiUrl}${path}` : '';
    }

    /** URL absoluta imagen catálogo demarcación (`codSeHor` ↔ `codDem`). */
    urlImgCatalogoSenHor(item: any): string {
        const row = this.catDemPorCod(item?.codSeHor);
        const path = row?.urlDemImg;
        return path ? `${this.apiUrl}${path}` : '';
    }
}
