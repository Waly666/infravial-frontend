import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SemaforoService } from '../../../core/services/semaforo.service';
import { JornadaService } from '../../../core/services/jornada.service';
import { ViaTramoService } from '../../../core/services/via-tramo.service';
import { ControlSemService } from '../../../core/services/control-sem.service';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import {
    controlSemPickerMatches,
    filtrarControlesPorMunicipioJornada,
    filtrarTramosPickerPorBusqueda,
    filtrarTramosPorMunicipioJornada,
    nomenclaturaSearchText
} from '../../../shared/utils/geo-list-filters';
import {
    TramoGeoPipe,
    TramoNomenclaturaPipe,
    MongoIdPipe
} from '../../../shared/pipes/tramo-display.pipe';
import { GeoPreviewMapDirective } from '../../../shared/directives/geo-preview-map.directive';

@Component({
    selector: 'app-semaforo-form',
    standalone: true,
    imports: [CommonModule, FormsModule, TramoGeoPipe, TramoNomenclaturaPipe, MongoIdPipe, GeoPreviewMapDirective],
    templateUrl: './semaforo-form.html',
    styleUrls: [
        './semaforo-form.scss',
        '../../../shared/styles/tramo-picker-labels.scss',
        '../../../shared/styles/tramo-seleccionado-panel.scss'
    ]
})
export class SemaforoFormComponent implements OnInit {

    pasoActual  = 1;
    totalPasos  = 6;
    modoEdicion = false;
    idEdicion:  string | null = null;
    loading     = false;
    error       = '';
    apiUrl      = environment.apiUrl;

    jornada:   any   = null;
    tramos:    any[] = [];
    controles: any[] = [];
    obsSem:    any[] = [];

    mostrarTramos    = false;
    tramoSeleccionado: any = null;
    busquedaTramo    = '';

    mostrarControles    = false;
    controlSeleccionado: any = null;
    busquedaControl     = '';

    mapaAbierto = false;
    leafletMap:  any = null;
    marcador:    any = null;

    // Fotos
    fotoSemaforo:    File | null = null;
    fotoSoporte:     File | null = null;
    fotoAnclaje:     File | null = null;
    fotoPulsador:    File | null = null;
    fotoDispAud:     File | null = null;
    previewSemaforo  = '';
    previewSoporte   = '';
    previewAnclaje   = '';
    previewPulsador  = '';
    previewDispAud   = '';

    form: any = {
        idJornada:   '',
        idViaTramo:  '',
        idControSem: '',
        municipio:   '',
        supervisor:  '',
        numExterno:  null,
        controlRef:  '',

        ubicacion: { type: 'Point', coordinates: [] },
        lat: null,
        lng: null,

        // Paso 3 - Datos semáforo
        ipRadio:             '',
        sitio:               '',
        semaforoFunciona:    true,
        claseSem:            '',
        numCaras:            1,
        obstruccion:         '',
        visibilidadOptima:   '',
        fase:                '',
        accion:              '',
        estadoGenPint:       '',
        implementacion:      '',

        // Paso 4 - Accesorios
        pulsador:            false,
        estadoPulsador:      '',
        temporizador:        false,
        estadoTemp:          '',
        dispositivoAuditivo: false,
        estadoDispAud:       '',

        // Paso 5 - Soporte
        tipoSoporte:    '',
        estadoSoporte:  '',
        pinturaSoporte: '',
        sistemaSoporte: '',
        estadoAnclaje:  '',

        // Fotos
        urlFotoSemaforo: '',
        urlFotoSoporte:  '',
        urlFotoAnclaje:  '',
        urlFotoPulsador: '',
        urlFotoDispAud:  '',

        // Paso 4 - Caras
        caras: [],

        // Paso 6 - Observaciones
        obs1: '', obs2: '', obs3: '',
        obs4: '', obs5: '', obs6: '',
        notasGenerales: ''
    };

    // Enumeraciones
    fases          = ['Inventario', 'Programación', 'Diseño', 'Por definir'];
    acciones       = ['Mantenimiento', 'Retiro', 'Reemplazo', 'Reubicacion', 'Instalacion', 'Para definir', 'Otro'];
    estadoOpts     = ['Bueno', 'Regular', 'Malo'];
    implementaciones = ['Temporal', 'Definitiva'];
    visibilidades  = ['si', 'no', 'N/A'];
    tiposSoporte   = ['Poste en Angulo de hierro', 'Tubo galvanizado', 'Portico', 'Mensula corta', 'Mensula larga', 'Cable de suspension', 'Postes y pedestales en islas', 'Otro'];
    sistemasSop    = ['Tipo H', 'Duplex', 'Movil', 'Poste abatible', 'Elevado', 'Simple'];
    tiposModulo    = ['Led', 'Bombilla Incandescente'];
    diametros      = ['30 cms', '20 cms'];
    despliegues    = ['Vertical', 'Horizontal'];
    numCarasOpts   = [1, 2, 3, 4];
    clasesSem      = ['Control Vehicular', 'Control Peatonal Tiempo Fijo', 'Control Peatonal accionado por peaton', 'Semaforo sonoro', 'Semaforo de Destello o Intemitente', 'Regulacion de Carriles', 'Maniobras Vehiculos de emergencia', 'Control Servicio Publico', 'Cruce Ferroviario', 'Semaforo Inteligente', 'Semaforo Portatil'];
    obstrucciones  = ['Árboles', 'Construcciones', 'Vallas', 'Vehículos estacionados', 'Vandalizadas', 'N/A'];
    numModOpts     = [1, 2, 3, 4, 5];
    coloresOpts    = ['Rojo-Amarillo-Verde', 'Rojo-Verde', 'Tecnologia emision señal doble'];
    danosCaraOpts = ['Desgaste', 'Lente roto', 'Lente Opaco', 'Falla Modulo', 'Falla Placa Contraste', 'Poste doblado', 'Tablero doblado', 'Elementos ajenos', 'Bulvo quemado', 'Led quemados', 'Sin información', 'N/A'];



    constructor(
        private semaforoService:   SemaforoService,
        private jornadaService:    JornadaService,
        private viaTramoService:   ViaTramoService,
        private controlSemService: ControlSemService,
        private catalogoService:   CatalogoService,
        private api:               ApiService,
        private authService:       AuthService,
        private route:             ActivatedRoute,
        public  router:            Router
    ) {}

    ngOnInit() {
        this.idEdicion   = this.route.snapshot.paramMap.get('id');
        this.modoEdicion = !!this.idEdicion;
        this.loadJornada();
        this.loadControles();
        this.loadObsSem();
        if (this.modoEdicion) setTimeout(() => this.loadRegistro(), 800);
    }

    loadJornada() {
        this.jornadaService.getActiva().subscribe({
            next: (res) => {
                this.jornada        = res.jornada;
                this.form.idJornada = res.jornada._id;
                this.form.municipio = res.jornada.municipio;
                this.form.supervisor= res.jornada.supervisor;
                this.loadTramos();
            },
            error: () => this.jornada = null
        });
    }

    loadTramos() {
        this.viaTramoService.getAll().subscribe({
            next: (res) => {
                this.tramos = res.tramos;
                if (this.modoEdicion && this.form.idViaTramo && !this.tramoSeleccionado) {
                    this.tramoSeleccionado = this.tramos.find(
                        t => t._id === this.form.idViaTramo || t._id === this.form.idViaTramo?._id
                    );
                }
            },
            error: () => this.tramos = []
        });
    }

    loadControles() {
        this.controlSemService.getAll().subscribe({
            next: (res) => this.controles = res.registros,
            error: ()   => this.controles = []
        });
    }

    loadObsSem() {
         this.catalogoService.getObsSemaforos().subscribe({
         next: (res: any) => this.obsSem = res.datos,
         error: ()        => this.obsSem = []
    });
    }

    loadRegistro() {
        this.semaforoService.getById(this.idEdicion!).subscribe({
            next: (res) => {
                const r = res.registro;
                this.form = { ...this.form, ...r };
                if (r.ubicacion?.coordinates?.length === 2) {
                    this.form.lng = r.ubicacion.coordinates[0];
                    this.form.lat = r.ubicacion.coordinates[1];
                }
                if (r.idViaTramo) {
                    this.tramoSeleccionado = typeof r.idViaTramo === 'object'
                        ? r.idViaTramo
                        : this.tramos.find(t => t._id === r.idViaTramo);
                    this.form.idViaTramo = r.idViaTramo?._id || r.idViaTramo;
                }
                if (r.idControSem) {
                    this.controlSeleccionado = typeof r.idControSem === 'object'
                        ? r.idControSem
                        : this.controles.find(c => c._id === r.idControSem);
                    this.form.idControSem = r.idControSem?._id || r.idControSem;
                }
                ['obs1','obs2','obs3','obs4','obs5','obs6'].forEach(o => {
                    if (this.form[o]?._id) this.form[o] = this.form[o]._id;
                });
                if (this.form.caras?.length > 0) {
                    this.previewsCaras = this.form.caras.map(() => '');
                    this.fotosCaras    = this.form.caras.map(() => null);
                }
            }
        });
    }

    // ── WIZARD ────────────────────────────────────
    get progreso(): number { return (this.pasoActual / this.totalPasos) * 100; }
    siguiente() { if (this.pasoActual < this.totalPasos) this.pasoActual++; }
    anterior()  { if (this.pasoActual > 1) this.pasoActual--; }
    irAPaso(n: number) { this.pasoActual = n; }

    // ── TRAMO ─────────────────────────────────────
    get tramosFiltrados() {
        const base = filtrarTramosPorMunicipioJornada(this.tramos, this.jornada);
        return filtrarTramosPickerPorBusqueda(base, this.busquedaTramo || '');
    }

    seleccionarTramo(t: any) {
        this.form.idViaTramo   = t._id;
        this.tramoSeleccionado = t;
        this.busquedaTramo     = nomenclaturaSearchText(t) || '';
        this.mostrarTramos     = false;
    }

    // ── CONTROL ───────────────────────────────────
    get controlesFiltrados() {
        const base = filtrarControlesPorMunicipioJornada(this.controles, this.jornada);
        const qRaw = (this.busquedaControl || '').trim();
        if (!qRaw) return base;
        return base.filter((c) => controlSemPickerMatches(c, qRaw));
    }

    seleccionarControl(c: any) {
        this.form.idControSem    = c._id;
        this.controlSeleccionado = c;
        this.busquedaControl     = `Control #${c.numExterno} — ${nomenclaturaSearchText(c) || '—'}`;
        this.mostrarControles    = false;
    }

    // ── CARAS ─────────────────────────────────────
    inicializarCaras() {
      this.form.caras = Array.from({ length: this.form.numCaras || 1 }, () => ({
          tipoModulo:     '',
          diametroLente:  '',
          numeroModulos:  null,
          numeroVisceras: null,
          estadoMod1: null, estadoViscera1: null,
          estadoMod2: null, estadoViscera2: null,
          estadoMod3: null, estadoViscera3: null,
          estadoMod4: null, estadoViscera4: null,
          despliegue:      '',
          estadoCara:      '',
          colores:         '',
          placaContraste:  false,
          estadoPlacaCont: null,
          danos:           [],
          flechaDir:       false,
          obs:             '',
          urlFoto:     ''
      }));
  }

    onNumCarasChange() {
        this.inicializarCaras();
    }
    toggleDanoCara(cara: any, dano: string) {
    if (!cara.danos) cara.danos = [];
    const idx = cara.danos.indexOf(dano);
    if (idx === -1) cara.danos.push(dano);
    else            cara.danos.splice(idx, 1);
}

    // ── MAPA ──────────────────────────────────────
    abrirMapa() {
        this.mapaAbierto = true;
        setTimeout(() => this.iniciarMapa(), 200);
    }

    cerrarMapa() {
        this.mapaAbierto = false;
        if (this.leafletMap) {
            this.leafletMap.remove();
            this.leafletMap = null;
        }
    }

    async iniciarMapa() {
        const L = (window as any).L;
        let lat = 4.6097, lng = -74.0817;
        try {
            const municipio = this.jornada?.municipio || '';
            const depto     = this.jornada?.dpto || '';
            const url       = `https://nominatim.openstreetmap.org/search?q=${municipio},${depto},Colombia&format=json&limit=1`;
            const res       = await fetch(url);
            const data      = await res.json();
            if (data.length > 0) {
                lat = parseFloat(data[0].lat);
                lng = parseFloat(data[0].lon);
            }
        } catch(e) {}

        this.leafletMap = L.map('leaflet-map-sem').setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(this.leafletMap);

        if (this.form.lat && this.form.lng) this.agregarMarcador(L, this.form.lat, this.form.lng);

        this.leafletMap.on('click', (e: any) => {
            this.form.lat = e.latlng.lat;
            this.form.lng = e.latlng.lng;
            this.agregarMarcador(L, e.latlng.lat, e.latlng.lng);
        });
    }

    agregarMarcador(L: any, lat: number, lng: number) {
        if (this.marcador) this.leafletMap.removeLayer(this.marcador);
        const icon = L.divIcon({
            html: `<div style="background:#f0a500;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">🚦</div>`,
            iconSize: [30, 30], iconAnchor: [15, 15], className: ''
        });
        this.marcador = L.marker([lat, lng], { icon }).addTo(this.leafletMap);
        this.marcador.bindPopup(`Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`).openPopup();
    }

    // ── FOTOS ─────────────────────────────────────
    onFoto(event: any, tipo: string) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e: any) => {
            (this as any)[`preview${tipo}`] = e.target.result;
        };
        reader.readAsDataURL(file);
        (this as any)[`foto${tipo}`] = file;
    }

    async subirFoto(file: File, campo: string, id: string) {
        const fd = new FormData();
        fd.append('foto', file);
        this.api.uploadFile<any>(`/upload/semaforo`, fd).subscribe({
            next: (r: any) => {
                this.api.put(`/semaforos/${id}`, { [campo]: r.urls[0] }).subscribe();
            }
        });
    }
    fotosCaras: (File | null)[] = [];
    previewsCaras: string[]     = [];

    onFotoCara(event: any, index: number) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.previewsCaras[index] = e.target.result;
        };
        reader.readAsDataURL(file);
        this.fotosCaras[index] = file;
    }

    // ── GUARDAR ───────────────────────────────────
    guardar(seguirAgregando = false) {
        if (!this.form.idViaTramo) {
            this.error = 'Selecciona un tramo de vía';
            return;
        }

        this.loading = true;
        this.error   = '';

        if (this.form.lat && this.form.lng) {
            this.form.ubicacion = {
                type: 'Point',
                coordinates: [parseFloat(this.form.lng), parseFloat(this.form.lat)]
            };
        }

        ['obs1','obs2','obs3','obs4','obs5','obs6'].forEach(campo => {
            if (this.form[campo] === '' || this.form[campo] === undefined) {
                this.form[campo] = null;
            }
        });

        if (!this.form.idControSem) this.form.idControSem = null;

        const formData = { ...this.form };
        delete formData.logUltimaMod;

        const obs$ = this.modoEdicion
            ? this.semaforoService.update(this.idEdicion!, formData)
            : this.semaforoService.create(formData);

        obs$.subscribe({
            next: async (res: any) => {
                const id = res.registro._id;

                // Subir fotos accesorios
                const subirFoto = (file: File | null, campo: string): Promise<void> => {
                    return new Promise((resolve) => {
                        if (!file) { resolve(); return; }
                        const fd = new FormData();
                        fd.append('foto', file);
                        this.api.uploadFile<any>(`/upload/semaforo`, fd).subscribe({
                            next: (r: any) => {
                                this.api.put(`/semaforos/${id}/fotos`, { [campo]: r.urls[0] }).subscribe({
                                    next: () => resolve(),
                                    error: () => resolve()
                                });
                            },
                            error: () => resolve()
                        });
                    });
                };

                await subirFoto(this.fotoSemaforo, 'urlFotoSemaforo');
                await subirFoto(this.fotoSoporte,  'urlFotoSoporte');
                await subirFoto(this.fotoAnclaje,  'urlFotoAnclaje');
                await subirFoto(this.fotoPulsador, 'urlFotoPulsador');
                await subirFoto(this.fotoDispAud,  'urlFotoDispAud');

                // Subir fotos de caras
                const carasActualizadas = [...this.form.caras];
                console.log('CARAS ANTES:', JSON.stringify(carasActualizadas.map(c => c.urlFoto)));

                for (let index = 0; index < this.fotosCaras.length; index++) {
                    const file = this.fotosCaras[index];
                    if (!file) continue;
                    await new Promise<void>((resolve) => {
                        const fd = new FormData();
                        fd.append('foto', file);
                        this.api.uploadFile<any>(`/upload/semaforo`, fd).subscribe({
                            next: (r: any) => {
                              console.log('URL FOTO CARA', index, ':', r.urls[0]);
                                carasActualizadas[index] = {
                                    ...carasActualizadas[index],
                                    urlFoto: r.urls[0]
                                };
                                console.log('CARA ACTUALIZADA:', carasActualizadas[index].urlFoto);
                                resolve();
                            },
                            error: (err) => { console.error('Error foto cara:', err); resolve(); }
                        });
                    });
                }
                console.log('CARAS DESPUES:', JSON.stringify(carasActualizadas.map(c => c.urlFoto)));
                // Actualizar caras con todas las fotos
                if (this.fotosCaras.some(f => f !== null)) {
                    await new Promise<void>((resolve) => {
                        this.api.put(`/semaforos/${id}/caras`, { caras: carasActualizadas }).subscribe({
                        next: (res) => { console.log('CARAS GUARDADAS:', res); resolve(); },
                        error: (err) => { console.error('ERROR CARAS:', err); resolve(); }
                    });
                    });
                }

                this.loading = false;
                if (seguirAgregando) {
                    this.resetForm();
                } else {
                    this.router.navigate(['/semaforos']);
                }
            },
            error: (err) => {
                this.loading = false;
                this.error   = err.error?.message || 'Error al guardar';
            }
        });
    }
  triggerFotoCara(index: number) {
        const input = document.getElementById('fotoCara_' + index) as HTMLInputElement;
        if (input) input.click();
    }

    resetForm() {
        this.tramoSeleccionado   = null;
        this.controlSeleccionado = null;
        this.fotoSemaforo = null; this.fotoSoporte = null;
        this.fotoAnclaje  = null; this.fotoPulsador = null;
        this.fotoDispAud  = null;
        this.previewSemaforo = ''; this.previewSoporte = '';
        this.previewAnclaje  = ''; this.previewPulsador = '';
        this.previewDispAud  = '';
        this.fotosCaras    = [];
        this.previewsCaras = [];
        this.pasoActual = 1;
        this.form = {
            ...this.form,
            idViaTramo: '', idControSem: '',
            numExterno: null, controlRef: '',
            ipRadio: '', sitio: '', semaforoFunciona: true,
            claseSem: '', numCaras: 1, obstruccion: '',
            visibilidadOptima: '', fase: '', accion: '',
            estadoGenPint: '', implementacion: '',
            pulsador: false, estadoPulsador: '',
            temporizador: false, estadoTemp: '',
            dispositivoAuditivo: false, estadoDispAud: '',
            tipoSoporte: '', estadoSoporte: '', pinturaSoporte: '',
            sistemaSoporte: '', estadoAnclaje: '',
            urlFotoSemaforo: '', urlFotoSoporte: '', urlFotoAnclaje: '',
            urlFotoPulsador: '', urlFotoDispAud: '',
            caras: [], obs1: '', obs2: '', obs3: '',
            obs4: '', obs5: '', obs6: '', notasGenerales: '',
            ubicacion: { type: 'Point', coordinates: [] },
            lat: null, lng: null
        };
        this.inicializarCaras();
        this.error = '';
    }
}