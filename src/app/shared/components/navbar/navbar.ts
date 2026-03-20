import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './navbar.html',
    styleUrl: './navbar.scss'
})
export class NavbarComponent implements OnInit {

    modoClaro = false;

    ngOnInit() {
        this.modoClaro = localStorage.getItem('modoClaro') === 'true';
        document.body.classList.toggle('light-mode', this.modoClaro);
    }

    toggleModo() {
        this.modoClaro = !this.modoClaro;
        document.body.classList.toggle('light-mode', this.modoClaro);
        localStorage.setItem('modoClaro', this.modoClaro.toString());
    }
}

