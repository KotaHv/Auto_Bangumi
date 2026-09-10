import '@tanstack/react-query';

interface QueryMeta extends Record<string, unknown> {
  requiresAuth?: boolean;
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: QueryMeta;
    mutationMeta: QueryMeta;
  }
}
