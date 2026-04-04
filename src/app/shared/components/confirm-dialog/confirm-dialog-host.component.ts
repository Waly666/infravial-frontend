import {
    Component,
    HostListener,
    inject,
    ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ConfirmDialogService,
    ConfirmDialogPayload,
    ConfirmDialogVariant
} from '../../services/confirm-dialog.service';

@Component({
    selector: 'app-confirm-dialog-host',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirm-dialog-host.component.html',
    styleUrl: './confirm-dialog-host.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogHostComponent {
    private readonly svc = inject(ConfirmDialogService);
    private readonly cdr = inject(ChangeDetectorRef);

    payload: ConfirmDialogPayload | null = null;

    constructor() {
        this.svc.open$.subscribe((p) => {
            this.payload = p;
            this.cdr.markForCheck();
        });
    }

    @HostListener('document:keydown.escape', ['$event'])
    onEsc(ev: Event): void {
        if (!this.payload) return;
        ev.preventDefault();
        this.svc.dismiss();
    }

    confirm(): void {
        this.svc.resolve(true);
    }

    cancel(): void {
        this.svc.resolve(false);
    }

    onBackdropClick(ev: MouseEvent): void {
        if ((ev.target as HTMLElement).classList.contains('confirm-backdrop')) {
            this.svc.dismiss();
        }
    }

    variantClass(v: ConfirmDialogVariant): string {
        return `confirm-panel--${v}`;
    }
}
