/** Dirección de ordenación en cabeceras de tabla (listas inventario). */
export type TableSortDirection = 'asc' | 'desc';

function toSortable(v: unknown): string | number {
    if (v == null || v === '') return '';
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : '';
    if (v instanceof Date) return v.getTime();
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const t = Date.parse(s);
        if (!Number.isNaN(t)) return t;
    }
    const normalized = s.replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(normalized);
    if (s !== '' && /^-?\d/.test(s) && !Number.isNaN(n)) return n;
    return s.toLowerCase();
}

/** Compara dos valores escalares para ordenar filas (texto con locale es, números y fechas ISO). */
export function compareForSort(a: unknown, b: unknown, dir: TableSortDirection): number {
    const va = toSortable(a);
    const vb = toSortable(b);
    let cmp: number;
    if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
}

/**
 * Copia y ordena filas según columna. Si `column` es null, devuelve copia en el mismo orden que `rows`.
 */
export function applyTableSort<T>(
    rows: readonly T[],
    column: string | null,
    direction: TableSortDirection,
    getSortValue: (row: T, column: string) => unknown
): T[] {
    if (!column || rows.length === 0) return [...rows];
    const copy = [...rows];
    copy.sort((x, y) =>
        compareForSort(getSortValue(x, column), getSortValue(y, column), direction)
    );
    return copy;
}
