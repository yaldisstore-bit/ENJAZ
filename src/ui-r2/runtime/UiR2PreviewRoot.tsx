import { UiR2Root as FrozenUiR2Root } from './UiR2Root.tsx';

/**
 * R2 preview boundary.
 *
 * This module intentionally stays presentation-only. Production-connected
 * dependencies must never be imported from here; R2.0-10 guards verify the
 * isolated preview budget independently from the production bridge.
 */
export const UiR2PreviewRoot = FrozenUiR2Root;
