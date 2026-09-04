import { ComponentGallery } from './ComponentGallery.tsx';
import { CompositionAtlas } from './CompositionAtlas.tsx';

export function UiV2Root() {
  const regressionGallery = new URLSearchParams(window.location.search).get('ui3-gallery') === '1';
  return regressionGallery ? <ComponentGallery /> : <CompositionAtlas />;
}
