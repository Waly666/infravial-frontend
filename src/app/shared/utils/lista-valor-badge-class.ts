/**
 * Pills Fase / Acción en listas: un color fijo por valor conocido (normalizado).
 * Valores no listados → badge-val-desconocido.
 */

function normalizeListaValorKey(raw: string): string {
    return raw
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/** Claves = texto normalizado (sin tildes, minúsculas). */
const LISTA_VALOR_BADGE_CLASS: Readonly<Record<string, string>> = {
    // Fase (vertical, horizontal, semáforo)
    inventario: 'badge-val-inventario',
    programacion: 'badge-val-programacion',
    diseno: 'badge-val-diseno',
    'por definir': 'badge-val-por-definir',
    'para definir': 'badge-val-por-definir',

    // Acción — señal vertical
    mantenimiento: 'badge-val-mantenimiento',
    cambio: 'badge-val-cambio',
    reubicacion: 'badge-val-reubicacion',
    retiro: 'badge-val-retiro',
    reposicion: 'badge-val-reposicion',
    reinstalacion: 'badge-val-reinstalacion',
    ninguno: 'badge-val-ninguno',
    'mantenimiento y reubicacion': 'badge-val-mantenimiento-reubicacion',

    // Acción — señal horizontal
    repintar: 'badge-val-repintar',
    borrar: 'badge-val-borrar',
    reemplazo: 'badge-val-reemplazo',
    instalacion: 'badge-val-instalacion',

    // Acción — semáforo (reubicacion, instalacion, otro, para definir ya arriba)
    otro: 'badge-val-otro'
};

export function listaValorBadgeClass(value: unknown): string {
    const s = (value ?? '').toString().trim();
    if (!s) return 'badge-tag-empty';
    const key = normalizeListaValorKey(s);
    return LISTA_VALOR_BADGE_CLASS[key] ?? 'badge-val-desconocido';
}
