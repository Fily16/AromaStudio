import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService: pantallas admin con token', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.setItem('admin_token', 'tok-123');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('admin_token');
    TestBed.resetTestingModule();
  });

  it('el stock de tienda del panel va CON token (el público oculta los perfumes sin NSO)', () => {
    let got: Record<number, number> | null = null;
    api.getAdminRetailStock().subscribe((s) => (got = s));
    const req = http.expectOne((r) => r.url.endsWith('/retail/stock'));
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    req.flush({ 5: 2 });
    expect(got).toEqual({ 5: 2 });
  });

  it('el stock de la tienda pública sigue sin token', () => {
    api.getRetailStock().subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/retail/stock'));
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('ajustes NSO: PUT /admin/nso/settings con {acceptCanCodes}', () => {
    api.setNsoSettings({ acceptCanCodes: false }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/admin/nso/settings'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ acceptCanCodes: false });
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    req.flush({});
  });
});
