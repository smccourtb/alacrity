import Pokedex from 'pokedex-promise-v2';

// Shared PokeAPI client with built-in caching (11-day TTL by default)
const pokeApi = new Pokedex({
  timeout: 30 * 1000,
  cacheLimit: 5 * 24 * 60 * 60 * 1000, // 5 days
});

export default pokeApi;
