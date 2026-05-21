/**
 * Singleton que permite pasar filtros pre-activados a la pantalla Explore
 * sin necesidad de parámetros en la URL.
 * 
 * Uso:
 *   // Antes de navegar a /explore:
 *   setPendingExploreFilters({ genreId: 'xxx', sort: 'popular' });
 *   router.push('/(tv)/explore');
 *
 *   // En ExploreScreen, al montar:
 *   const pending = consumePendingExploreFilters();
 *   if (pending) { setGenreId(pending.genreId ?? ''); ... }
 */

interface ExploreFilters {
    type?: string;
    genreId?: string;
    platformId?: string;
    sort?: string;
}

let pendingFilters: ExploreFilters | null = null;

export function setPendingExploreFilters(filters: ExploreFilters) {
    pendingFilters = filters;
}

/** Reads and clears the pending filters (one-shot consumption). */
export function consumePendingExploreFilters(): ExploreFilters | null {
    const f = pendingFilters;
    pendingFilters = null;
    return f;
}
