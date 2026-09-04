import { ComponentGallery } from './ComponentGallery.tsx';
import { CompositionAtlas } from './CompositionAtlas.tsx';
import { CoreApp } from './CoreApp.tsx';
import { InteractionLab } from './InteractionLab.tsx';
import { ProductionUiV2Runtime } from './ProductionUiV2Runtime.tsx';

function hasLiveSupabaseConfig(): boolean {
  return typeof import.meta.env.VITE_SUPABASE_URL === 'string'
    && import.meta.env.VITE_SUPABASE_URL.trim().length > 0
    && typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY === 'string'
    && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.trim().length > 0;
}

export function UiV2Root() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('ui3-gallery') === '1') return <ComponentGallery />;
  if (params.get('ui5-atlas') === '1') return <CompositionAtlas />;
  if (params.get('ui8-lab') === '1') return <InteractionLab />;

  const previewMode = import.meta.env.VITE_ENJAZ_PREVIEW_MODE === 'true' || !hasLiveSupabaseConfig();
  if (previewMode) return <CoreApp dailyWorkMode="preview" />;
  return <ProductionUiV2Runtime />;
}
