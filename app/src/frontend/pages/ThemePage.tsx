import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useSearchParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import {
  ApiError,
  getChecklists,
  getRuntime,
  getTheme,
  getThemeMaterial,
  getThemeReadme,
  getThemeResource,
  getThemes,
  materialUrl,
  recheckRuntime,
  runTheme,
  startRuntime,
  stopRuntime
} from '../api/client';
import { Layout } from '../components/Layout';
import { RuntimeStatus } from '../components/RuntimeStatus';
import { StudyHubLink } from '../components/StudyHubLink';
import {
  integrationModeLabels,
  lifecycleLabels,
  presentationLabels
} from '../catalog/catalogPresentation';
import { createApiErrorPresentation } from '../catalog/apiErrorPresentation';
import { formatRunResult } from '../catalog/runResultPresentation';
import {
  completedItemIds,
  learningState,
  learningStateLabel,
  saveThemeProgress
} from '../progress/learningProgress';
import type {
  LogEntry,
  RunResult,
  RuntimeView,
  Theme,
  ThemeChecklist,
  ThemeResourceContent,
  ThemeSummary
} from '../../shared/catalog';
import { createThemeScreenModel } from '../../shared/themeScreenModel';

type ContentView = 'material' | 'result' | 'guide' | `resource:${string}`;

export function ThemePage() {
  const { themeId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const catalogMode = searchParams.get('catalog') === 'actual' ? 'actual' : 'sample';
  const [theme, setTheme] = useState<Theme>();
  const [runtime, setRuntime] = useState<RuntimeView>();
  const [themeSequence, setThemeSequence] = useState<ThemeSummary[]>([]);
  const [checklist, setChecklist] = useState<ThemeChecklist>();
  const [checkedItemIds, setCheckedItemIds] = useState<string[]>([]);
  const [input, setInput] = useState('sample');
  const [selectedOperationId, setSelectedOperationId] = useState('');
  const [operationValues, setOperationValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RunResult>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [documentContent, setDocumentContent] = useState<string>();
  const [readmeContent, setReadmeContent] = useState<string>();
  const [resourceContent, setResourceContent] = useState<ThemeResourceContent>();
  const [resourceError, setResourceError] = useState('');
  const [contentView, setContentView] = useState<ContentView>('material');
  const [loadError, setLoadError] = useState<Error>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadRevision, setLoadRevision] = useState(0);
  const [logConnectionRevision, setLogConnectionRevision] = useState(0);
  const [logConnectionState, setLogConnectionState] = useState<
    'idle' | 'connecting' | 'connected' | 'disconnected'
  >('idle');

  useEffect(() => {
    let active = true;
    setError('');
    setLoadError(undefined);
    setTheme(undefined);
    setRuntime(undefined);
    setThemeSequence([]);
    setChecklist(undefined);
    setCheckedItemIds([]);
    setSelectedOperationId('');
    setOperationValues({});
    setResult(undefined);
    setLogs([]);
    setDocumentContent(undefined);
    setReadmeContent(undefined);
    setResourceContent(undefined);
    setResourceError('');
    setContentView('material');
    setLogConnectionState('idle');
    setLoading(true);
    void (async () => {
      try {
        const loadedTheme = await getTheme(themeId, catalogMode);
        const loadedRuntime = await getRuntime(themeId, catalogMode);
        const loadedChecklists = await getChecklists(catalogMode);
        const loadedThemeSequence = await getThemes(loadedTheme.fieldId, catalogMode);
        if (!active) return;
        const loadedChecklist = loadedChecklists.find((item) => item.themeId === loadedTheme.id);
        setTheme(loadedTheme);
        setRuntime(loadedRuntime);
        setThemeSequence(loadedThemeSequence);
        setChecklist(loadedChecklist);
        setCheckedItemIds(loadedChecklist ? completedItemIds(catalogMode, loadedChecklist) : []);
        const firstCommandOperation = loadedTheme.operations.run?.commandOperations?.[0];
        setSelectedOperationId(
          loadedTheme.operations.run?.requests?.[0]?.id ?? firstCommandOperation?.id ?? ''
        );
        setInput(firstCommandOperation?.input?.defaultValue ?? 'sample');
        setContentView(createThemeScreenModel(loadedTheme).defaultContentView);
      } catch (reason: unknown) {
        if (active) setLoadError(reason instanceof Error ? reason : new Error('読み込みに失敗しました。'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [catalogMode, loadRevision, themeId]);

  useEffect(() => {
    if (catalogMode !== 'actual' || theme?.integrationStatus !== 'connected') return;
    if (theme.presentation !== 'document') return;
    let active = true;
    getThemeMaterial(theme.id, catalogMode)
      .then((material) => {
        if (active) setDocumentContent(material.content);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : '教材を読み込めません。');
      });
    return () => {
      active = false;
    };
  }, [catalogMode, theme]);

  useEffect(() => {
    if (!theme || !contentView.startsWith('resource:')) return;
    const resourceId = contentView.slice('resource:'.length);
    let active = true;
    setResourceContent(undefined);
    setResourceError('');
    getThemeResource(theme.id, resourceId, catalogMode)
      .then((resource) => {
        if (active) setResourceContent(resource);
      })
      .catch((reason: unknown) => {
        if (active) {
          setResourceError(reason instanceof Error ? reason.message : '関連ファイルを読み込めません。');
        }
      });
    return () => {
      active = false;
    };
  }, [catalogMode, contentView, theme]);

  useEffect(() => {
    if (catalogMode !== 'actual' || !theme?.entryFile?.toLowerCase().endsWith('.md')) return;
    let active = true;
    getThemeReadme(theme.id, catalogMode)
      .then((readme) => {
        if (active) setReadmeContent(readme.content);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : '説明文書を読み込めません。');
      });
    return () => {
      active = false;
    };
  }, [catalogMode, theme]);

  useEffect(() => {
    if (!theme || theme.integrationStatus === 'metadata-only' || theme.lifecycle === 'none') {
      setLogConnectionState('idle');
      return;
    }
    let active = true;
    setLogConnectionState('connecting');
    const source = new EventSource(
      `/api/themes/${encodeURIComponent(themeId)}/logs?catalog=${encodeURIComponent(catalogMode)}`
    );
    source.onopen = () => {
      if (active) setLogConnectionState('connected');
    };
    source.onerror = () => {
      source.close();
      if (active) setLogConnectionState('disconnected');
    };
    source.addEventListener('log', (event) => {
      const entry = JSON.parse((event as MessageEvent<string>).data) as LogEntry;
      if (active) setLogConnectionState('connected');
      setLogs((current) => current.some((item) => item.sequence === entry.sequence)
        ? current
        : [...current, entry].slice(-500));
    });
    return () => {
      active = false;
      source.close();
    };
  }, [catalogMode, logConnectionRevision, theme, themeId]);

  const activeUrl = useMemo(() => runtime?.processes.find((process) => process.url)?.url, [runtime]);
  const staticUrl = catalogMode === 'sample' && theme?.integrationStatus === 'connected'
    ? materialUrl(theme.material.path)
    : '';
  const actualStaticUrl = catalogMode === 'actual' && theme?.actualConnection?.type === 'static-web'
    ? `/actual-materials/${encodeURIComponent(theme.id)}/${encodeURIComponent(theme.actualConnection.entryFile)}`
    : '';
  const canRun = theme?.lifecycle === 'one-shot' || runtime?.state === 'ready';
  const requestOperations = theme?.operations.run?.mode === 'request'
    ? theme.operations.run.requests ?? []
    : [];
  const commandOperations = theme?.operations.run?.mode === 'command'
    ? theme.operations.run.commandOperations ?? []
    : [];
  const selectableOperations = requestOperations.length > 0 ? requestOperations : commandOperations;
  const selectedRequestOperation = requestOperations.find((operation) => operation.id === selectedOperationId);
  const selectedCommandOperation = commandOperations.find((operation) => operation.id === selectedOperationId);
  const selectedOperation = selectedRequestOperation ?? selectedCommandOperation;
  const hasRunResult = Boolean(theme?.operations.run);
  const hasMarkdownGuide = catalogMode === 'actual' && theme?.entryFile?.toLowerCase().endsWith('.md');
  const selectedResourceId = contentView.startsWith('resource:')
    ? contentView.slice('resource:'.length)
    : undefined;
  const guideButtonLabel = theme?.entryFile?.toLowerCase().endsWith('readme.md')
    ? 'READMEを表示'
    : '説明文書を表示';
  const checklistState = checklist ? learningState(checklist, checkedItemIds) : undefined;
  const apiErrorPresentation = theme?.id === 'web41' && result
    ? createApiErrorPresentation(result.output)
    : undefined;
  const currentThemeIndex = themeSequence.findIndex((item) => item.id === theme?.id);
  const previousTheme = currentThemeIndex > 0 ? themeSequence[currentThemeIndex - 1] : undefined;
  const nextTheme = currentThemeIndex >= 0 && currentThemeIndex < themeSequence.length - 1
    ? themeSequence[currentThemeIndex + 1]
    : undefined;

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作に失敗しました。');
      setRuntime(await getRuntime(themeId, catalogMode).catch(() => runtime));
    } finally {
      setBusy(false);
    }
  }

  function changeChecklistItem(itemId: string, checked: boolean): void {
    if (!checklist) return;
    const nextIds = checked
      ? [...checkedItemIds, itemId]
      : checkedItemIds.filter((id) => id !== itemId);
    setCheckedItemIds(saveThemeProgress(catalogMode, checklist, nextIds));
  }

  function resetChecklist(): void {
    if (!checklist || checkedItemIds.length === 0) return;
    setCheckedItemIds(saveThemeProgress(catalogMode, checklist, []));
  }

  function checkAllChecklistItems(): void {
    if (!checklist || checkedItemIds.length === checklist.items.length) return;
    const allItemIds = checklist.items.map((item) => item.id);
    setCheckedItemIds(saveThemeProgress(catalogMode, checklist, allItemIds));
  }

  if (loading || !theme || !runtime) {
    const themeNotFound = loadError instanceof ApiError && loadError.code === 'THEME_NOT_FOUND';
    return (
      <Layout catalogMode={catalogMode}>
        <nav className="breadcrumb">
          <StudyHubLink to={`/fields?catalog=${catalogMode}`}>分野一覧</StudyHubLink> / テーマ画面
        </nav>
        {loading ? (
          <p className="page-state">テーマを読み込んでいます。</p>
        ) : (
          <section className="page-state page-state-error" aria-live="polite">
            <h1>{themeNotFound ? 'テーマが見つかりません' : 'テーマを読み込めません'}</h1>
            <p>{loadError?.message ?? 'テーマを読み込めませんでした。'}</p>
            <div className="page-state-actions">
              {!themeNotFound && (
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
      </Layout>
    );
  }

  const embeddedUrl = theme.lifecycle === 'none' ? (staticUrl || actualStaticUrl) : activeUrl;
  const externalUrl = theme.lifecycle === 'manual' ? staticUrl : activeUrl;
  const screenModel = createThemeScreenModel(theme);
  const hasExternalAction = Boolean(externalUrl && screenModel.showsExternalAction);
  const themeNavigation = (position: '上部' | '下部') => (
    <nav className="theme-navigation" aria-label={`テーマ間移動（${position}）`}>
      {previousTheme ? (
        <StudyHubLink
          className="button-link"
          to={`/themes/${previousTheme.id}?catalog=${catalogMode}`}
          title={`前のテーマ: ${previousTheme.id}`}
        >
          <span>← 前のテーマ</span>
          <small>{previousTheme.id}</small>
        </StudyHubLink>
      ) : (
        <span className="button-link theme-navigation-disabled" aria-disabled="true">
          <span>← 前のテーマ</span>
          <small>なし</small>
        </span>
      )}
      <span className="theme-navigation-current">{theme.id}</span>
      {nextTheme ? (
        <StudyHubLink
          className="button-link"
          to={`/themes/${nextTheme.id}?catalog=${catalogMode}`}
          title={`次のテーマ: ${nextTheme.id}`}
        >
          <span>次のテーマ →</span>
          <small>{nextTheme.id}</small>
        </StudyHubLink>
      ) : (
        <span className="button-link theme-navigation-disabled" aria-disabled="true">
          <span>次のテーマ →</span>
          <small>なし</small>
        </span>
      )}
    </nav>
  );
  const formattedMarkdown = (content: string | undefined) => (
    <div className="readme-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (!href) return <span>{children}</span>;
            if (/^https?:\/\//u.test(href)) {
              return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
            }
            if (href.startsWith('/')) {
              return <StudyHubLink to={href}>{children}</StudyHubLink>;
            }
            return (
              <span className="readme-local-reference">
                {children} <code>{href}</code>
              </span>
            );
          },
        }}
      >
        {content ?? '読み込んでいます。'}
      </ReactMarkdown>
    </div>
  );

  return (
    <Layout catalogMode={catalogMode}>
      <nav className="breadcrumb">
        <StudyHubLink to={`/fields?catalog=${catalogMode}`}>分野一覧</StudyHubLink> /{' '}
        <StudyHubLink to={`/fields/${theme.fieldId}/themes?catalog=${catalogMode}`}>テーマ一覧</StudyHubLink> / テーマ画面
      </nav>
      {themeNavigation('上部')}
      <div className="theme-heading">
        <div>
          <h1>{theme.name}</h1>
          <p>{theme.summary}</p>
        </div>
        {screenModel.showsRuntimeState && <RuntimeStatus state={runtime.state} />}
      </div>

      <dl className="facts">
        <div><dt>表示</dt><dd>{presentationLabels[theme.presentation]}</dd></div>
        <div><dt>実行方法</dt><dd>{lifecycleLabels[theme.lifecycle]}</dd></div>
        <div><dt>組み込み</dt><dd>{integrationModeLabels[theme.integrationMode]}</dd></div>
        <div><dt>必要な環境</dt><dd>{theme.environment.required.join('、') || 'なし'}</dd></div>
      </dl>

      {checklist && checklistState && (
        <section className="panel learning-checklist">
          <div className="learning-checklist-heading">
            <h2>{checklist.title}</h2>
            <div className="learning-checklist-actions">
              <span className={`learning-label learning-label-${checklistState}`}>
                {learningStateLabel(checklistState)} {checkedItemIds.length}/{checklist.items.length}
              </span>
              <button
                type="button"
                className="checklist-action-button checklist-check-all-button"
                disabled={checkedItemIds.length === checklist.items.length}
                onClick={checkAllChecklistItems}
              >
                すべてチェック
              </button>
              <button
                type="button"
                className="checklist-action-button checklist-reset-button"
                disabled={checkedItemIds.length === 0}
                onClick={resetChecklist}
              >
                チェックをリセット
              </button>
            </div>
          </div>
          <ul>
            {checklist.items.map((item) => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={checkedItemIds.includes(item.id)}
                    onChange={(event) => changeChecklistItem(item.id, event.target.checked)}
                  />
                  <span>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p({ children }) {
                          return <>{children}</>;
                        },
                        a({ children }) {
                          return <span>{children}</span>;
                        },
                      }}
                    >
                      {item.label}
                    </ReactMarkdown>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {theme.integrationStatus === 'metadata-only' ? (
        <>
          <section className="panel">
            <h2>教材入口</h2>
            <p><code>{theme.entryFile}</code></p>
            <p>{runtime.message}</p>
          </section>
          {hasMarkdownGuide && (
            <section className="panel material-panel">
              <h2>{guideButtonLabel.replace('を表示', '')}</h2>
              {formattedMarkdown(readmeContent)}
            </section>
          )}
        </>
      ) : (
        <>
          {(screenModel.showsRuntimeControls || hasExternalAction) && (
            <section className="panel">
              <h2>操作</h2>
              <p>{runtime.message}</p>
              <div className="button-row">
                {theme.operations.start && (
                  <button disabled={busy || runtime.state === 'ready'} onClick={() => perform(async () => {
                    setRuntime(await startRuntime(theme.id, catalogMode));
                  })}>起動</button>
                )}
                {theme.operations.stop && (
                  <button disabled={busy || runtime.state === 'stopped'} onClick={() => perform(async () => {
                    setRuntime(await stopRuntime(theme.id, catalogMode));
                  })}>停止</button>
                )}
                {screenModel.showsRuntimeControls && (
                  <button disabled={busy} onClick={() => perform(async () => {
                    setRuntime(await recheckRuntime(theme.id, catalogMode));
                  })}>状態を更新</button>
                )}
                {hasExternalAction && (
                  <a className="button-link" href={externalUrl} target="_blank" rel="noreferrer">別画面で開く</a>
                )}
              </div>
            </section>
          )}

          {screenModel.showsRun && theme.operations.run && (
            <section className="panel">
              <h2>実行</h2>
              {selectableOperations.length > 0 ? (
                <div className="api-operation-form">
                  <label>
                    {requestOperations.length > 0 ? 'API操作' : '操作'}
                    <select value={selectedOperationId} onChange={(event) => {
                      setSelectedOperationId(event.target.value);
                      setOperationValues({});
                      setInput(
                        commandOperations.find((operation) => operation.id === event.target.value)
                          ?.input?.defaultValue ?? ''
                      );
                      setResult(undefined);
                    }}>
                      {selectableOperations.map((operation) => (
                        <option key={operation.id} value={operation.id}>{operation.label}</option>
                      ))}
                    </select>
                  </label>
                  {selectedRequestOperation?.inputs?.length ? selectedRequestOperation.inputs.map((definition) => (
                    <label key={definition.name}>
                      {definition.label}{definition.required ? '（必須）' : ''}
                      {definition.type === 'boolean' ? (
                        <select
                          value={operationValues[definition.name] ?? ''}
                          onChange={(event) => setOperationValues((current) => ({
                            ...current,
                            [definition.name]: event.target.value
                          }))}
                        >
                          <option value="">変更しない</option>
                          <option value="true">完了</option>
                          <option value="false">未完了</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={operationValues[definition.name] ?? ''}
                          placeholder={definition.placeholder}
                          onChange={(event) => setOperationValues((current) => ({
                            ...current,
                            [definition.name]: event.target.value
                          }))}
                        />
                      )}
                    </label>
                  )) : selectedCommandOperation?.input ? (
                    <label>
                      {selectedCommandOperation.input.label}
                      <textarea
                        value={input}
                        placeholder={selectedCommandOperation.input.placeholder}
                        onChange={(event) => setInput(event.target.value)}
                      />
                    </label>
                  ) : <p>この操作に入力は必要ありません。</p>}
                </div>
              ) : (
                <label>
                  入力
                  <textarea value={input} onChange={(event) => setInput(event.target.value)} />
                </label>
              )}
              <button disabled={busy || !canRun} onClick={() => perform(async () => {
                setResult(await runTheme(
                  theme.id,
                  input,
                  catalogMode,
                  selectedOperation?.id,
                  operationValues
                ));
                setRuntime(await getRuntime(theme.id, catalogMode));
              })}>{selectedCommandOperation?.label
                ?? (selectedRequestOperation?.label ?? '実行する')}</button>
              {result && <pre className="result">{formatRunResult(result)}</pre>}
              {apiErrorPresentation && (
                <section className="api-error-presentation" aria-live="polite">
                  <h3>フロント表示例</h3>
                  <p><strong>表示先:</strong> {apiErrorPresentation.destination}</p>
                  <p>{apiErrorPresentation.message}</p>
                  {apiErrorPresentation.fieldErrors.length > 0 && (
                    <ul>
                      {apiErrorPresentation.fieldErrors.map((fieldError) => (
                        <li key={`${fieldError.field}:${fieldError.message}`}>
                          <code>{fieldError.field}</code>: {fieldError.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  <dl>
                    <div><dt>エラーコード</dt><dd><code>{apiErrorPresentation.code}</code></dd></div>
                    <div><dt>問合せID</dt><dd><code>{apiErrorPresentation.requestId || 'なし'}</code></dd></div>
                  </dl>
                </section>
              )}
            </section>
          )}

          {(hasMarkdownGuide || Boolean(theme.resources?.length)) && (
            <section className="panel material-panel">
              <h2>教材</h2>
              <div className="content-switch" aria-label="教材と関連ファイルの表示切替">
                {screenModel.showsEmbeddedMaterial && (
                  <button
                    aria-pressed={contentView === 'material'}
                    className={contentView === 'material' ? 'selected' : ''}
                    onClick={() => setContentView('material')}
                  >教材を表示</button>
                )}
                {hasRunResult && (
                  <button
                    aria-pressed={contentView === 'result'}
                    className={contentView === 'result' ? 'selected' : ''}
                    onClick={() => setContentView('result')}
                  >実行結果を表示</button>
                )}
                {hasMarkdownGuide && (
                  <button
                    aria-pressed={contentView === 'guide'}
                    className={contentView === 'guide' ? 'selected' : ''}
                    onClick={() => setContentView('guide')}
                  >{guideButtonLabel}</button>
                )}
                {theme.resources?.map((resource) => (
                  <button
                    key={resource.id}
                    aria-pressed={contentView === `resource:${resource.id}`}
                    className={contentView === `resource:${resource.id}` ? 'selected' : ''}
                    onClick={() => setContentView(`resource:${resource.id}`)}
                  >{resource.label}を表示</button>
                ))}
              </div>
              {selectedResourceId ? (
                resourceError ? (
                  <p className="error-message">{resourceError}</p>
                ) : resourceContent ? (
                  <>
                    <p><code>{resourceContent.path}</code></p>
                    {resourceContent.format === 'markdown'
                      ? formattedMarkdown(resourceContent.content)
                      : <pre className="document-content">{resourceContent.content}</pre>}
                  </>
                ) : (
                  <p>関連ファイルを読み込んでいます。</p>
                )
              ) : contentView === 'guide' ? (
                <>
                  <p><code>{theme.entryFile}</code></p>
                  {formattedMarkdown(readmeContent)}
                </>
              ) : contentView === 'result' ? (
                result ? (
                  <pre className="result">{formatRunResult(result)}</pre>
                ) : (
                  <p>上の実行欄で操作を選ぶと、結果が表示されます。</p>
                )
              ) : (
                theme.presentation === 'document' ? (
                  <pre className="document-content">{documentContent ?? '読み込んでいます。'}</pre>
                ) : embeddedUrl ? (
                  <iframe
                    title={theme.name}
                    src={embeddedUrl}
                    sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
                  />
                ) : (
                  <p>{runtime.message}</p>
                )
              )}
            </section>
          )}

          {!hasMarkdownGuide && screenModel.showsEmbeddedMaterial && embeddedUrl && (
            <section className="panel material-panel">
              <h2>教材</h2>
              <iframe
                title={theme.name}
                src={embeddedUrl}
                sandbox={catalogMode === 'actual'
                  ? 'allow-forms allow-scripts allow-same-origin allow-top-navigation-by-user-activation'
                  : 'allow-forms allow-scripts'}
              />
            </section>
          )}

          {catalogMode === 'actual'
            && !hasMarkdownGuide
            && screenModel.showsEmbeddedMaterial
            && theme.presentation === 'document' && (
            <section className="panel">
              <h2>教材</h2>
              <p><code>{theme.entryFile}</code></p>
              <pre className="document-content">{documentContent ?? '読み込んでいます。'}</pre>
            </section>
          )}

          {screenModel.showsLogs && theme.operations.start && (
            <section className="panel">
              <div className="log-heading">
                <h2>実行ログ</h2>
                <span className="log-connection-status" aria-live="polite">
                  {logConnectionState === 'connecting' && 'ログへ接続中'}
                  {logConnectionState === 'connected' && 'ログ接続中'}
                  {logConnectionState === 'disconnected' && 'ログ切断'}
                </span>
              </div>
              <pre className="logs">{logs.length === 0
                ? 'ログはまだありません。'
                : logs.map((entry) => `[${entry.source}] ${entry.message}`).join('\n')}</pre>
              {logConnectionState === 'disconnected' && (
                <button
                  type="button"
                  onClick={() => setLogConnectionRevision((current) => current + 1)}
                >ログを再接続</button>
              )}
            </section>
          )}
        </>
      )}

      {error && <p className="error-message">{error}</p>}
      {themeNavigation('下部')}
    </Layout>
  );
}
