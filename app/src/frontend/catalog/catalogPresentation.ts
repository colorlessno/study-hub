import type {
  IntegrationMode,
  LifecycleMode,
  PresentationMode,
  ThemeSummary
} from '../../shared/catalog';

export interface ThemeShelfGroup {
  id: string;
  name: string;
  summary: string;
  order: number;
  themes: ThemeSummary[];
  showsHeading: boolean;
}

export const presentationLabels: Record<PresentationMode, string> = {
  document: '文書',
  web: 'Web画面',
  request: 'APIリクエスト',
  command: 'コマンド',
  'external-app': '外部アプリ'
};

export const lifecycleLabels: Record<LifecycleMode, string> = {
  none: '起動不要',
  'one-shot': '1回実行',
  process: '単一処理',
  stack: '順次処理',
  shared: '共有処理',
  manual: '手動確認'
};

export const integrationModeLabels: Record<IntegrationMode, string> = {
  document: '文書表示（操作なし）',
  embedded: '画面内操作',
  request: 'API操作',
  command: 'コマンド実行',
  external: '外部起動'
};

export function themePreparationLabel(theme: ThemeSummary): string {
  const environment = theme.environment ?? [];
  if (theme.presentation === 'document') return '文書';
  if (theme.lifecycle === 'none') return '起動不要';
  if (environment.includes('Docker Desktop')) return 'Docker';
  if (environment.includes('Node.js')) return 'Node.js';
  if (environment.includes('Python')) return 'Python';
  if (environment.length > 0) return environment.join('・');
  return '準備なし';
}

export function themeInteractionLabel(theme: ThemeSummary): string {
  switch (theme.listProfile?.interactionMode) {
    case 'read-only': return '閲覧';
    case 'screen-operation': return '画面操作';
    case 'single-action': return '単一操作';
    case 'multiple-actions': return '複数操作';
    case 'stateful-sequence': return '状態を引き継ぐ複数操作';
  }
  if (theme.presentation === 'document') return '閲覧';
  if (theme.presentation === 'web') return '画面操作';
  if (theme.presentation === 'request') return theme.operationCount > 1 ? '複数要求' : '単一要求';
  if (theme.presentation === 'command') return theme.operationCount > 1 ? '複数コマンド' : '単一コマンド';
  if (theme.presentation === 'external-app') return '外部アプリ操作';
  return '操作なし';
}

export function groupThemesForShelves(
  themes: ThemeSummary[],
  booksPerShelf = 6
): ThemeShelfGroup[] {
  const groups = new Map<string, ThemeShelfGroup>();
  const ungrouped: ThemeSummary[] = [];

  for (const theme of themes) {
    if (!theme.group) {
      ungrouped.push(theme);
      continue;
    }
    const existing = groups.get(theme.group.id);
    if (existing) {
      existing.themes.push(theme);
    } else {
      groups.set(theme.group.id, { ...theme.group, themes: [theme], showsHeading: true });
    }
  }

  const result = [...groups.values()].sort((left, right) => left.order - right.order);
  for (let index = 0; index < ungrouped.length; index += booksPerShelf) {
    const themesInShelf = ungrouped.slice(index, index + booksPerShelf);
    result.push({
      id: `other-${index / booksPerShelf + 1}`,
      name: groups.size > 0 ? 'その他のテーマ' : `${index / booksPerShelf + 1}段目`,
      summary: '',
      order: Number.MAX_SAFE_INTEGER,
      themes: themesInShelf,
      showsHeading: false
    });
  }
  return result;
}

export function matchesThemeFilter(theme: ThemeSummary, filter: string): boolean {
  const query = filter.trim().toLocaleLowerCase('ja');
  if (!query) return true;
  const searchableText = [
    theme.id,
    theme.name,
    theme.summary,
    theme.presentation,
    presentationLabels[theme.presentation],
    theme.lifecycle,
    lifecycleLabels[theme.lifecycle],
    theme.integrationMode,
    integrationModeLabels[theme.integrationMode],
    themePreparationLabel(theme),
    themeInteractionLabel(theme),
    theme.listProfile?.initialization,
    theme.listProfile?.environmentScope,
    theme.listProfile?.cleanupImpact,
    theme.listProfile?.relationshipNote,
    theme.listProfile?.outputNote,
    ...(theme.environment ?? []),
    theme.group?.name,
    theme.group?.summary
  ].join(' ').toLocaleLowerCase('ja');
  return searchableText.includes(query);
}

export function displaysRuntimeState(theme: ThemeSummary): boolean {
  return theme.lifecycle !== 'none' && theme.lifecycle !== 'one-shot';
}
