import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogHostComponent } from './shared/components/confirm-dialog/confirm-dialog-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
