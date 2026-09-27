import { Routes } from '@angular/router';
import { Movies } from './components/movies/movies';

export const routes: Routes = [
  { path: '', component: Movies },
  { path: '**', redirectTo: '' },
];