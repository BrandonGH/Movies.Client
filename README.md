# Movies.Client

Angular frontend for the Movies API. The movie catalog uses the generated OpenAPI client for title search, genre and language filters, sorting, and server-side pagination. The API base URL is `http://localhost:8080`.

## Run with API

The API's Docker Compose looks to run the movies.client:dev image as a service, so you can just run the docker compose in the API project for complete setup.

## Run the frontend directly

```bash
npm install
ng serve
```

The app is available at `http://localhost:4200/`.
Configure the API to allow CORS requests from `http://localhost:4200`.

## Build and run with Docker

```bash
docker build -t movies.client:dev .
docker run --rm -p 4200:4200 --name MoviesClient movies.client:dev
```

The app is available at `http://localhost:4200/`.
Configure the API to allow CORS requests from `http://localhost:4200`.
