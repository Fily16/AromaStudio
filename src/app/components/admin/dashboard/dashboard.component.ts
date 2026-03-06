import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { DashboardStats } from '../../../models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  stats = signal<DashboardStats | null>(null);
  adminName = this.auth.name;

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.api.getDashboard().subscribe(s => this.stats.set(s));
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
