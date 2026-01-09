import {Component, inject, signal, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {Store} from '@ngxs/store';
import {Pollution} from '../../models/pollution.model';
import {PollutionFilterDto} from '../../models/pollution.dto';
import {POLLUTION_TYPES} from '../../models/pollution.constants';
import {PollutionService} from '../../services/pollution';
import {FormsModule} from '@angular/forms';
import {FavoritesState} from '../../../shared/states/favorites.state';
import {AuthState} from '../../../shared/states/auth.state';
import {AddFavorite, RemoveFavorite} from '../../../shared/actions/favorites.actions';

@Component({
  selector: 'app-pollution-list',
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './pollution-list.html',
  styleUrl: './pollution-list.scss'
})
export class PollutionList implements OnInit {
  private pollutionService = inject(PollutionService);
  private router = inject(Router);
  private store = inject(Store);

  pollutions = signal<Pollution[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  filterType = signal<string>('');
  filterTitle = signal<string>('');

  readonly pollutionTypes = POLLUTION_TYPES;

  // Sélecteurs NGXS
  isFavorite = this.store.selectSignal(FavoritesState.isFavorite);
  isAuthenticated = this.store.selectSignal(AuthState.isAuthenticated);

  constructor() {
    this.loadPollutions();
  }

  ngOnInit() {
  }

  loadPollutions() {
    this.loading.set(true);
    this.pollutionService.getAllPollutions().subscribe({
      next: (data) => {
        this.pollutions.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Erreur lors du chargement des pollutions');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  applyFilters() {
    this.loading.set(true);
    const filterDto: PollutionFilterDto = {
      type: this.filterType() || undefined,
      title: this.filterTitle() || undefined
    };

    this.pollutionService.filterPollutions(filterDto).subscribe({
      next: (data) => {
        this.pollutions.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Erreur lors du filtrage des pollutions');
        this.loading.set(false);
        console.error(err);
      }
    });
  }

  onViewDetail(pollution: Pollution) {
    this.router.navigate(['/pollutions/detail', pollution.id]);
  }

  onEdit(pollution: Pollution, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/pollutions/edit', pollution.id]);
  }

  onDelete(id: number, event: Event) {
    event.stopPropagation();

    if (confirm('Êtes-vous sûr de vouloir supprimer cette pollution ?')) {
      this.pollutionService.deletePollution(id).subscribe({
        next: () => {
          this.pollutions.update(list => list.filter(p => p.id !== id));
        },
        error: (err) => {
          alert('Erreur lors de la suppression');
          console.error(err);
        }
      });
    }
  }

  onCreateNew() {
    this.router.navigate(['/pollutions/new']);
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'Plastique': '♻️',
      'Chimique': '⚗️',
      'Dépôt sauvage': '🗑️',
      'Eau': '💧',
      'Air': '🌫️',
      'Autre': '⚠️'
    };
    return icons[type] || '⚠️';
  }

  getTypeLabel(type: string): string {
    return type;
  }

  toggleFavorite(pollution: Pollution, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    // Si l'utilisateur n'est pas connecté, rediriger vers le login
    if (!this.isAuthenticated()) {
      alert('Vous devez être connecté pour ajouter des favoris. Vous allez être redirigé vers la page de connexion.');
      this.router.navigate(['/users/login']);
      return;
    }

    if (this.isFavorite()(pollution.id)) {
      this.store.dispatch(new RemoveFavorite(pollution.id));
    } else {
      this.store.dispatch(new AddFavorite(pollution));
    }
  }
}
