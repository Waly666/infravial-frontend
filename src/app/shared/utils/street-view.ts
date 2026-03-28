/**
 * Abre Google Maps en modo calle (Street View) en las coordenadas dadas.
 * No requiere API key (enlace web estándar).
 */
export function googleStreetViewUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0`;
}

/** GeoJSON Point: coordinates [lng, lat] */
export function latLngFromPoint(coords: number[] | undefined | null): {
    lat: number;
    lng: number;
} | null {
    if (!coords || coords.length < 2) return null;
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

/** GeoJSON LineString: punto medio de la polilínea (índice central). */
export function latLngFromLineMidpoint(
    coords: number[][] | undefined | null
): { lat: number; lng: number } | null {
    if (!coords?.length) return null;
    const i = Math.floor(coords.length / 2);
    return latLngFromPoint(coords[i]);
}

export function latLngFromUbicacion(ubicacion: {
    type?: string;
    coordinates?: unknown;
} | null | undefined): { lat: number; lng: number } | null {
    const c = ubicacion?.coordinates;
    if (!c || !Array.isArray(c) || c.length === 0) return null;
    if (Array.isArray((c as number[][])[0])) {
        return latLngFromLineMidpoint(c as number[][]);
    }
    return latLngFromPoint(c as number[]);
}

export function hasStreetViewCoords(ubicacion: unknown): boolean {
    return latLngFromUbicacion(ubicacion as { coordinates?: unknown }) != null;
}

export function openGoogleStreetView(ubicacion: {
    type?: string;
    coordinates?: unknown;
} | null | undefined): boolean {
    const ll = latLngFromUbicacion(ubicacion);
    if (!ll) return false;
    window.open(
        googleStreetViewUrl(ll.lat, ll.lng),
        '_blank',
        'noopener,noreferrer'
    );
    return true;
}
