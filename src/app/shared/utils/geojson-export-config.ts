/**
 * Definición y persistencia de campos exportables en GeoJSON (por tipo de capa).
 */

export type GeoJsonExportTab =
    | 'via_tramos'
    | 'sen_vert'
    | 'sen_hor'
    | 'semaforos'
    | 'control_sem';

/** Clave virtual: incluye columnas foto_1, foto_2… además de foto_principal. */
export const FOTO_INDEXADA_KEY = 'foto_indexada';

export interface GeoJsonExportFieldRow {
    key: string;
    label: string;
    /** Si true, el checkbox aparece deshabilitado y el campo siempre se exporta. */
    required?: boolean;
}

export const GEOJSON_EXPORT_TABS: {
    id: GeoJsonExportTab;
    title: string;
}[] = [
    { id: 'via_tramos', title: 'Vías (tramos)' },
    { id: 'sen_vert', title: 'Señales verticales' },
    { id: 'sen_hor', title: 'Señales horizontales' },
    { id: 'semaforos', title: 'Semáforos' },
    { id: 'control_sem', title: 'Control semafórico' }
];

export const GEOJSON_FIELD_ROWS: Record<GeoJsonExportTab, GeoJsonExportFieldRow[]> = {
    via_tramos: [
        { key: 'id', label: 'ID registro', required: true },
        { key: 'capa', label: 'Tipo de capa (capa)' },
        { key: 'id_jornada', label: 'ID jornada' },
        { key: 'via', label: 'Nombre de vía' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'municipio', label: 'Municipio' },
        { key: 'nomenclatura', label: 'Nomenclatura' },
        { key: 'fecha_inv', label: 'Fecha inventario' },
        { key: 'longitud_m', label: 'Longitud del tramo (m)' },
        {
            key: 'ancho_total_perfil_m',
            label: 'Ancho total perfil (m, suma medidas)'
        },
        { key: 'tipo_ubic', label: 'Diseño / tipo ubicación' },
        { key: 'tipo_via', label: 'Tipo / área vía' },
        { key: 'foto_principal', label: 'URL foto principal' },
        { key: 'fotos_urls', label: 'Todas las URLs (separadas por |)' },
        { key: 'popup_html', label: 'HTML para map tips (imágenes)' },
        {
            key: FOTO_INDEXADA_KEY,
            label: 'Columnas foto_1, foto_2… (si hay varias)'
        }
    ],
    sen_vert: [
        { key: 'id', label: 'ID registro', required: true },
        { key: 'capa', label: 'Tipo de capa (capa)' },
        { key: 'id_via_tramo', label: 'ID tramo' },
        { key: 'cod_se', label: 'Código señal' },
        { key: 'estado', label: 'Estado' },
        { key: 'fase', label: 'Fase' },
        { key: 'accion', label: 'Acción' },
        { key: 'mat_placa', label: 'Material placa' },
        { key: 'via', label: 'Vía / tramo' },
        { key: 'municipio', label: 'Municipio' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'nomenclatura', label: 'Nomenclatura' },
        { key: 'foto_principal', label: 'URL foto' },
        { key: 'fotos_urls', label: 'URLs fotos' },
        { key: 'popup_html', label: 'HTML map tips' }
    ],
    sen_hor: [
        { key: 'id', label: 'ID registro', required: true },
        { key: 'capa', label: 'Tipo de capa (capa)' },
        { key: 'id_via_tramo', label: 'ID tramo' },
        { key: 'cod_se_hor', label: 'Código demarcación' },
        { key: 'tipo_dem', label: 'Tipo demarcación' },
        { key: 'estado_dem', label: 'Estado demarcación' },
        { key: 'color', label: 'Color' },
        { key: 'fase', label: 'Fase' },
        { key: 'accion', label: 'Acción' },
        { key: 'via', label: 'Vía / tramo' },
        { key: 'municipio', label: 'Municipio' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'nomenclatura', label: 'Nomenclatura' },
        { key: 'foto_principal', label: 'URL foto' },
        { key: 'fotos_urls', label: 'URLs fotos' },
        { key: 'popup_html', label: 'HTML map tips' }
    ],
    semaforos: [
        { key: 'id', label: 'ID registro', required: true },
        { key: 'capa', label: 'Tipo de capa (capa)' },
        { key: 'id_via_tramo', label: 'ID tramo' },
        { key: 'num_externo', label: 'Número externo' },
        { key: 'sitio', label: 'Sitio' },
        { key: 'estado_pintura', label: 'Estado pintura' },
        { key: 'fase', label: 'Fase' },
        { key: 'accion', label: 'Acción' },
        { key: 'via', label: 'Vía / tramo' },
        { key: 'municipio', label: 'Municipio' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'nomenclatura', label: 'Nomenclatura' },
        { key: 'foto_principal', label: 'URL foto principal' },
        { key: 'fotos_urls', label: 'Todas las URLs (|)' },
        { key: 'popup_html', label: 'HTML map tips' },
        {
            key: FOTO_INDEXADA_KEY,
            label: 'Columnas foto_1, foto_2… (varias fotos)'
        }
    ],
    control_sem: [
        { key: 'id', label: 'ID registro', required: true },
        { key: 'capa', label: 'Tipo de capa (capa)' },
        { key: 'id_via_tramo', label: 'ID tramo' },
        { key: 'num_externo', label: 'Número externo' },
        { key: 'estado_controlador', label: 'Estado controlador' },
        { key: 'tipo_controlador', label: 'Tipo controlador' },
        { key: 'serial', label: 'Serial' },
        { key: 'modelo', label: 'Modelo' },
        { key: 'fabricante', label: 'Fabricante' },
        { key: 'fase', label: 'Fase' },
        { key: 'accion', label: 'Acción' },
        { key: 'via', label: 'Vía / tramo' },
        { key: 'municipio', label: 'Municipio' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'nomenclatura', label: 'Nomenclatura' },
        { key: 'foto_controlador', label: 'URL foto controlador' },
        { key: 'foto_armario', label: 'URL foto armario' },
        { key: 'foto_principal', label: 'URL foto principal (resumen)' },
        { key: 'fotos_urls', label: 'URLs fotos' },
        { key: 'popup_html', label: 'HTML map tips' }
    ]
};

const LS_KEY = 'infravial.geojsonExportFields.v2';

export function defaultSelectionForTab(tab: GeoJsonExportTab): Set<string> {
    return new Set(GEOJSON_FIELD_ROWS[tab].map((r) => r.key));
}

/** Valor `capa` dentro de cada feature → pestaña de preferencias. */
export function capaPropertyToTab(
    capa: string | undefined
): GeoJsonExportTab {
    const m: Record<string, GeoJsonExportTab> = {
        via_tramo: 'via_tramos',
        sen_vert: 'sen_vert',
        sen_hor: 'sen_hor',
        semaforo: 'semaforos',
        control_semaforico: 'control_sem'
    };
    return m[capa ?? ''] ?? 'via_tramos';
}

export type StoredExportFields = Partial<Record<GeoJsonExportTab, string[]>>;

export function loadExportFieldPrefs(): Map<GeoJsonExportTab, Set<string>> {
    const map = new Map<GeoJsonExportTab, Set<string>>();
    for (const t of GEOJSON_EXPORT_TABS) {
        map.set(t.id, defaultSelectionForTab(t.id));
    }
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return map;
        const parsed = JSON.parse(raw) as StoredExportFields;
        for (const t of GEOJSON_EXPORT_TABS) {
            const arr = parsed[t.id];
            if (Array.isArray(arr) && arr.length) {
                const validKeys = new Set(
                    GEOJSON_FIELD_ROWS[t.id].map((r) => r.key)
                );
                const next = new Set<string>();
                for (const k of arr) {
                    if (validKeys.has(k)) next.add(k);
                }
                for (const row of GEOJSON_FIELD_ROWS[t.id]) {
                    if (row.required) next.add(row.key);
                }
                if (next.size) map.set(t.id, next);
            }
        }
    } catch {
        /* ignore */
    }
    return map;
}

export function saveExportFieldPrefs(
    map: Map<GeoJsonExportTab, Set<string>>
): void {
    const out: StoredExportFields = {};
    for (const t of GEOJSON_EXPORT_TABS) {
        out[t.id] = Array.from(map.get(t.id) ?? defaultSelectionForTab(t.id));
    }
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(out));
    } catch {
        /* ignore */
    }
}
