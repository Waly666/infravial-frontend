import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-reporte-lista',
    imports: [CommonModule, RouterModule],
    templateUrl: './reporte-lista.html',
    styleUrl: './reporte-lista.scss',
    encapsulation: ViewEncapsulation.None
})
export class ReporteListaComponent {}
