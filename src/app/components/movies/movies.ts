import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MovieDto } from '../../../api/models';
import { MovieService } from '../../../api/services';

interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string | string[]>;
}

@Component({
  selector: 'app-movies',
  imports: [DecimalPipe, MatPaginatorModule, MatProgressSpinnerModule, MatSelectModule, MatSortModule, MatTableModule],
  templateUrl: './movies.html',
})
export class Movies {
  private readonly movieService = inject(MovieService);
  private readonly searchInput = signal('');
  private readonly debouncedSearch = toSignal(
    toObservable(this.searchInput).pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );
  private readonly genre = signal<string[]>([]);
  private readonly language = signal('');
  private readonly pageIndexState = signal(0);
  private readonly pageSizeState = signal(10);
  private readonly sortColumnState = signal('releaseDate');
  private readonly sortDirectionState = signal<'asc' | 'desc'>('desc');

  private readonly request = computed(() => ({
    pageNumber: this.pageIndexState() + 1,
    pageSize: this.pageSizeState(),
    titleSearchTerm: this.debouncedSearch().trim() || undefined,
    genres: this.genre().length ? this.genre() : undefined,
    language: this.language() || undefined,
    sortColumn: this.sortColumnState(),
    sortDirection: this.sortDirectionState(),
  }));

  private readonly movieResource = rxResource({
    params: () => this.request(),
    defaultValue: { items: [] as MovieDto[], totalCount: 0, pageNumber: 1, pageSize: 10 },
    stream: ({ params }) => this.movieService.getMovies(
      params.pageNumber,
      params.pageSize,
      params.titleSearchTerm,
      params.genres,
      params.language,
      params.sortColumn,
      params.sortDirection,
    ),
  });
  private readonly availableGenres = signal<string[]>([]);

  constructor() {
    effect(() => {
      const genres = this.movies.flatMap((movie) => movie.genre);
      untracked(() => {
        this.availableGenres.update((available) =>
          [...new Set([...available, ...genres])].sort((first, second) => first.localeCompare(second)),
        );
      });
    });
  }

  protected readonly columns = ['posterUrl', 'title', 'releaseDate', 'overview', 'originalLanguage', 'genre', 'popularity', 'voteCount', 'voteAverage'] as const;
  protected readonly sortableColumns = ['title', 'releaseDate', 'originalLanguage', 'popularity', 'voteCount', 'voteAverage'];
  protected readonly columnWidths: Record<(typeof this.columns)[number], number> = {
    posterUrl: 80, title: 184, releaseDate: 132, overview: 310,
    originalLanguage: 118, genre: 205, popularity: 120, voteCount: 108, voteAverage: 120,
  };
  protected readonly labels: Record<(typeof this.columns)[number], string> = {
    posterUrl: 'Poster', title: 'Title', releaseDate: 'Release date', overview: 'Overview',
    popularity: 'Popularity', voteCount: 'Votes', voteAverage: 'Rating',
    originalLanguage: 'Language', genre: 'Genres',
  };
  protected readonly pageSizeOptions = [10, 20, 50];
  
  protected get movies(): MovieDto[] {
    return this.movieResource.hasValue() ? this.movieResource.value().items : [];
  }

  protected get totalCount(): number {
    return this.movieResource.hasValue() ? Number(this.movieResource.value().totalCount) : 0;
  }

  protected get pageIndex(): number {
    return this.pageIndexState();
  }

  protected get pageSize(): number {
    return this.pageSizeState();
  }

  protected get sortColumn(): string {
    return this.sortColumnState();
  }

  protected get sortDirection(): 'asc' | 'desc' {
    return this.sortDirectionState();
  }

  protected get genreFilter(): string[] {
    return this.genre();
  }

  protected get genreOptions(): string[] {
    return this.availableGenres();
  }

  protected get languageFilter(): string {
    return this.language();
  }

  protected get loading(): boolean {
    return this.movieResource.isLoading();
  }

  protected get hasError(): boolean {
    return this.movieResource.status() === 'error';
  }

  protected get problemTitle(): string {
    return this.problemDetails?.title || 'Unable to load movies.';
  }

  protected get problemDetail(): string | undefined {
    return this.problemDetails?.detail;
  }

  protected get problemStatus(): number | undefined {
    return this.problemDetails?.status ?? this.httpError?.status;
  }

  protected get validationErrors(): string[] {
    const errors = this.problemDetails?.errors;
    if (!errors) return [];

    return Object.entries(errors).flatMap(([field, messages]) =>
      Array.isArray(messages) ? messages.map((message) => `${field}: ${message}`) : [`${field}: ${messages}`],
    );
  }

  private get problemDetails(): ProblemDetails | null {
    const body = this.httpError?.error;
    return body && typeof body === 'object' && !Array.isArray(body) ? body as ProblemDetails : null;
  }

  private get httpError(): HttpErrorResponse | null {
    const failure = this.movieResource.error();
    if (failure instanceof HttpErrorResponse) return failure;

    const cause = failure instanceof Error ? failure.cause : null;
    return cause instanceof HttpErrorResponse ? cause : null;
  }

  protected onSearchInput(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  protected onGenreChange(genres: string[]): void {
    this.genre.set(genres);
    this.resetAndLoad();
  }

  protected onLanguageChange(event: Event): void {
    this.language.set((event.target as HTMLInputElement).value.trim().toLowerCase());
    this.resetAndLoad();
  }

  protected onSortChange(sort: Sort): void {
    this.sortColumnState.set(sort.active || 'releaseDate');
    this.sortDirectionState.set(sort.direction || 'desc');
    this.pageIndexState.set(0);
  }

  protected onPageChange(page: PageEvent): void {
    this.pageIndexState.set(page.pageIndex);
    this.pageSizeState.set(page.pageSize);
  }

  protected retry(): void {
    this.movieResource.reload();
  }

  private resetAndLoad(): void {
    this.pageIndexState.set(0);
  }

  protected formatReleaseDate(dateOnly: Date | string): string {
    const date = dateOnly instanceof Date ? dateOnly : new Date(`${dateOnly.slice(0, 10)}T00:00:00Z`);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(date);
  }
}