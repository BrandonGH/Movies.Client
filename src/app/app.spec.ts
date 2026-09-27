import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { MovieService } from '../api/services';
import { App } from './app';
import { routes } from './app.routes';
import { Movies } from './components/movies/movies';

describe('App', () => {
  let getMovies: jasmine.Spy;

  beforeEach(async () => {
    getMovies = jasmine.createSpy('getMovies').and.returnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 10 }));
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: MovieService,
          useValue: { getMovies },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the movie catalog at the root route', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', Movies);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Movies');
  });

  it('should show Problem Details when the movie request fails', async () => {
    getMovies.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 503,
      error: {
        title: 'Catalog unavailable',
        detail: 'The catalog is temporarily offline.',
        errors: { title: ['Title is required.'] },
      },
    })));

    const fixture = TestBed.createComponent(Movies);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Catalog unavailable');
    expect(alert?.textContent).toContain('The catalog is temporarily offline.');
    expect(alert?.textContent).toContain('title: Title is required.');
    expect(alert?.textContent).toContain('503');
  });
});
