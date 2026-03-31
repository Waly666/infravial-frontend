import { Pipe, PipeTransform } from '@angular/core';
import { nomenclaturaSearchText } from '../utils/geo-list-filters';

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

/** Nomenclatura como en búsqueda: `completa` o partes tipo/número/conector. */
@Pipe({ name: 'tramoNomenclatura', standalone: true })
export class TramoNomenclaturaPipe implements PipeTransform {
    transform(t: unknown): string {
        const s = nomenclaturaSearchText(t);
        return s || '—';
    }
}

/** Texto del ObjectId / id tal cual (sin truncar), para copiar y cruzar con Compass. */
@Pipe({ name: 'mongoId', standalone: true })
export class MongoIdPipe implements PipeTransform {
    transform(id: unknown): string {
        const s = id == null ? '' : String(id).trim();
        if (!s) return '—';
        return s;
    }
}
