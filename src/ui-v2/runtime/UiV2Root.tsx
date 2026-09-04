import { ComponentGallery } from './ComponentGallery.tsx';
import { ShellPreview } from './ShellPreview.tsx';

export function UiV2Root() {
  const regressionGallery = new URLSearchParams(window.location.search).get('ui3-gallery') === '1';
  return regressionGallery ? <ComponentGallery /> : <ShellPreview />;
}
