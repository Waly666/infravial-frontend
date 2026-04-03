/**
 * Exportación GeoJSON (EPSG:4326, orden lon/lat) para QGIS / ArcGIS.
 * Las fotos van como URLs absolutas + campo `popup_html` para map tips HTML.
 */

/** Convierte `environment.apiUrl` relativo (`/api`) en URL absoluta para GeoJSON. */
export function absoluteApiBaseForExport(apiUrlFromEnv: string): string {
    const api = apiUrlFromEnv.replace(/\/$/, '');
    if (/^https?:\/\//i.test(api)) return api;
    if (typeof window === 'undefined') return api;
    const path = api.startsWith('/') ? api : `/${api}`;
    return `${window.location.origin}${path}`;
}

export type GeoJsonCapa =
    | 'via_tramo'
    | 'sen_vert'
    | 'sen_hor'
    | 'semaforo'
    | 'control_semaforico';

export interface GeoJsonFeatureCollection {
    type: 'FeatureCollection';
    name?: string;
    /** WGS84 (EPSG:4326) por convención GeoJSON RFC 7946 */
    features: GeoJsonFeature[];
}

export interface GeoJsonFeature {
    type: 'Feature';
    geometry: GeoJsonGeometry | null;
    properties: Record<string, unknown>;
}

type GeoJsonGeometry =
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'LineString'; coordinates: [number, number][] };

function escAttr(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;');
}

export function absPhotoUrl(
    path: string | null | undefined,
    apiBase: string
): string | null {
    if (!path || !String(path).trim()) return null;
    const p = String(path).trim();
    if (/^https?:\/\//i.test(p)) return p;
    const base = apiBase.replace(/\/$/, '');
    return base + (p.startsWith('/') ? p : '/' + p);
}

function mongoId(r: { _id?: unknown }): string {
    const id = r?._id;
    if (id == null) return '';
    if (typeof id === 'string') return id;
    if (typeof id === 'object' && id !== null) {
        const o = id as { $oid?: string; toHexString?: () => string };
        if (o.$oid != null) return String(o.$oid);
        if (typeof o.toHexString === 'function') return o.toHexString();
    }
    return String(id);
}

function idViaTramoStr(r: { idViaTramo?: unknown }): string {
    const v = r?.idViaTramo;
    if (!v) return '';
    if (typeof v === 'object' && v !== null && (v as { _id?: unknown })._id != null) {
        return mongoId({ _id: (v as { _id: unknown })._id });
    }
    return String(v);
}

function viaTramoContext(vt: unknown): {
    via: string;
    departamento: string;
    municipio: string;
    nomenclatura: string;
} {
    if (!vt || typeof vt !== 'object') {
        return { via: '', departamento: '', municipio: '', nomenclatura: '' };
    }
    const t = vt as {
        via?: unknown;
        departamento?: unknown;
        municipio?: unknown;
        nomenclatura?: { completa?: string };
    };
    const n = t.nomenclatura;
    return {
        via: t.via != null ? String(t.via) : '',
        departamento: t.departamento != null ? String(t.departamento) : '',
        municipio: t.municipio != null ? String(t.municipio) : '',
        nomenclatura:
            n?.completa != null && String(n.completa).trim() !== ''
                ? String(n.completa)
                : ''
    };
}

function popupImgsHtml(urls: string[]): string {
    if (!urls.length) return '';
    const imgs = urls
        .slice(0, 8)
        .map(
            (u) =>
                `<img src="${escAttr(u)}" alt="" width="240" style="max-width:100%;height:auto;display:block;margin-bottom:6px;border-radius:4px"/>`
        )
        .join('');
    return `<div>${imgs}</div>`;
}

function lineGeometry(coords: unknown): GeoJsonGeometry | null {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const out: [number, number][] = [];
    for (const c of coords) {
        if (!Array.isArray(c) || c.length < 2) continue;
        const lng = Number(c[0]);
        const lat = Number(c[1]);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        out.push([lng, lat]);
    }
    return out.length >= 2 ? { type: 'LineString', coordinates: out } : null;
}

function pointGeometry(coords: unknown): GeoJsonGeometry | null {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { type: 'Point', coordinates: [lng, lat] };
}

/** Misma sumatoria de medidas de perfil que `calcularAncho()` en el formulario de vía-tramo. */
function sumAnchoPerfilViaTramo(t: any): number {
    const f = t || {};
    return (
        (Number(f.andenIzq) || 0) +
        (Number(f.zonaVerdeIzq) || 0) +
        (Number(f.anteJardinIzq) || 0) +
        (Number(f.sardIzqCalzA) || 0) +
        (Number(f.cicloRutaIzq) || 0) +
        (Number(f.areaServIzq) || 0) +
        (Number(f.bahiaEstIzq) || 0) +
        (Number(f.sardDerCalzA) || 0) +
        (Number(f.cunetaIzq) || 0) +
        (Number(f.bermaIzq) || 0) +
        (Number(f.calzadaIzq) || 0) +
        (Number(f.andenDer) || 0) +
        (Number(f.zonaVerdeDer) || 0) +
        (Number(f.anteJardinDer) || 0) +
        (Number(f.sardIzqCalzB) || 0) +
        (Number(f.cicloRutaDer) || 0) +
        (Number(f.areaServDer) || 0) +
        (Number(f.bahiaEstDer) || 0) +
        (Number(f.sardDerCalzB) || 0) +
        (Number(f.cunetaDer) || 0) +
        (Number(f.bermaDer) || 0) +
        (Number(f.calzadaDer) || 0) +
        (Number(f.separadorPeatonal) || 0) +
        (Number(f.separadorZonaVerdeIzq) || 0) +
        (Number(f.separadorCicloRuta) || 0) +
        (Number(f.separadorZonaVerdeDer) || 0)
    );
}

export function anchoTotalPerfilM(t: any): number | null {
    let ancho = sumAnchoPerfilViaTramo(t);
    if (ancho <= 0 && t?.anchoTotalPerfil != null && t.anchoTotalPerfil !== '') {
        const a = Number(t.anchoTotalPerfil);
        if (Number.isFinite(a) && a > 0) ancho = a;
    }
    return ancho > 0 ? Math.round(ancho * 100) / 100 : null;
}

export function featureFromViaTramo(t: any, apiBase: string): GeoJsonFeature | null {
    const geom = lineGeometry(
        t?.ubicacion && (t.ubicacion as { coordinates?: unknown }).coordinates
    );
    if (!geom) return null;
    const ctx = viaTramoContext(t);
    const fotosRaw = Array.isArray(t.fotos) ? (t.fotos as string[]) : [];
    const fotosAbs = fotosRaw
        .map((p) => absPhotoUrl(p, apiBase))
        .filter((x): x is string => x != null);
    const props: any = {
        capa: 'via_tramo' satisfies GeoJsonCapa,
        id: mongoId(t),
        id_jornada: t.idJornada != null ? String(t.idJornada) : '',
        via: ctx.via || t.via || '',
        departamento: ctx.departamento || t.departamento || '',
        municipio: ctx.municipio || t.municipio || '',
        nomenclatura: ctx.nomenclatura,
        fecha_inv: t.fechaInv != null ? String(t.fechaInv) : '',
        longitud_m:
            t.longitud_m != null && t.longitud_m !== ''
                ? Number(t.longitud_m)
                : null,
        ancho_total_perfil_m: anchoTotalPerfilM(t),
        tipo_ubic: t.tipoUbic != null ? String(t.tipoUbic) : '',
        tipo_via: t.tipoVia != null ? String(t.tipoVia) : ''
    };
    for (let i = 0; i < fotosAbs.length; i++) {
        props[`foto_${i + 1}`] = fotosAbs[i];
    }
    props.fotos_urls = fotosAbs.join('|');
    props.foto_principal = fotosAbs[0] ?? '';
    props.popup_html = popupImgsHtml(fotosAbs);
    return { type: 'Feature', geometry: geom, properties: props };
}

export function featureFromSenVert(r: any, apiBase: string): GeoJsonFeature | null {
    const geom = pointGeometry(
        r.ubicacion && (r.ubicacion as { coordinates?: unknown }).coordinates
    );
    if (!geom) return null;
    const vt = r.idViaTramo;
    const ctx = viaTramoContext(vt);
    const foto = absPhotoUrl(r.urlFotoSenVert as string, apiBase);
    const fotos = foto ? [foto] : [];
    const props: any = {
        capa: 'sen_vert' satisfies GeoJsonCapa,
        id: mongoId(r),
        id_via_tramo: idViaTramoStr(r),
        cod_se: r.codSe != null ? String(r.codSe) : '',
        estado: r.estado != null ? String(r.estado) : '',
        fase: r.fase != null ? String(r.fase) : '',
        accion: r.accion != null ? String(r.accion) : '',
        mat_placa: r.matPlaca != null ? String(r.matPlaca) : '',
        via: ctx.via,
        municipio: ctx.municipio,
        departamento: ctx.departamento,
        nomenclatura: ctx.nomenclatura
    };
    props.foto_principal = foto ?? '';
    props.fotos_urls = fotos.join('|');
    props.popup_html = popupImgsHtml(fotos);
    return { type: 'Feature', geometry: geom, properties: props };
}

export function featureFromSenHor(r: any, apiBase: string): GeoJsonFeature | null {
    const geom = pointGeometry(
        r.ubicacion && (r.ubicacion as { coordinates?: unknown }).coordinates
    );
    if (!geom) return null;
    const vt = r.idViaTramo;
    const ctx = viaTramoContext(vt);
    const foto = absPhotoUrl(r.urlFotoSH as string, apiBase);
    const fotos = foto ? [foto] : [];
    const props: any = {
        capa: 'sen_hor' satisfies GeoJsonCapa,
        id: mongoId(r),
        id_via_tramo: idViaTramoStr(r),
        cod_se_hor: r.codSeHor != null ? String(r.codSeHor) : '',
        tipo_dem: r.tipoDem != null ? String(r.tipoDem) : '',
        estado_dem: r.estadoDem != null ? String(r.estadoDem) : '',
        color: r.color != null ? String(r.color) : '',
        fase: r.fase != null ? String(r.fase) : '',
        accion: r.accion != null ? String(r.accion) : '',
        via: ctx.via,
        municipio: ctx.municipio,
        departamento: ctx.departamento,
        nomenclatura: ctx.nomenclatura
    };
    props.foto_principal = foto ?? '';
    props.fotos_urls = fotos.join('|');
    props.popup_html = popupImgsHtml(fotos);
    return { type: 'Feature', geometry: geom, properties: props };
}

function collectSemaforoPhotoUrls(r: any, apiBase: string): string[] {
    const keys = [
        'urlFotoSemaforo',
        'urlFotoSoporte',
        'urlFotoAnclaje',
        'urlFotoPulsador',
        'urlFotoDispAud'
    ];
    const out: string[] = [];
    for (const k of keys) {
        const u = absPhotoUrl(r[k] as string, apiBase);
        if (u) out.push(u);
    }
    const caras = r.caras;
    if (Array.isArray(caras)) {
        for (const c of caras) {
            if (c && typeof c === 'object') {
                const u = absPhotoUrl((c as { urlFoto?: string }).urlFoto, apiBase);
                if (u) out.push(u);
            }
        }
    }
    return [...new Set(out)];
}

export function featureFromSemaforo(r: any, apiBase: string): GeoJsonFeature | null {
    const geom = pointGeometry(
        r.ubicacion && (r.ubicacion as { coordinates?: unknown }).coordinates
    );
    if (!geom) return null;
    const vt = r.idViaTramo;
    const ctx = viaTramoContext(vt);
    const fotos = collectSemaforoPhotoUrls(r, apiBase);
    const props: any = {
        capa: 'semaforo' satisfies GeoJsonCapa,
        id: mongoId(r),
        id_via_tramo: idViaTramoStr(r),
        num_externo:
            r.numExterno != null && r.numExterno !== ''
                ? Number(r.numExterno)
                : null,
        sitio: r.sitio != null ? String(r.sitio) : '',
        estado_pintura: r.estadoGenPint != null ? String(r.estadoGenPint) : '',
        fase: r.fase != null ? String(r.fase) : '',
        accion: r.accion != null ? String(r.accion) : '',
        via: ctx.via,
        municipio: ctx.municipio,
        departamento: ctx.departamento,
        nomenclatura: ctx.nomenclatura
    };
    for (let i = 0; i < fotos.length; i++) {
        props[`foto_${i + 1}`] = fotos[i];
    }
    props.fotos_urls = fotos.join('|');
    props.foto_principal = fotos[0] ?? '';
    props.popup_html = popupImgsHtml(fotos);
    return { type: 'Feature', geometry: geom, properties: props };
}

export function featureFromControlSem(r: any, apiBase: string): GeoJsonFeature | null {
    const geom = pointGeometry(
        r.ubicacion && (r.ubicacion as { coordinates?: unknown }).coordinates
    );
    if (!geom) return null;
    const vt = r.idViaTramo;
    const ctx = viaTramoContext(vt);
    const f1 = absPhotoUrl(r.urlFotoControlador as string, apiBase);
    const f2 = absPhotoUrl(r.urlFotoArmario as string, apiBase);
    const fotos = [f1, f2].filter((x): x is string => x != null);
    const props: any = {
        capa: 'control_semaforico' satisfies GeoJsonCapa,
        id: mongoId(r),
        id_via_tramo: idViaTramoStr(r),
        num_externo:
            r.numExterno != null && r.numExterno !== ''
                ? Number(r.numExterno)
                : null,
        estado_controlador:
            r.estadoControlador != null ? String(r.estadoControlador) : '',
        tipo_controlador:
            r.tipoControlador != null ? String(r.tipoControlador) : '',
        serial: r.serialControlador != null ? String(r.serialControlador) : '',
        modelo: r.modelo != null ? String(r.modelo) : '',
        fabricante: r.fabricante != null ? String(r.fabricante) : '',
        fase: r.fase != null ? String(r.fase) : '',
        accion: r.accion != null ? String(r.accion) : '',
        via: ctx.via,
        municipio: ctx.municipio,
        departamento: ctx.departamento,
        nomenclatura: ctx.nomenclatura
    };
    props.foto_controlador = f1 ?? '';
    props.foto_armario = f2 ?? '';
    props.fotos_urls = fotos.join('|');
    props.foto_principal = fotos[0] ?? '';
    props.popup_html = popupImgsHtml(fotos);
    return { type: 'Feature', geometry: geom, properties: props };
}

export function buildCollection(
    name: string,
    features: GeoJsonFeature[]
): GeoJsonFeatureCollection {
    return {
        type: 'FeatureCollection',
        name,
        features: features.filter((f) => f.geometry != null)
    };
}

/**
 * Filtra propiedades del feature según la selección del usuario.
 * `id` siempre se conserva. `foto_N` solo si `foto_indexada` está en el set.
 */
export function applyGeoJsonFieldSelection(
    props: Record<string, unknown>,
    selection: Set<string>,
    fotoIndexadaKey: string
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const allowIndexed = selection.has(fotoIndexadaKey);
    for (const [k, v] of Object.entries(props)) {
        if (k === 'id') {
            out[k] = v;
            continue;
        }
        if (/^foto_\d+$/.test(k)) {
            if (allowIndexed) out[k] = v;
            continue;
        }
        if (selection.has(k)) out[k] = v;
    }
    return out;
}

export function downloadGeoJson(
    collection: GeoJsonFeatureCollection,
    filename: string
): void {
    const json = JSON.stringify(collection, null, 2);
    const blob = new Blob([json], { type: 'application/geo+json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.geojson') ? filename : `${filename}.geojson`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
