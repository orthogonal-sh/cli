export function formatEndpointReference(
  parentSlug: string,
  endpoint: { path: string; apiSlug?: string },
): string {
  if (endpoint.apiSlug && endpoint.apiSlug !== parentSlug) {
    return `${endpoint.apiSlug} ${endpoint.path}`;
  }
  return endpoint.path;
}
