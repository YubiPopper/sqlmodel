/**
 * Shared URL-import state helpers.
 *
 * Extracted into its own module to avoid circular imports between
 * useUrlImport (which uses parsers → importSchema → store) and
 * useModelStore (which calls clearSchemaUrl on model load/clear).
 */

export const SESSION_KEY = 'sqlmodel-url-imported';

/**
 * Clear the URL import state: removes the /p/ or ?url= from the address bar
 * and clears the sessionStorage guard. Call this when loading a new model
 * (template, example, AI generate, file import) to reset the URL state.
 */
export function clearSchemaUrl(): void {
  sessionStorage.removeItem(SESSION_KEY);
  const hasImportUrl =
    window.location.pathname.startsWith('/p/') ||
    new URLSearchParams(window.location.search).has('url');
  if (hasImportUrl) {
    window.history.replaceState({}, '', '/');
  }
}
