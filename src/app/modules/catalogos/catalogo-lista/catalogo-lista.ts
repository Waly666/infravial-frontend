import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogoService } from '../../../core/services/catalogo.service';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';

@Component({
    selector: 'app-catalogo-lista',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './catalogo-lista.html',
    styleUrl: './catalogo-lista.scss'
})
export class CatalogoListaComponent implements OnInit {

    // Catálogo activo
    catalogoActivo = 'observacionesVias';
    datos:    any[] = [];
    loading:  boolean = true;
    error:    string  = '';
    busqueda: string  = '';

    // Modal
    editando:  boolean = false;
    creando:   boolean = false;
    itemEdit:  any     = null;
    nuevoItem: any     = {};

    busquedaDivipolCat:    string   = '';
    resultadosDivipolCat:  any[]    = [];
    buscandoCat:           boolean  = false;
    mostrarDivipolCat:     boolean  = false;
    catalogosConDivipol = ['zats', 'comunas', 'barrios'];

    get usaDivipol(): boolean {
    return this.catalogosConDivipol.includes(this.catalogoActivo);
    }

    apiUrl = environment.apiUrl;

    catalogos = [
        { id: 'obs-vias',       label: 'Observaciones Vías',       campo: 'txtObs',      tieneImagen: false },
        { id: 'obs-sv',         label: 'Observaciones Señ. Vert.', campo: 'observacion', tieneImagen: false },
        { id: 'obs-sh',         label: 'Observaciones Señ. Hor.',  campo: 'obsSH',       tieneImagen: false },
        { id: 'obs-semaforos',  label: 'Observaciones Semáforos',  campo: 'textoObs',    tieneImagen: false },
        { id: 'zats',           label: 'ZATs',                     campo: 'zatNumero',   tieneImagen: false },
        { id: 'comunas',        label: 'Comunas',                  campo: 'comunaNumero',tieneImagen: false },
        { id: 'barrios',        label: 'Barrios',                  campo: 'barrioNumero',tieneImagen: false },
        { id: 'esquema-perfil', label: 'Esquemas Perfil',          campo: 'codEsquema',  tieneImagen: true  },
        { id: 'sen-vert',       label: 'Señales Verticales',       campo: 'codSenVert',  tieneImagen: true  },
        { id: 'ubic-sen-hor',   label: 'Ubic. Señ. Horizontales',  campo: 'ubicacion',   tieneImagen: true  },
        { id: 'demarcaciones',  label: 'Demarcaciones',            campo: 'codDem',      tieneImagen: true  },
        { id: 'divipol',        label: 'DIVIPOL',                  campo: 'divipolMunicipio', tieneImagen: false },
        { id: 'preguntas-enc',  label: 'Preguntas Encuesta',       campo: 'enunciado',   tieneImagen: false },
    ];

    imagenFile: File | null = null;

    // Paginación cards
    cardPage     = 1;
    cardPageSize = 48;

    constructor(
        private catalogoService: CatalogoService,
        private api:             ApiService,
        private confirmDialog:   ConfirmDialogService,
        public  router:          Router
    ) {}

    ngOnInit() { this.cargarCatalogo(); }

    get catalogoInfo() {
        return this.catalogos.find(c => c.id === this.catalogoActivo);
    }

    cargarCatalogo() {
        this.loading = true;
        this.datos   = [];
        

        this.api.get<any>(`/catalogos/${this.catalogoActivo}`).subscribe({
            next: (res) => {
                this.datos   = res.datos || [];
                this.loading = false;
            },
            error: () => {
                this.error   = 'Error al cargar catálogo';
                this.loading = false;
            }
        });
    }

    seleccionarCatalogo(id: string) {
        this.catalogoActivo = id;
        this.busqueda       = '';
        this.cardPage       = 1;
        this.cargarCatalogo();
    }

    get datosFiltradosPaginados(): any[] {
        const start = (this.cardPage - 1) * this.cardPageSize;
        return this.datosFiltrados.slice(start, start + this.cardPageSize);
    }

    get cardTotalPages(): number {
        return Math.ceil(this.datosFiltrados.length / this.cardPageSize) || 1;
    }

    get datosFiltrados() {
        if (!this.busqueda) return this.datos;
        const q = this.busqueda.toLowerCase();
        return this.datos.filter(d =>
            JSON.stringify(d).toLowerCase().includes(q)
        );
    }

    getKeys(item: any): string[] {
        const camposOcultos = ['_id', '__v', 'urlImgEsq', 'urlImgSenVert', 'urlImgUbic', 'urlDemImg'];
        return Object.keys(item).filter(k => !camposOcultos.includes(k));
    }

    getCampoImagen(): string {
        const mapa: any = {
            'esquema-perfil': 'urlImgEsq',
            'sen-vert':       'urlImgSenVert',
            'ubic-sen-hor':   'urlImgUbic',
            'demarcaciones':  'urlDemImg'
        };
        return mapa[this.catalogoActivo] || '';
    }

    abrirCrear() {
        if (this.usaDivipol) {
            this.abrirCrearConDivipol();
        } else {
            this.nuevoItem  = {};
            this.imagenFile = null;
            this.creando    = true;
        }
    }

    editar(item: any) {
        if (this.usaDivipol) {
            this.editarConDivipol(item);
        } else {
            this.itemEdit   = { ...item };
            this.imagenFile = null;
            this.editando   = true;
        }
    }

    onImagenSeleccionada(event: any) {
        this.imagenFile = event.target.files[0] || null;
    }

    onImgError(event: Event) {
        (event.target as HTMLImageElement).style.display = 'none';
        const wrap = (event.target as HTMLElement).closest('.cat-card-img-wrap');
        if (wrap) {
            const ph = wrap.querySelector('.cat-card-no-img') as HTMLElement;
            if (ph) ph.style.display = 'flex';
        }
    }

    guardarNuevo() {
        if (this.catalogoInfo?.tieneImagen && this.imagenFile) {
            const formData = new FormData();
            Object.keys(this.nuevoItem).forEach(k => formData.append(k, this.nuevoItem[k]));
            formData.append('imagen', this.imagenFile);
            this.api.uploadFile<any>(`/catalogos/${this.catalogoActivo}`, formData).subscribe({
                next: () => { this.creando = false; this.cargarCatalogo(); },
                error: (err) => alert(err.error?.message || 'Error al crear')
            });
        } else {
            this.api.post<any>(`/catalogos/${this.catalogoActivo}`, this.nuevoItem).subscribe({
                next: () => { this.creando = false; this.cargarCatalogo(); },
                error: (err) => alert(err.error?.message || 'Error al crear')
            });
        }
    }

    guardarEdicion() {
    if (this.catalogoInfo?.tieneImagen && this.imagenFile) {
        // Con imagen: usar FormData
        const formData = new FormData();
        Object.keys(this.itemEdit).forEach(k => {
            if (k !== '_id' && k !== '__v') formData.append(k, this.itemEdit[k]);
        });
        formData.append('imagen', this.imagenFile);
        this.api.uploadFilePut<any>(`/catalogos/${this.catalogoActivo}/${this.itemEdit._id}`, formData).subscribe({
            next: () => { this.editando = false; this.cargarCatalogo(); },
            error: (err) => alert(err.error?.message || 'Error al actualizar')
        });
    } else {
        // Sin imagen: usar JSON
        const data: any = {};
        Object.keys(this.itemEdit).forEach(k => {
            if (k !== '_id' && k !== '__v') data[k] = this.itemEdit[k];
        });
        this.api.put<any>(`/catalogos/${this.catalogoActivo}/${this.itemEdit._id}`, data).subscribe({
            next: () => { this.editando = false; this.cargarCatalogo(); },
            error: (err) => alert(err.error?.message || 'Error al actualizar')
        });
    }
    }

    eliminar(id: string) {
        const label = this.catalogoInfo?.label ?? 'este catálogo';
        this.confirmDialog
            .confirm({
                title: '¿Eliminar este registro?',
                message: `Se quitará del catálogo «${label}». Esta acción no se puede deshacer.`,
                confirmText: 'Sí, eliminar',
                cancelText: 'Cancelar',
                variant: 'danger',
                icon: 'delete'
            })
            .subscribe((ok) => {
                if (!ok) return;
                this.catalogoService
                    .delete(this.catalogoActivo, id)
                    .subscribe({
                        next: () => this.cargarCatalogo(),
                        error: (err) =>
                            alert(err.error?.message || 'Error al eliminar')
                    });
            });
    }

    cerrarModal() {
        this.editando  = false;
        this.creando   = false;
        this.itemEdit  = null;
        this.imagenFile = null;
    }

    getImagenUrl(item: any): string {
        const campo = this.getCampoImagen();
        if (!campo || !item[campo]) return '';
        return `${this.apiUrl}${item[campo]}`;
    }
    buscarDivipolCat() {
    if (this.busquedaDivipolCat.length < 2) return;
    this.buscandoCat = true;
    this.catalogoService.buscarDivipol(this.busquedaDivipolCat).subscribe({
        next: (res) => {
            this.resultadosDivipolCat = res.datos;
            this.mostrarDivipolCat   = true;
            this.buscandoCat         = false;
        },
        error: () => this.buscandoCat = false
    });
}

    seleccionarDivipolCat(item: any, destino: any) {
        destino.deptoDivipol = item.divipolDeptoCod;
        destino.deptoNombre  = item.divipolDepto;
        destino.munDivipol   = item.divipolMunCod;
        destino.munNombre    = item.divipolMunicipio;
        this.busquedaDivipolCat   = `${item.divipolMunicipio} - ${item.divipolDepto}`;
        this.mostrarDivipolCat    = false;
        this.resultadosDivipolCat = [];
    }

    abrirCrearConDivipol() {
        this.nuevoItem          = {};
        this.imagenFile         = null;
        this.busquedaDivipolCat = '';
        this.mostrarDivipolCat  = false;
        this.creando            = true;
    }

    editarConDivipol(item: any) {
        this.itemEdit           = { ...item };
        this.imagenFile         = null;
        this.busquedaDivipolCat = item.munNombre ? `${item.munNombre} - ${item.deptoNombre}` : '';
        this.mostrarDivipolCat  = false;
        this.editando           = true;
    }

    get cardGridCols(): string {
        const minW = this.catalogoActivo === 'sen-vert' ? '320px' : '200px';
        return `repeat(auto-fill, minmax(min(100%, ${minW}), 1fr))`;
    }

    get imgWrapHeight(): number {
        return this.catalogoActivo === 'esquema-perfil' ? 120 : 180;
    }

    get cardMinHeight(): string {
        const cortos = ['demarcaciones', 'ubic-sen-hor', 'esquema-perfil'];
        return cortos.includes(this.catalogoActivo) ? '302px' : '480px';
    }

    /** Campos a mostrar en la card (solo los más relevantes) */
    getCamposCard(item: any): { k: string; v: any }[] {
        const mapa: Record<string, string[]> = {
            'sen-vert':       ['codSenVert', 'descSenVert', 'clasificacion', 'funcion', 'color', 'forma', 'descripcion'],
            'esquema-perfil': ['codEsquema', 'calzada'],
            'ubic-sen-hor':   ['ubicacion'],
            'demarcaciones':  ['codDem', 'claseDem']
        };
        const campos = mapa[this.catalogoActivo] ?? this.getKeys(item).slice(0, 3);
        return campos.map(k => ({ k, v: item[k] ?? '—' }));
    }

    getLabelCampo(campo: string): string {
        const etiquetas: any = {
            txtObs:       'Observación',
            observacion:  'Observación',
            obsSH:        'Observación',
            textoObs:     'Observación',
            codSenVert:   'Código',
            descSenVert:  'Descripción',
            clasificacion:'Clasificación',
            funcion:      'Función',
            color:        'Color',
            descripcion:  'Descripción',
            forma:        'Forma',
            urlImgSenVert:'URL Imagen',
            codEsquema:   'Código Esquema',
            calzada:      'Calzada',
            urlImgEsq:    'URL Imagen',
            ubicacion:    'Ubicación',
            urlImgUbic:   'URL Imagen',
            codDem:       'Código',
            claseDem:     'Clase',
            urlDemImg:    'URL Imagen',
            zatNumero:    'Número ZAT',
            zatLetra:     'Letra ZAT',
            comunaNumero: 'Número Comuna',
            comunaLetra:  'Letra Comuna',
            nombre:       'Nombre',
            deptoDivipol: 'Cód. Departamento',
            deptoNombre:  'Departamento',
            munDivipol:   'Cód. Municipio',
            munNombre:    'Municipio',
            consecutivo:  'Consecutivo',
            enunciado:    'Pregunta',
            divipolMunCod:'Cód. Municipio',
            divipolMunicipio: 'Municipio',
            divipolDepto: 'Departamento',
            divipolDeptoCod: 'Cód. Departamento',
        };
        return etiquetas[campo] || campo;
    }
}