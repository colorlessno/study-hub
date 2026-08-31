import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useSearchParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import {
  ApiError,
  getChecklists,
  getFieldReadme,
  getFields,
  getThemes,
  inspectFieldReadiness,
  runFieldCheck
} from '../api/client';
import { Layout } from '../components/Layout';
import { RuntimeStatus } from '../components/RuntimeStatus';
import { StudyHubLink } from '../components/StudyHubLink';
import {
  displaysRuntimeState,
  groupThemesForShelves,
  integrationModeLabels,
  lifecycleLabels,
  matchesThemeFilter,
  presentationLabels,
  themeInteractionLabel,
  themePreparationLabel
} from '../catalog/catalogPresentation';
import {
  completedItemIds,
  learningState,
  learningStateLabel,
  setChecklistsCompleted
} from '../progress/learningProgress';
import type {
  Field,
  FieldCheckReport,
  FieldReadinessReport,
  ThemeChecklist,
  ThemeSummary
} from '../../shared/catalog';

const booksPerShelf = 6;

export function ThemeListPage() {
  const { fieldId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const catalogMode = searchParams.get('catalog') === 'actual' ? 'actual' : 'sample';
  const [field, setField] = useState<Field>();
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [checklists, setChecklists] = useState<ThemeChecklist[]>([]);
  const [progressRevision, setProgressRevision] = useState(0);
  const [filter, setFilter] = useState('');
  const [preparationFilter, setPreparationFilter] = useState('');
  const [loadError, setLoadError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [loadRevision, setLoadRevision] = useState(0);
  const [fieldReadme, setFieldReadme] = useState<{ entryFile: string; content: string }>();
  const [fieldReadmeError, setFieldReadmeError] = useState<Error>();
  const [fieldReadmeLoading, setFieldReadmeLoading] = useState(false);
  const [showsFieldReadme, setShowsFieldReadme] = useState(false);
  const [fieldCheckRunning, setFieldCheckRunning] = useState(false);
  const [fieldCheckReport, setFieldCheckReport] = useState<FieldCheckReport>();
  const [fieldCheckError, setFieldCheckError] = useState<Error>();
  const [readinessRunning, setReadinessRunning] = useState(false);
  const [readinessReport, setReadinessReport] = useState<FieldReadinessReport>();
  const [readinessError, setReadinessError] = useState<Error>();

  useEffect(() => {
    let active = true;
    setField(undefined);
    setThemes([]);
    setChecklists([]);
    setLoadError(undefined);
    setLoading(true);
    setFieldReadme(undefined);
    setFieldReadmeError(undefined);
    setFieldReadmeLoading(catalogMode === 'actual');
    setShowsFieldReadme(false);
    setFieldCheckRunning(false);
    setFieldCheckReport(undefined);
    setFieldCheckError(undefined);
    setReadinessRunning(false);
    setReadinessReport(undefined);
    setReadinessError(undefined);
    void (async () => {
      try {
        const fields = await getFields(catalogMode);
        const loadedThemes = await getThemes(fieldId, catalogMode);
        const loadedChecklists = await getChecklists(catalogMode);
        if (active) {
          setField(fields.find((item) => item.id === fieldId));
          setThemes(loadedThemes);
          setChecklists(loadedChecklists);
        }
      } catch (reason: unknown) {
        if (active) setLoadError(reason instanceof Error ? reason : new Error('読み込みに失敗しました。'));
      } finally {
        if (active) setLoading(false);
      }
      if (catalogMode === 'actual') {
        try {
          const readme = await getFieldReadme(fieldId, catalogMode);
          if (active) setFieldReadme(readme);
        } catch (reason: unknown) {
          if (active) {
            setFieldReadmeError(reason instanceof Error ? reason : new Error('READMEの読み込みに失敗しました。'));
          }
        } finally {
          if (active) setFieldReadmeLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [catalogMode, fieldId, loadRevision]);

  const visibleThemes = useMemo(() => {
    return themes.filter((theme) => (
      matchesThemeFilter(theme, filter)
      && (!preparationFilter || themePreparationLabel(theme) === preparationFilter)
    ));
  }, [filter, preparationFilter, themes]);

  const shelves = useMemo(
    () => groupThemesForShelves(visibleThemes, booksPerShelf),
    [visibleThemes]
  );
  const preparationOptions = useMemo(
    () => [...new Set(themes.map(themePreparationLabel))].sort((left, right) => left.localeCompare(right, 'ja')),
    [themes]
  );
  const fieldChecklists = useMemo(
    () => checklists.filter((checklist) => checklist.fieldId === fieldId),
    [checklists, fieldId]
  );
  const checklistByThemeId = useMemo(
    () => new Map(checklists.map((checklist) => [checklist.themeId, checklist])),
    [checklists, progressRevision]
  );
  const fieldNotFound = loadError instanceof ApiError && loadError.code === 'FIELD_NOT_FOUND';
  const fieldChecklistItemCount = useMemo(
    () => fieldChecklists.reduce((total, checklist) => total + checklist.items.length, 0),
    [fieldChecklists]
  );

  function changeAllProgress(completed: boolean): void {
    const action = completed ? 'すべて学習済み' : 'すべてクリア';
    if (!window.confirm(
      `この分野の${fieldChecklists.length}テーマ、${fieldChecklistItemCount}項目を${action}にします。`
    )) return;
    setChecklistsCompleted(catalogMode, fieldChecklists, completed);
    setProgressRevision((current) => current + 1);
  }

  async function executeFieldCheck(): Promise<void> {
    setFieldCheckRunning(true);
    setFieldCheckReport(undefined);
    setFieldCheckError(undefined);
    try {
      setFieldCheckReport(await runFieldCheck(fieldId, catalogMode));
    } catch (reason) {
      setFieldCheckError(reason instanceof Error ? reason : new Error('分野の検証を実行できません。'));
    } finally {
      setFieldCheckRunning(false);
    }
  }

  async function executeReadinessInspection(): Promise<void> {
    setReadinessRunning(true);
    setReadinessReport(undefined);
    setReadinessError(undefined);
    try {
      setReadinessReport(await inspectFieldReadiness(fieldId, catalogMode));
    } catch (reason) {
      setReadinessError(reason instanceof Error ? reason : new Error('準備状態を確認できません。'));
    } finally {
      setReadinessRunning(false);
    }
  }

  const fieldCheckOutput = fieldCheckReport
    ? fieldCheckReport.logs.map((entry) => `[${entry.source}] ${entry.message}`).join('\n')
      || JSON.stringify(fieldCheckReport.result.output, null, 2)
    : '';

  return (
    <Layout catalogMode={catalogMode}>
      <nav className="breadcrumb">
        <StudyHubLink to={`/fields?catalog=${catalogMode}`}>分野一覧</StudyHubLink> / テーマ一覧
      </nav>
      <h1>{loading
        ? 'テーマを読み込んでいます'
        : fieldNotFound
          ? '分野が見つかりません'
          : field?.name ?? 'テーマを選ぶ'}</h1>
      {!loading && !loadError && catalogMode === 'actual' && (
        <div className="field-readme-actions">
          <div className="button-row">
            <button
              type="button"
              disabled={fieldReadmeLoading || !fieldReadme}
              aria-expanded={showsFieldReadme}
              onClick={() => setShowsFieldReadme((current) => !current)}
            >
              {fieldReadmeLoading
                ? '分野のREADMEを読み込んでいます'
                : showsFieldReadme
                  ? '分野のREADMEを閉じる'
                  : '分野のREADMEを表示'}
            </button>
            <button type="button" disabled={readinessRunning} onClick={() => void executeReadinessInspection()}>
              {readinessRunning ? '準備状態を確認しています' : '準備状態を確認'}
            </button>
            {field?.check && (
              <button type="button" disabled={fieldCheckRunning} onClick={() => void executeFieldCheck()}>
                {fieldCheckRunning ? '分野の教材を検証しています' : '分野の教材を検証'}
              </button>
            )}
          </div>
          {field?.check && (
            <p className="field-check-command">
              登録済みの検証: <code>{field.check.command} {field.check.args.join(' ')}</code>
            </p>
          )}
          {fieldReadmeError && <p className="error-message">{fieldReadmeError.message}</p>}
          {readinessError && <p className="error-message">{readinessError.message}</p>}
          {fieldCheckError && <p className="error-message">{fieldCheckError.message}</p>}
        </div>
      )}
      {showsFieldReadme && fieldReadme && (
        <section className="panel field-readme-panel">
          <h2>分野のREADME</h2>
          <p className="readme-local-reference"><code>{fieldReadme.entryFile}</code></p>
          <div className="readme-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a({ href, children }) {
                  if (!href) return <span>{children}</span>;
                  if (/^https?:\/\//u.test(href)) {
                    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                  }
                  return (
                    <span className="readme-local-reference">
                      {children} <code>{href}</code>
                    </span>
                  );
                },
              }}
            >
              {fieldReadme.content}
            </ReactMarkdown>
          </div>
        </section>
      )}
      {fieldCheckReport && (
        <section className="panel field-check-panel" aria-live="polite">
          <h2>分野の検証結果</h2>
          <p className={fieldCheckReport.result.ok ? 'field-check-success' : 'field-check-failure'}>
            {fieldCheckReport.result.ok ? '検証に成功しました。' : '検証で問題が見つかりました。'}
            {fieldCheckReport.result.exitCode !== undefined
              ? ` 終了コード: ${String(fieldCheckReport.result.exitCode)}`
              : ''}
          </p>
          <pre className="field-check-output">{fieldCheckOutput || '出力はありません。'}</pre>
        </section>
      )}
      {readinessReport && (
        <section className="panel readiness-panel" aria-live="polite">
          <h2>実行環境の準備状態</h2>
          <p className={readinessReport.ready ? 'field-check-success' : 'field-check-failure'}>
            {readinessReport.ready
              ? '自動確認できる必須項目は準備されています。'
              : '準備が必要な必須項目があります。'}
          </p>
          <ul className="readiness-list">
            {readinessReport.items.map((item) => (
              <li className={`readiness-${item.status}`} key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.status === 'ready' ? '準備済み' : item.status === 'missing' ? '要準備' : '起動時に確認'}</span>
                <p>{item.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="theme-list-filters">
        <label className="filter-label">
          テーマを絞り込む
          <input value={filter} onChange={(event) => setFilter(event.target.value)} />
        </label>
        <label className="filter-label">
          準備条件で絞り込む
          <select value={preparationFilter} onChange={(event) => setPreparationFilter(event.target.value)}>
            <option value="">すべて</option>
            {preparationOptions.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      {loading && <p className="page-state">テーマを読み込んでいます。</p>}
      {loadError && (
        <section className="page-state page-state-error" aria-live="polite">
          <p>{loadError.message}</p>
          <div className="page-state-actions">
            {!fieldNotFound && (
              <button type="button" onClick={() => setLoadRevision((current) => current + 1)}>
                もう一度読み込む
              </button>
            )}
            <StudyHubLink className="button-link" to={`/fields?catalog=${catalogMode}`}>
              分野一覧へ戻る
            </StudyHubLink>
          </div>
        </section>
      )}
      {!loading && !loadError && <p className="theme-count">{visibleThemes.length}冊</p>}
      {!loading && !loadError && fieldChecklists.length > 0 && (
        <section className="learning-bulk" aria-label="分野の学習進捗を一括変更">
          <p>チェック設定済み: {fieldChecklists.length}テーマ / {fieldChecklistItemCount}項目</p>
          <div className="button-row">
            <button onClick={() => changeAllProgress(true)}>すべて学習済みにする</button>
            <button onClick={() => changeAllProgress(false)}>進捗をすべてクリア</button>
          </div>
        </section>
      )}
      {!loading && !loadError && shelves.length === 0 ? (
        <p>該当するテーマはありません。</p>
      ) : !loading && !loadError ? (
        <div className="bookshelf">
          {shelves.map((shelf) => (
            <section className="shelf-group" key={shelf.id} aria-label={shelf.name}>
              {shelf.showsHeading && (
                <header className="shelf-group-heading">
                  <div>
                    <h2>{shelf.name}</h2>
                    {shelf.summary && <p>{shelf.summary}</p>}
                  </div>
                  <span>{shelf.themes.length}冊</span>
                </header>
              )}
              {Array.from(
                { length: Math.ceil(shelf.themes.length / booksPerShelf) },
                (_, index) => shelf.themes.slice(index * booksPerShelf, (index + 1) * booksPerShelf)
              ).map((themesInRow, rowIndex) => (
                <div className="shelf" key={`${shelf.id}-${rowIndex}`} aria-label={`${shelf.name} ${rowIndex + 1}段目`}>
                  <div className="shelf-books">
                    {themesInRow.map((theme) => {
                  const checklist = checklistByThemeId.get(theme.id);
                  const completedIds = checklist ? completedItemIds(catalogMode, checklist) : [];
                  const state = checklist ? learningState(checklist, completedIds) : undefined;
                  return (
                    <article className={`book${state ? ` learning-${state}` : ''}`} key={theme.id}>
                      <p className="book-id">{theme.id}</p>
                      <h2>
                        <StudyHubLink to={`/themes/${theme.id}?catalog=${catalogMode}`}>{theme.name}</StudyHubLink>
                      </h2>
                      <p className="book-summary">{theme.summary}</p>
                      {checklist && state ? (
                        <p className={`learning-label learning-label-${state}`}>
                          {learningStateLabel(state)} {completedIds.length}/{checklist.items.length}
                        </p>
                      ) : null}
                      <p className="book-kind">組み込み: {integrationModeLabels[theme.integrationMode]}</p>
                      <p className="book-kind">表示: {presentationLabels[theme.presentation]}</p>
                      <p className="book-kind">実行方法: {lifecycleLabels[theme.lifecycle]}</p>
                      <p className="book-kind">確認方法: {themeInteractionLabel(theme)}</p>
                      {theme.listProfile?.initialization && (
                        <p className="book-kind">開始前: {theme.listProfile.initialization}</p>
                      )}
                      {theme.listProfile?.environmentScope && (
                        <p className="book-kind">実行環境: {theme.listProfile.environmentScope}</p>
                      )}
                      {theme.listProfile?.cleanupImpact && (
                        <p className="book-kind">停止時: {theme.listProfile.cleanupImpact}</p>
                      )}
                      {theme.listProfile?.relationshipNote && (
                        <p className="book-kind">関連: {theme.listProfile.relationshipNote}</p>
                      )}
                      {theme.listProfile?.outputNote && (
                        <p className="book-kind">成果物: {theme.listProfile.outputNote}</p>
                      )}
                      <p className="book-kind">準備: {themePreparationLabel(theme)}</p>
                      {displaysRuntimeState(theme) && (
                        <div className="book-status">
                          <RuntimeStatus state={theme.runtimeState} />
                        </div>
                      )}
                    </article>
                  );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </Layout>
  );
}
