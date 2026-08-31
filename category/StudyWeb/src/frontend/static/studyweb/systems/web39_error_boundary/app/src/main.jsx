import React, { Component, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createErrorRecord } from './errorLog.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[web39] 保護対象の描画中にエラーが発生しました。', createErrorRecord(error, info.componentStack));
  }

  reset = () => {
    this.props.onReset();
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fallback" role="alert">
          <h2>画面の一部を表示できませんでした</h2>
          <p>入力内容は変更せず、もう一度表示してください。</p>
          <button type="button" onClick={this.reset}>もう一度表示する</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedPanel({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('画面表示中に発生した想定エラー');
  }
  return <div className="normal"><h2>正常表示</h2><p>この領域はError Boundaryで保護されています。</p></div>;
}

function App() {
  const [shouldThrow, setShouldThrow] = useState(false);
  return (
    <>
      <h1>画面エラーからの復旧</h1>
      <p>見出しと操作は保護領域の外にあるため、パネルの描画に失敗しても残ります。</p>
      <div className="actions">
        <button type="button" onClick={() => setShouldThrow(false)}>正常表示</button>
        <button type="button" onClick={() => setShouldThrow(true)}>エラーを発生させる</button>
      </div>
      <ErrorBoundary onReset={() => setShouldThrow(false)}>
        <ProtectedPanel shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </>
  );
}

createRoot(document.querySelector('#app')).render(<App />);
