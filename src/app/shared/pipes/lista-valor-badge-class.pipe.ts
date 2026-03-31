import { Pipe, PipeTransform } from '@angular/core';
import { listaValorBadgeClass } from '../utils/lista-valor-badge-class';

@Pipe({
    name: 'listaValorBadgeClass',
    standalone: true,
    pure: true
})
export class ListaValorBadgeClassPipe implements PipeTransform {
    transform(value: unknown): string {
        return listaValorBadgeClass(value);
    }
}
