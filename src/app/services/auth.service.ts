import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token = signal<string | null>(localStorage.getItem('admin_token'));
  private adminName = signal<string>(localStorage.getItem('admin_name') ?? '');

  readonly isLoggedIn = computed(() => !!this.token());
  readonly name = this.adminName.asReadonly();

  constructor(private api: ApiService) {}

  login(email: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.api.login(email, password).subscribe({
        next: (res) => {
          localStorage.setItem('admin_token', res.token);
          localStorage.setItem('admin_name', res.name);
          this.token.set(res.token);
          this.adminName.set(res.name);
          resolve(true);
        },
        error: () => resolve(false)
      });
    });
  }

  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    this.token.set(null);
    this.adminName.set('');
  }
}
