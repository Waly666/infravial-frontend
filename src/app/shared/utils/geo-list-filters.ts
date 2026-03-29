/** Fila de inventario con `idViaTramo` poblado, o documento vía-tramo como fila. */
export function geoSource(row: any): any {
    if (row?.idViaTramo && typeof row.idViaTramo === 'object') {
        return row.idViaTramo;
    }
    return row;
}

function normStr(s: unknown): string {
    if (s == null) return '';
    return String(s).trim();
}

export function rowDepartamento(row: any): string {
    return normStr(geoSource(row)?.departamento);
}

export function rowMunicipio(row: any): string {
    return normStr(geoSource(row)?.municipio);
}

function zatFieldFromSource(src: any): any {
    return src?.zat;
}

/** Clave estable para filtro/select (debe coincidir con `geoZatOptions`). */
export function zatKey(zatField: any): string {
    if (zatField == null || zatField === '') return '';
    if (typeof zatField === 'string') return zatField.trim();
    if (typeof zatField === 'object') {
        if (zatField.zatNumero != null || zatField.zatLetra != null) {
            const n =
                zatField.zatNumero != null ? String(zatField.zatNumero).trim() : '';
            const l =
                zatField.zatLetra != null ? String(zatField.zatLetra).trim() : '';
            return `${n}|${l}`;
        }
        if (zatField._id) return String(zatField._id);
    }
    return '';
}

export function rowZatValue(row: any): string {
    return zatKey(zatFieldFromSource(geoSource(row)));
}

export function rowZatLabel(row: any): string {
    const z = zatFieldFromSource(geoSource(row));
    if (z == null || z === '') return '—';
    if (typeof z === 'string') {
        const t = z.trim();
        return t || '—';
    }
    if (typeof z === 'object') {
        if (z.zatNumero != null || z.zatLetra != null) {
            const parts = [z.zatNumero, z.zatLetra].filter(
                (x) => x != null && String(x).trim() !== ''
            );
            const label = parts.map((x) => String(x).trim()).join(' ');
            return label || '—';
        }
    }
    return '—';
}

function hashToIdx(s: string): number {
    const value = s.trim().toUpperCase();
    if (!value) return 1;
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 8) + 1;
}

export function badgeClassDepartamento(
    dep: string | null | undefined
): string {
    return `badge-geo-dep-${hashToIdx(dep || '')}`;
}

export function badgeClassMunicipio(
    mun: string | null | undefined
): string {
    return `badge-municipio-${hashToIdx(mun || '')}`;
}

export function badgeClassZat(z: string | null | undefined): string {
    return `badge-geo-zat-${hashToIdx(z || '')}`;
}

/** Nombre de vía en lista de tramos (color por valor). */
export function badgeClassVia(via: string | null | undefined): string {
    return `badge-via-${hashToIdx(via || '')}`;
}

export function matchesGeoFilters(
    row: any,
    filtroDepartamento: string,
    filtroMunicipio: string,
    filtroZat: string
): boolean {
    const dep = rowDepartamento(row);
    const mun = rowMunicipio(row);
    const zKey = rowZatValue(row);

    if (filtroDepartamento?.trim() && dep !== filtroDepartamento.trim()) {
        return false;
    }
    if (filtroMunicipio?.trim() && mun !== filtroMunicipio.trim()) {
        return false;
    }
    if (filtroZat?.trim() && zKey !== filtroZat.trim()) {
        return false;
    }
    return true;
}

export function geoDepartamentos(rows: any[]): string[] {
    const set = new Set<string>();
    for (const r of rows) {
        const d = rowDepartamento(r);
        if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export function geoMunicipios(
    rows: any[],
    filtroDepartamento: string
): string[] {
    const set = new Set<string>();
    const fd = filtroDepartamento?.trim() || '';
    for (const r of rows) {
        if (fd && rowDepartamento(r) !== fd) continue;
        const m = rowMunicipio(r);
        if (m) set.add(m);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export function geoZatOptions(
    rows: any[],
    filtroDepartamento: string,
    filtroMunicipio: string
): Array<{ value: string; label: string }> {
    const fd = filtroDepartamento?.trim() || '';
    const fm = filtroMunicipio?.trim() || '';
    const map = new Map<string, string>();

    for (const r of rows) {
        if (fd && rowDepartamento(r) !== fd) continue;
        if (fm && rowMunicipio(r) !== fm) continue;
        const key = rowZatValue(r);
        if (!key) continue;
        const label = rowZatLabel(r);
        map.set(key, label === '—' ? key : label);
    }

    return Array.from(map.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) =>
            a.label.localeCompare(b.label, 'es', { numeric: true })
        );
}

/**
 * Normaliza pegados desde Compass / shell: `ObjectId("...")`, `{ "$oid": "..." }`, comillas, espacios.
 * Devuelve el hex de 24 caracteres en minúsculas o `null` si no es un ObjectId completo.
 */
export function extractMongoObjectId(raw: string | null | undefined): string | null {
    if (raw == null) return null;
    let s = String(raw).trim();
    if (!s) return null;

    const jsonOid = /"?\$oid"?\s*:\s*"?([a-fA-F0-9]{24})"?/i.exec(s);
    if (jsonOid) return jsonOid[1].toLowerCase();

    const oidFn = /^ObjectId\s*\(\s*["']?([a-fA-F0-9]{24})["']?\s*\)\s*$/i.exec(
        s.replace(/\s+/g, ' ').trim()
    );
    if (oidFn) return oidFn[1].toLowerCase();

    if (
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))
    ) {
        s = s.slice(1, -1).trim();
    }
    s = s.replace(/[\s\r\n\u00a0]+/g, '');
    if (/^[a-fA-F0-9]{24}$/.test(s)) return s.toLowerCase();
    return null;
}

/** Minúsculas, sin tildes y espacios colapsados (para comparar texto de búsqueda con datos guardados). */
export function normalizeSearchText(s: string): string {
    return (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Coincide si todas las palabras de la consulta aparecen en el texto combinado
 * (orden indistinto; útil para “Calle 5” vs “5 … Calle”).
 */
export function textBlobMatchesQuery(blob: string, qRaw: string): boolean {
    const q = normalizeSearchText(qRaw);
    if (!q) return true;
    const tokens = q.split(' ').filter((t) => t.length > 0);
    if (!tokens.length) return true;
    const h = normalizeSearchText(blob);
    return tokens.every((t) => h.includes(t));
}

/**
 * Texto de nomenclatura asociado al tramo (fila o `idViaTramo` poblado):
 * usa `completa` o, si está vacío, concatena tipo/número/conector (como en el formulario).
 */
export function nomenclaturaSearchText(row: any): string {
    const src = geoSource(row);
    const n = src?.nomenclatura;
    if (!n || typeof n !== 'object') return '';
    const c = (n.completa ?? '').toString().trim();
    if (c) return c;
    const parts = [
        n.tipoVia1,
        n.numero1,
        n.conector,
        n.tipoVia2,
        n.numero2,
        n.conector2,
        n.tipoVia3,
        n.numero3
    ];
    return parts
        .filter((x) => x != null && String(x).trim() !== '')
        .map((x) => String(x).trim())
        .join(' ');
}
