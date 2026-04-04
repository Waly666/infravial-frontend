import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';

export type ConfirmDialogVariant = 'success' | 'warning' | 'danger' | 'info';

export type ConfirmDialogIcon =
    | 'check_circle'
    | 'delete'
    | 'warning'
    | 'info'
    | 'flag'
    | 'logout'
    | 'upload';

export interface ConfirmDialogOptions {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmDialogVariant;
    icon?: ConfirmDialogIcon;
    /** Por defecto true; false = solo botón principal (ej. “Entendido”) */
    showCancel?: boolean;
}

export interface ConfirmDialogResolvedOptions {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: ConfirmDialogVariant;
    icon: ConfirmDialogIcon;
    showCancel: boolean;
}

export interface ConfirmDialogPayload {
    opts: ConfirmDialogResolvedOptions;
    done: (v: boolean) => void;
}

const defaults: Omit<ConfirmDialogResolvedOptions, 'title' | 'message'> = {
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'success',
    icon: 'check_circle',
    showCancel: true
};

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
    private readonly _open = new BehaviorSubject<ConfirmDialogPayload | null>(
        null
    );
    readonly open$ = this._open.asObservable();

    confirm(options: ConfirmDialogOptions): Observable<boolean> {
        const opts: ConfirmDialogResolvedOptions = {
            title: options.title,
            message: options.message?.trim() ?? '',
            confirmText: options.confirmText ?? defaults.confirmText,
            cancelText: options.cancelText ?? defaults.cancelText,
            variant: options.variant ?? defaults.variant,
            icon: options.icon ?? defaults.icon,
            showCancel: options.showCancel !== false
        };

        return new Observable<boolean>((subscriber) => {
            this._open.next({
                opts,
                done: (v: boolean) => {
                    this._close();
                    subscriber.next(v);
                    subscriber.complete();
                }
            });
        });
    }

    resolve(value: boolean): void {
        const cur = this._open.value;
        if (cur) cur.done(value);
    }

    dismiss(): void {
        this.resolve(false);
    }

    private _close(): void {
        this._open.next(null);
    }

    runIfConfirmed(
        options: ConfirmDialogOptions,
        action: () => void
    ): void {
        this.confirm(options)
            .pipe(
                filter((v) => v === true),
                take(1)
            )
            .subscribe(() => action());
    }
}
