import { ComponentGallery } from './ComponentGallery.tsx';
import { CompositionAtlas } from './CompositionAtlas.tsx';
import { CoreApp } from './CoreApp.tsx';
import { InteractionLab } from './InteractionLab.tsx';

export function UiV2Root() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('ui3-gallery') === '1') return <ComponentGallery />;
  if (params.get('ui5-atlas') === '1') return <CompositionAtlas />;
  if (params.get('ui8-lab') === '1') return <InteractionLab />;
  return <CoreApp />;
}
