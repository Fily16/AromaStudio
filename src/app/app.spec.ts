import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';

@Component({ template: '' })
class EmptyPage {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        // El shell usa routerLink (cabecera, pie) y pide datos al backend: router + HTTP de prueba.
        provideRouter([
          { path: '', component: EmptyPage },
          { path: 'admin', component: EmptyPage },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(app.title).toContain('AromaStudio');
  });

  it('en la tienda muestra la cabecera y el pie', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.showChrome()).toBe(true);
    expect(compiled.querySelector('as-header')).not.toBeNull();
    expect(compiled.querySelector('as-footer')).not.toBeNull();
  });

  it('en el panel admin oculta la cabecera y el pie de la tienda', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/admin');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.showChrome()).toBe(false);
    expect(compiled.querySelector('as-header')).toBeNull();
    expect(compiled.querySelector('as-footer')).toBeNull();
  });
});
