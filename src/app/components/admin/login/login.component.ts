import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { SESSION_EXPIRED_PARAM } from '../../../services/session-expired.interceptor';

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
  private route = inject(ActivatedRoute);

  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);
  /** Llegó aquí porque el token venció (lo manda el interceptor de sesión). */
  expired = signal(this.route.snapshot.queryParamMap.has(SESSION_EXPIRED_PARAM));

  async login() {
    this.loading.set(true);
    this.error.set('');
    const ok = await this.auth.login(this.email(), this.password());
    this.loading.set(false);
    if (ok) {
      this.expired.set(false);
      // Vuelve a la pantalla donde estaba cuando venció la sesión (solo rutas del panel).
      const back = this.route.snapshot.queryParamMap.get('returnUrl');
      if (back && back.startsWith('/admin') && !back.startsWith('/admin/login')) {
        this.router.navigateByUrl(back);
      } else {
        this.router.navigate(['/admin']);
      }
    } else {
      this.error.set('Credenciales incorrectas');
    }
  }
}
