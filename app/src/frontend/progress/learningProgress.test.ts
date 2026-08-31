import { describe, expect, it } from 'vitest';
import {
  completedItemIds,
  learningState,
  learningStateLabel,
  saveThemeProgress,
  setChecklistsCompleted
} from './learningProgress';
import { createStorageLearningProgressRepository } from './learningProgressRepository';
import type { ThemeChecklist } from '../../shared/catalog';

const checklist: ThemeChecklist = {
  schemaVersion: 1,
  revision: 1,
  themeId: 'web01',
  fieldId: 'study-web',
  title: '学習項目',
  items: [
    { id: 'html', label: 'HTML' },
    { id: 'css', label: 'CSS' },
    { id: 'javascript', label: 'JavaScript' }
  ]
};

describe('学習進捗', () => {
  it('未チェックを未着手と判定する', () => {
    expect(learningState(checklist, [])).toBe('not-started');
  });

  it('一部チェックを進行中と判定する', () => {
    expect(learningState(checklist, ['html'])).toBe('in-progress');
  });

  it('全チェックを学習済みと判定する', () => {
    const state = learningState(checklist, ['html', 'css', 'javascript']);
    expect(state).toBe('completed');
    expect(learningStateLabel(state)).toBe('学習済み');
  });

  it('保存先を介して有効なチェック項目だけを保存する', () => {
    const values = new Map<string, string>();
    const repository = createStorageLearningProgressRepository({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    });

    expect(saveThemeProgress('actual', checklist, ['html', 'html', 'unknown'], repository)).toEqual(['html']);
    expect(completedItemIds('actual', checklist, repository)).toEqual(['html']);
  });

  it('複数テーマを一括で学習済みと未着手へ変更する', () => {
    const values = new Map<string, string>();
    const repository = createStorageLearningProgressRepository({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    });
    const secondChecklist: ThemeChecklist = {
      ...checklist,
      themeId: 'web02',
      items: [{ id: 'network', label: 'Network' }]
    };

    setChecklistsCompleted('actual', [checklist, secondChecklist], true, repository);
    expect(completedItemIds('actual', checklist, repository)).toEqual(['html', 'css', 'javascript']);
    expect(completedItemIds('actual', secondChecklist, repository)).toEqual(['network']);

    setChecklistsCompleted('actual', [checklist, secondChecklist], false, repository);
    expect(completedItemIds('actual', checklist, repository)).toEqual([]);
    expect(completedItemIds('actual', secondChecklist, repository)).toEqual([]);
  });

  it('壊れた保存データを未着手として扱う', () => {
    const repository = createStorageLearningProgressRepository({
      getItem: () => '{invalid-json',
      setItem: () => undefined
    });

    expect(completedItemIds('sample', checklist, repository)).toEqual([]);
  });
});
