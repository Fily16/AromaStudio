import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Supplier, ImportSummary } from '../../../models/api.models';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './import.component.html',
  styleUrl: './import.component.css'
})
export class ImportComponent implements OnInit {
  private api = inject(ApiService);

  suppliers = signal<Supplier[]>([]);
  selectedSupplierId = signal<number | null>(null);
  dragging = signal(false);
  loading = signal(false);
  summary = signal<ImportSummary | null>(null);
  message = signal('');
  error = signal('');
  archiving = signal(false);
  archiveMessage = signal('');

  ngOnInit() {
    this.api.getSuppliers().subscribe({
      next: (s) => {
        this.suppliers.set(s);
        if (s.length && this.selectedSupplierId() == null) this.selectedSupplierId.set(s[0].id);
      },
      error: () => this.error.set('No se pudieron cargar los proveedores. Vuelve a iniciar sesión.')
    });
  }

  onSupplierChange(e: Event) {
    this.selectedSupplierId.set(+(e.target as HTMLSelectElement).value);
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragging.set(true); }
  onDragLeave(e: DragEvent) { e.preventDefault(); this.dragging.set(false); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) this.upload(f);
  }
  onFileSelected(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.upload(f);
  }

  upload(file: File) {
    const sid = this.selectedSupplierId();
    this.message.set(''); this.error.set(''); this.summary.set(null);
    if (sid == null) { this.error.set('Selecciona un proveedor primero.'); return; }
    if (!/\.xlsx?$/i.test(file.name)) { this.error.set('El archivo debe ser .xlsx'); return; }
    this.loading.set(true);
    this.api.importSupplierExcel(sid, file).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
        this.message.set('Importación completada: ' + file.name);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al importar el Excel.');
      }
    });
  }

  archive() {
    if (!confirm('Esto archivará el catálogo viejo (productos sin ofertas de proveedor). NO se borra nada. ¿Continuar?')) return;
    this.archiving.set(true);
    this.archiveMessage.set('');
    this.api.archiveLegacyCatalog().subscribe({
      next: (r) => { this.archiving.set(false); this.archiveMessage.set('✓ ' + r.message); },
      error: (err) => { this.archiving.set(false); this.archiveMessage.set('✗ ' + (err.error?.message || 'No se pudo archivar')); }
    });
  }
}
