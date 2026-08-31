import type { Theme } from './catalog.js';

export interface ThemeScreenModel {
  showsRuntimeState: boolean;
  showsRuntimeControls: boolean;
  showsExternalAction: boolean;
  showsRun: boolean;
  showsEmbeddedMaterial: boolean;
  showsLogs: boolean;
  defaultContentView: 'material' | 'result' | 'guide';
}

export function createThemeScreenModel(theme: Theme): ThemeScreenModel {
  const showsRun = Boolean(theme.operations.run);
  return {
    showsRuntimeState: theme.lifecycle !== 'none' && theme.lifecycle !== 'one-shot',
    showsRuntimeControls: Boolean(theme.operations.start || theme.operations.stop),
    showsExternalAction: theme.material.openMode === 'new-window',
    showsRun,
    showsEmbeddedMaterial: theme.material.openMode === 'embedded'
      && (theme.presentation === 'document' || theme.presentation === 'web'),
    showsLogs: Boolean(theme.operations.start),
    defaultContentView: showsRun
      ? 'result'
      : theme.actualConnection?.type === 'markdown'
        ? 'guide'
        : 'material'
  };
}
