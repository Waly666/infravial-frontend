import { Pipe, PipeTransform } from '@angular/core';

function asRecord(t: unknown): Record<string, unknown> | null {
    if (t && typeof t === 'object') return t as Record<string, unknown>;
    return null;
}

/** Departamento · Municipio (línea superior en listas de tramo). */
@Pipe({ name: 'tramoGeo', standalone: true })
export class TramoGeoPipe implements PipeTransform {
    transform(t: unknown): string {
        const o = asRecord(t);
        if (!o) return '';
        const d = String(o['departamento'] ?? '').trim();
        const m = String(o['municipio'] ?? '').trim();
        if (d && m) return `${d} · ${m}`;
        return d || m || '';
    }
}

/** Vía y nomenclatura completa (una línea; evita duplicar si son iguales). */
@Pipe({ name: 'tramoViaNom', standalone: true })
export class TramoViaNomPipe implements PipeTransform {
    transform(t: unknown): string {
        const o = asRecord(t);
        if (!o) return '—';
        const nomObj = o['nomenclatura'] as Record<string, unknown> | undefined;
        const n = String(nomObj?.['completa'] ?? '').trim();
        const v = String(o['via'] ?? '').trim();
        if (n && v && n !== v) return `${v} · ${n}`;
        return n || v || '—';
    }
}
