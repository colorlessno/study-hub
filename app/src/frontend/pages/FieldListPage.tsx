import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getChecklists, getFields } from '../api/client';
import { Layout } from '../components/Layout';
import { StudyHubLink } from '../components/StudyHubLink';
import {
  completedItemIds,
  learningState,
  type LearningState
} from '../progress/learningProgress';
import type { CatalogMode, Field, ThemeChecklist } from '../../shared/catalog';

const fieldsPerShelf = 4;

function fieldLearningProgress(
  field: Field,
  checklists: ThemeChecklist[],
  catalogMode: CatalogMode
): { state: LearningState; label: string } | undefined {
  const fieldChecklists = checklists.filter((checklist) => checklist.fieldId === field.id);
  if (fieldChecklists.length === 0) return undefined;
  const states = fieldChecklists.map((checklist) => (
    learningState(checklist, completedItemIds(catalogMode, checklist))
  ));
  const completedCount = states.filter((state) => state === 'completed').length;
  const total = field.themeCount ?? fieldChecklists.length;
  const allThemesCompleted = total > 0
    && fieldChecklists.length === total
    && completedCount === total;
  const state = allThemesCompleted
    ? 'completed'
    : states.some((item) => item !== 'not-started')
      ? 'in-progress'
      : 'not-started';
  return {
    state,
    label: `学習済み ${completedCount}/${total}（チェック設定 ${fieldChecklists.length}）`
  };
}

export function FieldListPage() {
  const [searchParams] = useSearchParams();
  const catalogMode = searchParams.get('catalog') === 'actual' ? 'actual' : 'sample';
  const [fields, setFields] = useState<Field[]>([]);
  const [checklists, setChecklists] = useState<ThemeChecklist[]>([]);
  const [loadError, setLoadError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [loadRevision, setLoadRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setFields([]);
    setChecklists([]);
    setLoadError(undefined);
    setLoading(true);
    void (async () => {
      try {
        const loadedFields = await getFields(catalogMode);
        const loadedChecklists = await getChecklists(catalogMode);
        if (!active) return;
        setFields(loadedFields);
        setChecklists(loadedChecklists);
      } catch (reason: unknown) {
        if (active) setLoadError(reason instanceof Error ? reason : new Error('読み込みに失敗しました。'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [catalogMode, loadRevision]);

  const shelves = Array.from(
    { length: Math.ceil(fields.length / fieldsPerShelf) },
    (_, index) => fields.slice(index * fieldsPerShelf, (index + 1) * fieldsPerShelf)
  );

  return (
    <Layout catalogMode={catalogMode}>
      <h1>分野を選ぶ</h1>
      <p>{catalogMode === 'sample'
        ? '画面動作を確認するための疑似テーマを表示しています。'
        : '保存済み教材から生成した実テーマを表示しています。'}</p>
      {loading && <p className="page-state">分野を読み込んでいます。</p>}
      {loadError && (
        <section className="page-state page-state-error" aria-live="polite">
          <p>{loadError.message}</p>
          <button type="button" onClick={() => setLoadRevision((current) => current + 1)}>
            もう一度読み込む
          </button>
        </section>
      )}
      {!loading && !loadError && shelves.length === 0 ? (
        <p>分野が登録されていません。</p>
      ) : !loading && !loadError ? (
        <div className="bookshelf field-bookshelf">
          {shelves.map((shelf, shelfIndex) => (
            <div className="shelf" key={shelf[0]?.id} aria-label={`${shelfIndex + 1}段目`}>
              <div className="shelf-books field-shelf-books">
                {shelf.map((field) => {
                  const progress = fieldLearningProgress(field, checklists, catalogMode);
                  return (
                    <StudyHubLink
                      className={`book field-book${progress ? ` learning-${progress.state}` : ''}`}
                      key={field.id}
                      to={`/fields/${field.id}/themes?catalog=${catalogMode}`}
                    >
                      <p className="book-id">分野</p>
                      <h2>{field.name}</h2>
                      <p className="field-book-summary">{field.summary}</p>
                      {progress && (
                        <p className={`learning-label learning-label-${progress.state}`}>{progress.label}</p>
                      )}
                      <p className="book-kind">{field.themeCount ?? 0}テーマ</p>
                    </StudyHubLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Layout>
  );
}
