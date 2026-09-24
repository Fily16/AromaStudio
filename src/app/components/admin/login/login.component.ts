import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { SESSION_EXPIRED_PARAM } from '../../../services/session-expired.interceptor';

/** Solo se acepta devolver el token a la propia PC (la app local de Claude), nunca a otro sitio. */
export function isLocalCallback(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);
  /** Llegó aquí porque el token venció (lo manda el interceptor de sesión). */
  expired = signal(this.route.snapshot.queryParamMap.has(SESSION_EXPIRED_PARAM));

  /** Conexión de la app local de Claude: viene con ?agent=<http://127.0.0.1:puerto/...>&state=... */
  private agentCallback = this.route.snapshot.queryParamMap.get('agent');
  private agentState = this.route.snapshot.queryParamMap.get('state') || '';
  conectandoClaude = signal(isLocalCallback(this.agentCallback));
  claudeListo = signal(false);

  async login() {
    this.loading.set(true);
    this.error.set('');
    const ok = await this.auth.login(this.email(), this.password());
    if (!ok) {
      this.loading.set(false);
      this.error.set('Credenciales incorrectas');
      return;
    }
    this.expired.set(false);

    if (this.conectandoClaude()) {
      this.api.createAgentToken().subscribe({
        next: (t) => {
          this.loading.set(false);
          this.claudeListo.set(true);
          const url = new URL(this.agentCallback!);
          url.searchParams.set('token', t.token);
          url.searchParams.set('state', this.agentState);
          url.searchParams.set('email', t.email);
          url.searchParams.set('expiresAt', t.expiresAt);
          // Devuelve el token a la app local; esa página muestra "ya puedes cerrar esta pestaña".
          window.location.href = url.toString();
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Entraste bien, pero no se pudo conectar Claude. Intenta de nuevo.');
        }
      });
      return;
    }

    this.loading.set(false);
    // Vuelve a la pantalla donde estaba cuando venció la sesión (solo rutas del panel).
    const back = this.route.snapshot.queryParamMap.get('returnUrl');
    if (back && back.startsWith('/admin') && !back.startsWith('/admin/login')) {
      this.router.navigateByUrl(back);
    } else {
      this.router.navigate(['/admin']);
    }
  }
}
