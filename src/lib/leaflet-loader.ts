/**
 * Singleton Leaflet Loader & Instance Helper
 * Prevents multiple dynamic imports and memory overhead
 */
let leafletPromise: Promise<typeof import('leaflet')> | null = null;

export async function getLeaflet() {
  if (typeof window === 'undefined') return null;
  if (!leafletPromise) {
    leafletPromise = import('leaflet').then((L) => {
      // Fix default Leaflet icon paths
      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      } catch {
        // ignore
      }
      return L;
    });
  }
  return leafletPromise;
}
