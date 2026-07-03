import { Injectable, inject, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from './api.service';
import { SuggestResult } from '../models/api.models';

/**
 * Estado del buscador global (header). Llama al endpoint /products/suggest
 * con debounce para el dropdown estilo FragranceNet.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private api = inject(ApiService);
  private query$ = new Subject<string>();

  readonly results = signal<SuggestResult[]>([]);
  readonly loading = signal(false);
  readonly open = signal(false);
  readonly term = signal('');

  constructor() {
    this.query$
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((q) => {
          const t = q.trim();
          if (t.length < 2) {
            this.loading.set(false);
            return of([] as SuggestResult[]);
          }
          this.loading.set(true);
          return this.api.suggest(t, 8).pipe(catchError(() => of([] as SuggestResult[])));
        }),
        takeUntilDestroyed()
      )
      .subscribe((res) => {
        this.results.set(res);
        this.loading.set(false);
      });
  }

  input(value: string) {
    this.term.set(value);
    this.open.set(true);
    if (value.trim().length < 2) {
      this.results.set([]);
      this.loading.set(false);
    }
    this.query$.next(value);
  }

  close() {
    this.open.set(false);
  }

  clear() {
    this.term.set('');
    this.results.set([]);
    this.open.set(false);
  }
}
