import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  async login() {
    this.loading.set(true);
    this.error.set('');
    const ok = await this.auth.login(this.email(), this.password());
    this.loading.set(false);
    if (ok) {
      this.router.navigate(['/admin']);
    } else {
      this.error.set('Credenciales incorrectas');
    }
  }
}
