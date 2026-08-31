(function exposePresentationBuilder(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PresentationBuilder = api;
}(globalThis, function createPresentationBuilder() {
  const sampleInput = Object.freeze({
    title: 'StudyHubのAPI状態コード教材',
    audience: 'Web開発を学ぶ人',
    problem: 'APIの成功と失敗を、状態コードと応答内容を対応付けて確認しにくい',
    mainFlow: '教材を起動し、状態コード別の操作を選んで応答を比較する',
    components: 'StudyHubのテーマ画面、Node.jsのサンプルAPI、12種類のAPI操作',
    verified: 'サンプルAPIの12操作を実行し、200を含む11種類の状態コードが期待どおり返ることを確認した',
    evidence: 'テーマ画面の操作一覧\n状態コード別のAPI応答\n全テストの実行結果',
    limitation: '認証は固定値による学習用の処理で、本番用の認証基盤は接続していない',
    nextStep: '利用者が入力したヘッダーや本文でも状態コードを比較できるようにする'
  });

  const normalize = (value) => String(value ?? '').trim().replaceAll(/\s+/g, ' ');

  function normalizeInput(input) {
    return {
      title: normalize(input.title),
      audience: normalize(input.audience),
      problem: normalize(input.problem),
      mainFlow: normalize(input.mainFlow),
      components: normalize(input.components),
      verified: normalize(input.verified),
      evidence: String(input.evidence ?? '')
        .split(/\r?\n/)
        .map(normalize)
        .filter(Boolean)
        .slice(0, 3),
      limitation: normalize(input.limitation),
      nextStep: normalize(input.nextStep)
    };
  }

  function validatePresentationInput(input) {
    const normalized = normalizeInput(input);
    const labels = {
      title: '成果物の名前',
      audience: '想定する聞き手',
      problem: '解決する問題',
      mainFlow: '利用者が行う主な操作',
      components: '主な構成',
      verified: '確認できた事実',
      limitation: '現在の制限',
      nextStep: '次に改善すること'
    };
    const missing = Object.entries(labels)
      .filter(([key]) => !normalized[key])
      .map(([, label]) => label);
    if (normalized.evidence.length === 0) missing.push('見せる証拠');
    return { ok: missing.length === 0, missing, input: normalized };
  }

  function buildPresentationArtifacts(rawInput) {
    const validation = validatePresentationInput(rawInput);
    if (!validation.ok) return validation;
    const input = validation.input;
    const evidenceList = input.evidence.map((item, index) => `${index + 1}. ${item}`).join('\n');

    const sixty = [
      `「${input.title}」は、${input.audience}が抱える「${input.problem}」を扱う成果物です。`,
      `主な操作は、${input.mainFlow}ことです。`,
      `構成は、${input.components}です。`,
      `確認できた事実は、${input.verified}ことです。`,
      `現在の制限は、${input.limitation}ことです。次は、${input.nextStep}予定です。`
    ].join('\n\n');

    const three = [
      '【問題と対象】',
      `${input.audience}にとって、${input.problem}という問題があります。`,
      '',
      '【作ったものと操作】',
      `そこで「${input.title}」を作りました。${input.mainFlow}ことで結果を確認できます。`,
      '',
      '【構成】',
      input.components,
      '',
      '【確認した事実】',
      input.verified,
      evidenceList,
      '',
      '【制限と次の改善】',
      `現在の制限は、${input.limitation}ことです。次は、${input.nextStep}予定です。`
    ].join('\n');

    const five = [
      three,
      '',
      '【設計上の説明】',
      `利用者の操作と確認結果が結び付くように、${input.components}という構成にしました。`,
      '',
      '【失敗時に説明すること】',
      '想定どおりに動かなかった場合は、操作、入力、ログ、実行結果の順に事実を示します。原因を推測で断定しません。',
      '',
      '【まとめ】',
      `「${input.title}」について、実装済みの範囲、確認した事実、未確認の範囲を分けて説明しました。`
    ].join('\n');

    const recording = [
      '1. 成果物名と解決する問題を表示する',
      `2. 主な操作を見せる: ${input.mainFlow}`,
      `3. 構成を示す: ${input.components}`,
      `4. 証拠を最大3件見せる:\n${evidenceList}`,
      `5. 制限と次の改善を表示する: ${input.limitation} / ${input.nextStep}`
    ].join('\n\n');

    return { ok: true, input, sixty, three, five, recording };
  }

  return { sampleInput, normalizeInput, validatePresentationInput, buildPresentationArtifacts };
}));
