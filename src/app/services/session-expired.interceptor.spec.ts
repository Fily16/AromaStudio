import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { SESSION_EXPIRED_PARAM, sessionExpiredInterceptor } from './session-expired.interceptor';

describe('sessionExpiredInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let router: Router;
  let logout: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  const withToken = { headers: new HttpHeaders({ Authorization: 'Bearer viejo' }) };

  beforeEach(() => {
    logout = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { logout } },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => ctrl.verify());

  function call(url: string, opts?: { headers: HttpHeaders }) {
    const errors: number[] = [];
    http.get(url, opts).subscribe({ error: (e) => errors.push(e.status) });
    return errors;
  }

  it('401 en una petición con token: cierra sesión y manda al login con aviso', () => {
    const errors = call('/api/admin/products', withToken);
    ctrl.expectOne('/api/admin/products').flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    const [commands, extras] = navigate.mock.calls[0] as [unknown[], { queryParams: Record<string, unknown> }];
    expect(commands).toEqual(['/admin/login']);
    expect(extras.queryParams[SESSION_EXPIRED_PARAM]).toBe(1);
    // el error sigue llegando a la pantalla (para apagar su "Cargando…")
    expect(errors).toEqual([401]);
  });

  it('403 en una petición con token (token vencido en Spring) también cierra sesión', () => {
    call('/api/orders', withToken);
    ctrl.expectOne('/api/orders').flush(null, { status: 403, statusText: 'Forbidden' });
    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('no toca las peticiones públicas (sin header Authorization)', () => {
    const errors = call('/api/retail/form-sale');
    ctrl.expectOne('/api/retail/form-sale').flush(null, { status: 403, statusText: 'Forbidden' });
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(errors).toEqual([403]);
  });

  it('no toca el login aunque responda 401', () => {
    http
      .post('/api/auth/login', { email: 'a', password: 'b' }, withToken)
      .subscribe({ error: () => {} });
    ctrl.expectOne('/api/auth/login').flush('Credenciales incorrectas', { status: 401, statusText: 'Unauthorized' });
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('otros errores con token (400, 404, 500) no cierran la sesión', () => {
    for (const status of [400, 404, 500]) {
      call('/api/admin/nso/summary', withToken);
      ctrl.expectOne('/api/admin/nso/summary').flush({ message: 'x' }, { status, statusText: 'Error' });
    }
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('las respuestas buenas pasan sin cambios', () => {
    let body: unknown = null;
    http.get('/api/admin/nso/summary', withToken).subscribe((b) => (body = b));
    ctrl.expectOne('/api/admin/nso/summary').flush({ ok: true });
    expect(body).toEqual({ ok: true });
    expect(logout).not.toHaveBeenCalled();
  });
});
