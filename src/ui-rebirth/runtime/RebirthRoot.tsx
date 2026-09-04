import { REBIRTH_HOME_PREVIEW_STATE } from '../preview/homePreviewState.ts';
import { RebirthAppShell } from './RebirthAppShell.tsx';
import './rebirth-home-interaction.css';

export function RebirthRoot() {
  return <RebirthAppShell homeState={REBIRTH_HOME_PREVIEW_STATE} />;
}
