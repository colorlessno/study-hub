from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class LearningSystem:
    system_id: str
    title: str
    category: str
    default_input: dict
    observation_hint: str
    samples: tuple[dict, ...] = ()


SYSTEMS: dict[str, LearningSystem] = {
    "system17": LearningSystem(
        "system17",
        "トークン分割の観察",
        "tokenizer",
        {"text": "注文キャンセルの締切はいつですか？\nOrder cancellation deadline?", "context_limit": 32},
        "文字数、推定トークン数、入力上限を比較します。",
        (
            {"id": "japanese", "label": "日本語", "input": {"text": "注文キャンセルの締切はいつですか？", "context_limit": 32}},
            {"id": "english", "label": "英語", "input": {"text": "When is the order cancellation deadline?", "context_limit": 32}},
            {"id": "symbols", "label": "記号と改行", "input": {"text": "注文ID: A-1024\n状態: canceled!", "context_limit": 16}},
            {"id": "mixed", "label": "日本語と英語", "input": {"text": "注文キャンセルの締切はいつですか？\nOrder cancellation deadline?", "context_limit": 32}},
        ),
    ),
    "system18": LearningSystem(
        "system18",
        "文章の類似検索",
        "embedding",
        {
            "query": "商品を返したい",
            "documents": ["返品の手続きを案内します", "荷物の配送状況を確認します", "請求書を再発行します", "購入を取り消したい"],
            "top_k": 4,
        },
        "LM StudioのEmbeddingモデルで文章をベクトル化し、cosine類似度と検索順位を比較します。",
        (
            {
                "id": "paraphrase",
                "label": "言い換えを検索",
                "input": {
                    "query": "商品を返したい",
                    "documents": ["返品の手続きを案内します", "荷物の配送状況を確認します", "請求書を再発行します", "購入を取り消したい"],
                    "top_k": 4,
                },
            },
            {
                "id": "unrelated",
                "label": "関係のない文章を比較",
                "input": {
                    "query": "パスワードを変更したい",
                    "documents": ["ログイン情報を更新します", "配送状況を確認します", "返品の手続きを案内します"],
                    "top_k": 3,
                },
            },
        ),
    ),
    "system19": LearningSystem(
        "system19",
        "Attentionの関係表示",
        "attention",
        {"sentence": "赤い 商品 は 売り切れた 。 それ を 顧客 が 予約 した", "focus_token_index": 5},
        "位置・同一語・指示語・修飾語を使った疑似スコアで単語同士の関係を比較します。",
    ),
    "system20": LearningSystem(
        "system20",
        "コンテキスト上限の実験",
        "context",
        {
            "text": "返金期限は7日です。注文番号と購入日を確認し、受付窓口へ連絡してください。手続き完了後に結果を通知します。",
            "context_limit": 24,
            "important_marker": "返金期限は7日",
        },
        "重要情報の位置を変え、入力上限内に残る情報、上限外になる情報、回答可否を比較します。",
        (
            {
                "id": "short-baseline",
                "label": "短い文章",
                "input": {
                    "text": "返金期限は7日です。確認してください。",
                    "context_limit": 24,
                    "important_marker": "返金期限は7日",
                },
            },
            {
                "id": "important-first",
                "label": "重要情報が先頭",
                "input": {
                    "text": "返金期限は7日です。注文番号と購入日を確認し、受付窓口へ連絡してください。手続き完了後に結果を通知します。",
                    "context_limit": 24,
                    "important_marker": "返金期限は7日",
                },
            },
            {
                "id": "important-middle",
                "label": "重要情報が中央",
                "input": {
                    "text": "注文番号と購入日を確認してください。返金期限は7日です。受付窓口へ連絡し、手続き完了後に結果を通知します。",
                    "context_limit": 24,
                    "important_marker": "返金期限は7日",
                },
            },
            {
                "id": "important-last",
                "label": "重要情報が末尾",
                "input": {
                    "text": "注文番号と購入日を確認し、受付窓口へ連絡してください。手続き完了後に結果を通知します。返金期限は7日です。",
                    "context_limit": 24,
                    "important_marker": "返金期限は7日",
                },
            },
        ),
    ),
    "system21": LearningSystem(
        "system21",
        "生成のばらつき設定（Temperature）の比較",
        "generation",
        {
            "prompt": "返品を希望する顧客へ、確認事項と次の手順を含む返信文を作成してください。",
            "temperatures": [0.1, 0.7],
            "trial_count": 3,
            "mode": "model",
            "task_type": "fixed",
            "learning_note": {"observation": "", "decision": "", "risk_note": ""},
        },
        "同じ指示をLM Studioへ複数回送り、Temperatureごとの回答差と再現性を比較して結果を保存します。",
        (
            {
                "id": "fixed-model",
                "label": "定型業務を実モデルで比較",
                "input": {
                    "prompt": "返品を希望する顧客へ、確認事項と次の手順を含む返信文を作成してください。",
                    "temperatures": [0.1, 0.7],
                    "trial_count": 3,
                    "mode": "model",
                    "task_type": "fixed",
                    "learning_note": {"observation": "", "decision": "", "risk_note": ""},
                },
            },
            {
                "id": "creative-model",
                "label": "発想業務を実モデルで比較",
                "input": {
                    "prompt": "新しい定期購入サービスのキャッチコピーを一文で提案してください。",
                    "temperatures": [0.2, 0.9],
                    "trial_count": 3,
                    "mode": "model",
                    "task_type": "creative",
                    "learning_note": {"observation": "", "decision": "", "risk_note": ""},
                },
            },
            {
                "id": "offline-mock",
                "label": "明示的なモックで画面確認",
                "input": {
                    "prompt": "問い合わせへの返信文を作成してください。",
                    "temperatures": [0.1, 0.7],
                    "trial_count": 3,
                    "mode": "mock",
                    "task_type": "fixed",
                    "learning_note": {"observation": "モックの表示構造を確認", "decision": "", "risk_note": "実モデルの品質評価には使用しない"},
                },
            },
        ),
    ),
    "system22": LearningSystem(
        "system22",
        "RAGの文書分割比較",
        "chunking",
        {
            "document": "返品は商品到着から7日以内に申請します。返送品を確認した後、支払方法へ返金します。配送状況は注文番号で確認します。問い合わせには注文番号と商品名を記載します。",
            "question_set": [
                {"question": "返品を申請できる期間は？", "expected_terms": ["返品", "7日以内"]},
                {"question": "返金はいつ行われますか？", "expected_terms": ["返送品", "確認", "返金"]},
            ],
            "chunk_configs": [
                {"id": "small", "label": "小さい分割", "chunk_size": 16, "overlap": 0},
                {"id": "balanced", "label": "中間の分割", "chunk_size": 36, "overlap": 8},
                {"id": "large", "label": "大きい分割", "chunk_size": 72, "overlap": 12},
            ],
            "learning_note": {"observation": "", "decision": "", "risk_note": ""},
        },
        "同じ文書と固定質問を複数の分割条件で検索し、根拠の分断、回答範囲、検索順位を比較します。",
        (
            {
                "id": "size-comparison",
                "label": "小・中・大を比較",
                "input": {
                    "document": "返品は商品到着から7日以内に申請します。返送品を確認した後、支払方法へ返金します。配送状況は注文番号で確認します。問い合わせには注文番号と商品名を記載します。",
                    "question_set": [
                        {"question": "返品を申請できる期間は？", "expected_terms": ["返品", "7日以内"]},
                        {"question": "返金はいつ行われますか？", "expected_terms": ["返送品", "確認", "返金"]},
                    ],
                    "chunk_configs": [
                        {"id": "small", "label": "小さい分割", "chunk_size": 16, "overlap": 0},
                        {"id": "balanced", "label": "中間の分割", "chunk_size": 36, "overlap": 8},
                        {"id": "large", "label": "大きい分割", "chunk_size": 72, "overlap": 12},
                    ],
                    "learning_note": {"observation": "根拠が分断される条件を確認", "decision": "", "risk_note": "文字単位の簡易検索である"},
                },
            },
            {
                "id": "overlap-comparison",
                "label": "重複幅を比較",
                "input": {
                    "document": "返品は商品到着から7日以内に申請します。返送品を確認した後、支払方法へ返金します。配送状況は注文番号で確認します。問い合わせには注文番号と商品名を記載します。",
                    "question_set": [
                        {"question": "返品を申請できる期間は？", "expected_terms": ["返品", "7日以内"]},
                        {"question": "返金はいつ行われますか？", "expected_terms": ["返送品", "確認", "返金"]},
                    ],
                    "chunk_configs": [
                        {"id": "no-overlap", "label": "重複なし", "chunk_size": 28, "overlap": 0},
                        {"id": "with-overlap", "label": "重複あり", "chunk_size": 28, "overlap": 10},
                    ],
                    "learning_note": {"observation": "重複による根拠保持を確認", "decision": "", "risk_note": "分割数と保存量も増える"},
                },
            },
        ),
    ),
    "system23": LearningSystem(
        "system23",
        "検索結果の並べ替え比較",
        "reranker",
        {
            "query": "返金条件",
            "documents": [
                {"id": "refund-guide", "text": "返品と返金の一般的な手続きを案内します。"},
                {"id": "refund-policy", "text": "返金条件は商品到着から7日以内の申請と未使用であることです。"},
                {"id": "shipping-guide", "text": "配送状況は注文番号から確認できます。"},
                {"id": "account-guide", "text": "会員情報の変更方法を案内します。"},
            ],
            "initial_top_k": 4,
            "rerank_top_k": 3,
            "correct_document_id": "refund-policy",
            "mode": "model",
            "learning_note": {"observation": "", "decision": "", "risk_note": ""},
        },
        "LM StudioのEmbedding検索順位と、候補だけを再評価した順位を比べ、正解順位の改善、遅延、処理件数を確認します。",
        (
            {
                "id": "effective-model",
                "label": "Rerankerが有効な例（実Embedding）",
                "input": {
                    "query": "返金条件",
                    "documents": [
                        {"id": "refund-guide", "text": "返品と返金の一般的な手続きを案内します。"},
                        {"id": "refund-policy", "text": "返金条件は商品到着から7日以内の申請と未使用であることです。"},
                        {"id": "shipping-guide", "text": "配送状況は注文番号から確認できます。"},
                        {"id": "account-guide", "text": "会員情報の変更方法を案内します。"},
                    ],
                    "initial_top_k": 4,
                    "rerank_top_k": 3,
                    "correct_document_id": "refund-policy",
                    "mode": "model",
                    "learning_note": {"observation": "正解順位の変化を確認", "decision": "", "risk_note": "候補外の文書は再順位付けできない"},
                },
            },
            {
                "id": "unnecessary-mock",
                "label": "Rerankerが不要な例（明示的なモック）",
                "input": {
                    "query": "配送状況",
                    "documents": [
                        {"id": "shipping-guide", "text": "配送状況は注文番号から確認できます。"},
                        {"id": "refund-policy", "text": "返金条件は商品到着から7日以内です。"},
                        {"id": "account-guide", "text": "会員情報を変更できます。"},
                    ],
                    "initial_top_k": 3,
                    "rerank_top_k": 2,
                    "correct_document_id": "shipping-guide",
                    "mode": "mock",
                    "learning_note": {"observation": "初期検索ですでに正解1位", "decision": "Rerankerを省く判断も比較", "risk_note": "モックは実Embedding評価に使わない"},
                },
            },
        ),
    ),
    "system24": LearningSystem(
        "system24",
        "複数モデルの比較",
        "model_compare",
        {
            "prompt": "返品期限と返品条件を、根拠が分かるように簡潔に回答してください。",
            "models": [
                {
                    "id": "quality-local",
                    "model": "qwen3-27b-q4",
                    "label": "品質重視ローカルモデル",
                    "input_cost_per_million": 0,
                    "output_cost_per_million": 0,
                    "operational_note": "LM Studioへ対象モデルを読み込んでから実行する",
                    "mock_response": "返品は商品到着から7日以内で、未使用の場合に受け付けます。",
                },
                {
                    "id": "compact-local",
                    "model": "qwen3-8b-q4",
                    "label": "軽量ローカルモデル",
                    "input_cost_per_million": 0,
                    "output_cost_per_million": 0,
                    "operational_note": "比較時は同じLM Studio設定と端末を使う",
                    "mock_response": "返品期限は7日以内です。",
                },
            ],
            "evaluation_rubric": {
                "required_terms": ["7日以内", "未使用"],
                "max_length": 180,
                "coverage_weight": 0.8,
                "conciseness_weight": 0.2,
            },
            "priority": "balanced",
            "temperature": 0.2,
            "mode": "model",
            "learning_note": {"observation": "", "decision": "", "risk_note": "別の評価データでも確認する"},
        },
        "同じ指示と評価基準で複数モデルへ実通信し、回答品質、実測応答時間、推定費用、運用条件を比較します。",
        samples=(
            {
                "id": "actual-models",
                "label": "実モデルを比較",
                "input": {"mode": "model", "priority": "balanced"},
            },
            {
                "id": "offline-mock",
                "label": "比較手順を確認（明示的なモック）",
                "input": {"mode": "mock", "priority": "quality"},
            },
        ),
    ),
    "system25": LearningSystem(
        "system25",
        "出力上限とTemperatureの比較",
        "output_control",
        {
            "prompt": "返品の条件、申請手順、注意点を順序立てて詳しく説明してください。",
            "model": "qwen3-27b-q4",
            "max_tokens_values": [32, 128],
            "temperatures": [0.2, 0.8],
            "trial_count": 2,
            "mode": "model",
            "learning_note": {"observation": "", "decision": "", "risk_note": "長い上限は費用と応答時間も確認する"},
        },
        "同じ指示を実モデルへ送り、出力上限とTemperatureの組合せごとに回答、途中切れ、ばらつき、トークン数、応答時間を比較します。",
        samples=(
            {"id": "token-limit", "label": "出力上限の影響を比較（実モデル）", "input": {"mode": "model", "temperatures": [0.2]}},
            {"id": "temperature", "label": "Temperatureの影響を比較（実モデル）", "input": {"mode": "model", "max_tokens_values": [96]}},
            {"id": "offline-mock", "label": "比較手順を確認（明示的なモック）", "input": {"mode": "mock"}},
        ),
    ),
    "system26": LearningSystem(
        "system26",
        "量子化方式の比較",
        "quantization",
        {
            "prompt": "返品条件を初めて利用する人向けに、期限、商品の状態、申請手順を説明してください。",
            "quantization_profiles": [
                {
                    "id": "q4",
                    "model": "qwen3-27b-q4",
                    "label": "Q4",
                    "quantization": "4bit",
                    "mock_response": "返品期限は7日以内です。",
                },
                {
                    "id": "q5",
                    "model": "qwen3-27b-q5",
                    "label": "Q5",
                    "quantization": "5bit",
                    "mock_response": "返品期限は7日以内で、商品が未使用であることを確認して申請します。",
                },
                {
                    "id": "q8",
                    "model": "qwen3-27b-q8",
                    "label": "Q8",
                    "quantization": "8bit",
                    "mock_response": "返品期限は7日以内です。商品が未使用であることを確認し、注文番号と返品理由を添えて申請します。",
                },
            ],
            "runtime_metrics": [
                {"profile_id": "q4", "memory_mb": 8_000, "mock_elapsed_ms": 500, "environment_note": "同一PC・同一コンテキスト長"},
                {"profile_id": "q5", "memory_mb": 10_000, "mock_elapsed_ms": 700, "environment_note": "同一PC・同一コンテキスト長"},
                {"profile_id": "q8", "memory_mb": 14_000, "mock_elapsed_ms": 1_000, "environment_note": "同一PC・同一コンテキスト長"},
            ],
            "evaluation_rubric": {
                "required_terms": ["7日以内", "未使用", "注文番号"],
                "max_length": 180,
                "coverage_weight": 0.8,
                "conciseness_weight": 0.2,
            },
            "selection_priority": "balanced",
            "temperature": 0.2,
            "mode": "mock",
            "learning_note": {"observation": "", "decision": "", "risk_note": "別の指示でも比較する"},
        },
        "同じ指示と評価条件で量子化モデルを実行し、回答、応答時間、メモリ使用量、品質点を比較して結果を保存します。",
        samples=(
            {"id": "offline-mock", "label": "比較手順を確認（明示的なモック）", "input": {"mode": "mock"}},
            {"id": "actual-models", "label": "実モデルを比較（モデル名を確認）", "input": {"mode": "model"}},
            {"id": "quality-priority", "label": "品質を優先して比較", "input": {"mode": "mock", "selection_priority": "quality"}},
            {"id": "memory-priority", "label": "メモリ使用量を優先して比較", "input": {"mode": "mock", "selection_priority": "memory"}},
        ),
    ),
    "system27": LearningSystem(
        "system27",
        "画像サイズとVLM評価の比較",
        "vlm",
        {
            "mode": "mock",
            "model": "qwen/qwen3.8-27b",
            "task_prompt": "画像に書かれた返品条件を日本語で説明してください。",
            "sample_image": {
                "title": "RETURN POLICY",
                "lines": ["LIMIT: 7 DAYS", "CONDITION: UNUSED", "REQUEST: ORDER ID"],
            },
            "image_variants": [
                {"id": "small", "label": "小さい画像", "width": 320, "jpeg_quality": 50},
                {"id": "medium", "label": "中サイズ画像", "width": 640, "jpeg_quality": 75},
                {"id": "large", "label": "大きい画像", "width": 1280, "jpeg_quality": 90},
            ],
            "expected_points": ["7日以内", "未使用", "注文番号"],
            "mock_responses": {
                "small": "返品期限は7日以内です。",
                "medium": "返品期限は7日以内で、未使用の商品が対象です。",
                "large": "返品期限は7日以内で、未使用の商品を注文番号とともに申請します。",
            },
            "learning_note": {
                "observation": "小さい画像ほど文字の読み落としが増えるかを比較する。",
                "decision": "必要な項目を維持できる最小サイズを候補にする。",
                "risk_note": "モック結果を実VLMの性能とみなさない。",
            },
        },
        "同じ画像を実際に縮小・JPEG圧縮し、実VLMまたは明示的なモックで回答と読み落としを比較します。",
        samples=(
            {"id": "mock", "label": "明示的なモックで画面と評価手順を確認", "input": {"mode": "mock"}},
            {"id": "model", "label": "LM StudioのVLMへ実画像を送信", "input": {"mode": "model"}},
        ),
    ),
    "system28": LearningSystem(
        "system28",
        "OCR文字列の正規化",
        "ocr_normalize",
        {
            "ocr_text": "TEL O3-1234-５６７８  返晶　期限",
            "rules": ["space", "zenkaku", "dictionary", "ocr_o_zero"],
            "correction_dictionary": {"返晶": "返品"},
        },
        "OCR文字列へ規則と誤認識辞書を順番に適用し、自動補正と人手確認の境界を差分で確認します。",
        samples=(
            {"id": "all", "label": "全規則を適用して差分と要確認箇所を確認", "input": {}},
            {
                "id": "safe-only",
                "label": "英字Oの補正を外して自動補正だけを確認",
                "input": {"rules": ["space", "zenkaku", "dictionary"]},
            },
        ),
    ),
    "system29": LearningSystem(
        "system29",
        "文書断片のメタデータ設計",
        "metadata",
        {
            "document": "返品規定\n返品期限は商品到着後7日以内です。",
            "query": "返品期限",
            "metadata": {
                "source": "policy.md",
                "page": 1,
                "section": "返品条件",
                "permission": "internal",
                "updated_at": "2026-08-20T09:00:00+09:00",
            },
            "metadata_filter": {"permission": "internal"},
            "learning_note": {
                "observation": "検索結果から出典、ページ、章、公開範囲、更新日時をたどれるか確認する。",
                "decision": "根拠追跡と権限制御に使う項目を文書断片へ保持する。",
                "risk_note": "公開範囲の値を付けるだけでは認可にならないため、検索前のフィルタを必須にする。",
            },
        },
        "文書断片へ追跡用metadataを付け、バックエンドの検索前フィルタと根拠表示を確認して結果を保存します。",
        samples=(
            {"id": "matched", "label": "公開範囲が一致する検索結果と根拠を確認", "input": {}},
            {
                "id": "permission-excluded",
                "label": "公開範囲が一致せず検索対象外になる結果を確認",
                "input": {"metadata_filter": {"permission": "public"}},
            },
            {
                "id": "updated-excluded",
                "label": "更新日時フィルタより古い文書が対象外になる結果を確認",
                "input": {"metadata_filter": {"updated_after": "2026-09-01T00:00:00+09:00"}},
            },
        ),
    ),
    "system30": LearningSystem(
        "system30",
        "重複文書の検出",
        "duplicate",
        {
            "documents": [
                {
                    "document_id": "returns-v1",
                    "title": "返品条件",
                    "version": "1.0",
                    "text": "返品期限は商品到着後7日以内です。未使用の商品を受け付けます。",
                },
                {
                    "document_id": "returns-v2",
                    "title": "返品条件",
                    "version": "2.0",
                    "text": "返品期限は商品到着後七日以内です。未使用の商品を受け付けます。",
                },
                {
                    "document_id": "returns-copy",
                    "title": "返品条件の複製",
                    "version": "1.0-copy",
                    "text": "返品期限は商品到着後7日以内です。未使用の商品を受け付けます。",
                },
                {
                    "document_id": "shipping-v1",
                    "title": "配送条件",
                    "version": "1.0",
                    "text": "通常配送は注文から3営業日以内に発送します。",
                },
            ],
            "query": "返品期限",
            "similarity_threshold": 0.75,
            "resolution": {
                "action": "prefer",
                "preferred_document_id": "returns-v2",
                "excluded_document_ids": ["returns-copy"],
                "decision_note": "最新版を優先し、内容が完全一致する複製を登録対象から外す。",
            },
            "learning_note": {
                "observation": "完全一致、版違い、候補外が判定結果で区別されるか確認する。",
                "decision": "重複候補を自動削除せず、優先文書と除外文書を記録する。",
                "risk_note": "文字列類似だけでは意味上の同一性を確定できないため、最終判断は人が行う。",
            },
        },
        "完全一致・版違い・類似文書を検出し、優先文書と除外判断、検索偏り、保存履歴を確認します。",
        samples=(
            {"id": "review-and-resolve", "label": "重複候補を検出して優先・除外判断を記録", "input": {}},
            {
                "id": "strict-threshold",
                "label": "しきい値を上げて完全一致だけを候補にする",
                "input": {
                    "similarity_threshold": 0.99,
                    "resolution": {
                        "action": "review",
                        "preferred_document_id": "",
                        "excluded_document_ids": [],
                        "decision_note": "しきい値変更後の候補を目視確認する。",
                    },
                },
            },
            {
                "id": "no-candidates",
                "label": "異なる文書だけを比較して候補なしを確認",
                "input": {
                    "documents": [
                        {"document_id": "returns", "title": "返品条件", "version": "1.0", "text": "返品期限は7日以内です。"},
                        {"document_id": "shipping", "title": "配送条件", "version": "1.0", "text": "通常配送は3営業日以内です。"},
                    ],
                    "query": "返品期限",
                    "resolution": {
                        "action": "review",
                        "preferred_document_id": "",
                        "excluded_document_ids": [],
                        "decision_note": "候補なしを確認する。",
                    },
                },
            },
        ),
    ),
    "system31": LearningSystem(
        "system31",
        "評価用正解データの作成",
        "ground_truth",
        {
            "dataset_name": "support-ground-truth-v1",
            "source_document": {
                "document_id": "returns-policy",
                "title": "返品条件",
                "version": "2.0",
                "text": "返品は商品到着後7日以内に申請してください。未使用の商品を対象とします。",
            },
            "question": "返品期限は？",
            "expected_answer": "商品到着後7日以内",
            "evidence": [
                {
                    "document_id": "returns-policy",
                    "quote": "返品は商品到着後7日以内に申請してください。",
                }
            ],
            "evaluation_viewpoints": [
                {
                    "viewpoint_id": "correctness",
                    "label": "正確性",
                    "description": "期待する回答の内容と一致しているか確認する。",
                    "weight": 0.5,
                },
                {
                    "viewpoint_id": "groundedness",
                    "label": "根拠性",
                    "description": "回答が登録した根拠文で裏付けられるか確認する。",
                    "weight": 0.5,
                },
            ],
            "review": {
                "status": "approved",
                "reviewer": "学習者",
                "comment": "質問、正解、根拠、評価観点を確認した。",
            },
            "learning_note": {
                "observation": "正解だけでなく、根拠と採点観点を固定する。",
                "decision": "評価実行前に人が内容を確認して承認する。",
                "risk_note": "文書改訂時は正解データと根拠の再確認が必要になる。",
            },
        },
        "質問、期待する回答、根拠文書、評価観点、レビュー履歴を一つの正解データとして固定し、保存後に再利用できることを確認します。",
        samples=(
            {"id": "approved-case", "label": "根拠付きの正解データを承認して保存", "input": {}},
            {
                "id": "missing-evidence",
                "label": "根拠なしの下書きを作り不足を確認",
                "input": {
                    "evidence": [],
                    "review": {"status": "draft", "reviewer": "", "comment": "根拠を追加してから承認する。"},
                },
            },
            {
                "id": "unmatched-evidence",
                "label": "文書に存在しない根拠を指定して差戻し",
                "input": {
                    "evidence": [{"document_id": "returns-policy", "quote": "返品期限は30日以内です。"}],
                    "review": {"status": "rejected", "reviewer": "レビュー担当", "comment": "原文と一致しないため差し戻す。"},
                },
            },
        ),
    ),
    "system32": LearningSystem(
        "system32",
        "RAG評価セットの実行",
        "rag_eval",
        {
            "dataset_name": "support-rag-evaluation-v1",
            "run_label": "baseline",
            "rag_config": {
                "retriever_version": "support-search-v1",
                "generator_version": "support-answer-v1",
                "prompt_version": "support-prompt-v1",
                "top_k": 3,
            },
            "ground_truth_cases": [
                {
                    "case_id": "case-returns",
                    "question": "返品期限は？",
                    "expected_answer": "商品到着後7日以内",
                    "expected_evidence_ids": ["returns-policy"],
                    "retrieval_results": ["returns-policy", "shipping-guide", "payment-faq"],
                    "generated_answer": "返品期限は商品到着後7日以内です。",
                },
                {
                    "case_id": "case-shipping",
                    "question": "通常配送の日数は？",
                    "expected_answer": "3営業日",
                    "expected_evidence_ids": ["shipping-guide"],
                    "retrieval_results": ["payment-faq", "returns-policy", "account-guide"],
                    "generated_answer": "通常配送は3営業日です。",
                },
                {
                    "case_id": "case-refund",
                    "question": "使用済み商品の返金は可能ですか？",
                    "expected_answer": "返金対象外",
                    "expected_evidence_ids": ["returns-policy"],
                    "retrieval_results": ["returns-policy", "payment-faq", "shipping-guide"],
                    "generated_answer": "使用済みの商品も返金できます。",
                },
            ],
            "learning_note": {
                "observation": "検索失敗と生成失敗は同じ正答率だけでは区別できない。",
                "decision": "検索結果と生成回答をケース単位で保存し、失敗箇所を分けて集計する。",
                "risk_note": "評価セットやRAG設定を変更した実行は、同じ基準の比較として扱えない。",
            },
        },
        "固定した正解データとRAG設定に対する検索結果・回答結果を保存し、検索失敗と生成失敗、前回実行との差を分けて確認します。",
        samples=(
            {"id": "baseline", "label": "基準実行を保存", "input": {}},
            {
                "id": "retrieval-regression",
                "label": "検索結果を悪化させて前回との差を確認",
                "input": {
                    "run_label": "retrieval-regression",
                    "ground_truth_cases": [
                        {
                            "case_id": "case-returns",
                            "question": "返品期限は？",
                            "expected_answer": "商品到着後7日以内",
                            "expected_evidence_ids": ["returns-policy"],
                            "retrieval_results": ["account-guide", "shipping-guide", "payment-faq"],
                            "generated_answer": "返品期限は商品到着後7日以内です。",
                        },
                        {
                            "case_id": "case-shipping",
                            "question": "通常配送の日数は？",
                            "expected_answer": "3営業日",
                            "expected_evidence_ids": ["shipping-guide"],
                            "retrieval_results": ["payment-faq", "returns-policy", "account-guide"],
                            "generated_answer": "通常配送は3営業日です。",
                        },
                        {
                            "case_id": "case-refund",
                            "question": "使用済み商品の返金は可能ですか？",
                            "expected_answer": "返金対象外",
                            "expected_evidence_ids": ["returns-policy"],
                            "retrieval_results": ["returns-policy", "payment-faq", "shipping-guide"],
                            "generated_answer": "使用済みの商品は返金対象外です。",
                        },
                    ],
                },
            },
            {
                "id": "generation-regression",
                "label": "回答を悪化させて生成失敗を確認",
                "input": {
                    "run_label": "generation-regression",
                    "ground_truth_cases": [
                        {
                            "case_id": "case-returns",
                            "question": "返品期限は？",
                            "expected_answer": "商品到着後7日以内",
                            "expected_evidence_ids": ["returns-policy"],
                            "retrieval_results": ["returns-policy", "shipping-guide", "payment-faq"],
                            "generated_answer": "返品期限は30日以内です。",
                        },
                        {
                            "case_id": "case-shipping",
                            "question": "通常配送の日数は？",
                            "expected_answer": "3営業日",
                            "expected_evidence_ids": ["shipping-guide"],
                            "retrieval_results": ["shipping-guide", "returns-policy", "account-guide"],
                            "generated_answer": "通常配送の日数は確認できません。",
                        },
                        {
                            "case_id": "case-refund",
                            "question": "使用済み商品の返金は可能ですか？",
                            "expected_answer": "返金対象外",
                            "expected_evidence_ids": ["returns-policy"],
                            "retrieval_results": ["returns-policy", "payment-faq", "shipping-guide"],
                            "generated_answer": "使用済みの商品も返金できます。",
                        },
                    ],
                },
            },
        ),
    ),
    "system33": LearningSystem(
        "system33",
        "検索評価の実行",
        "retrieval_eval",
        {
            "evaluation_name": "support-retrieval-evaluation",
            "chunk_setting": "500文字・100文字重複",
            "top_k": 3,
            "query_cases": [
                {
                    "case_id": "case-returns",
                    "question": "返品期限は？",
                    "expected_evidence": ["returns-policy"],
                    "retrieval_results": ["returns-policy", "shipping-guide", "payment-faq"],
                },
                {
                    "case_id": "case-shipping",
                    "question": "通常配送の日数は？",
                    "expected_evidence": ["shipping-guide"],
                    "retrieval_results": ["payment-faq", "returns-policy", "shipping-guide"],
                },
                {
                    "case_id": "case-payment",
                    "question": "利用できる支払方法は？",
                    "expected_evidence": ["payment-faq", "card-guide"],
                    "retrieval_results": ["payment-faq", "account-guide", "shipping-guide", "card-guide"],
                },
            ],
            "learning_note": {
                "observation": "同じ検索結果でもtop-kによってHitとRecallが変わる。",
                "decision": "検索失敗をケース別に確認してから、chunk設定の変更効果を比較する。",
                "risk_note": "評価ケースが少ない場合、指標が実運用の検索品質を代表しない。",
            },
        },
        "複数の質問について順位付き検索結果を正解文書と照合し、検索指標、失敗ケース、chunk設定変更による差を保存して確認します。",
        samples=(
            {"id": "baseline", "label": "既定の検索結果を評価", "input": {}},
            {
                "id": "smaller-chunks",
                "label": "小さいchunk設定と検索結果を比較",
                "input": {
                    "chunk_setting": "250文字・50文字重複",
                    "query_cases": [
                        {
                            "case_id": "case-returns",
                            "question": "返品期限は？",
                            "expected_evidence": ["returns-policy"],
                            "retrieval_results": ["shipping-guide", "returns-policy", "payment-faq"],
                        },
                        {
                            "case_id": "case-shipping",
                            "question": "通常配送の日数は？",
                            "expected_evidence": ["shipping-guide"],
                            "retrieval_results": ["shipping-guide", "payment-faq", "returns-policy"],
                        },
                        {
                            "case_id": "case-payment",
                            "question": "利用できる支払方法は？",
                            "expected_evidence": ["payment-faq", "card-guide"],
                            "retrieval_results": ["payment-faq", "card-guide", "account-guide"],
                        },
                    ],
                },
            },
            {
                "id": "retrieval-failure",
                "label": "正解文書が上位にない失敗を確認",
                "input": {
                    "chunk_setting": "500文字・100文字重複（検索失敗例）",
                    "query_cases": [
                        {
                            "case_id": "case-returns",
                            "question": "返品期限は？",
                            "expected_evidence": ["returns-policy"],
                            "retrieval_results": ["shipping-guide", "payment-faq", "account-guide"],
                        }
                    ],
                },
            },
        ),
    ),
    "system34": LearningSystem(
        "system34",
        "回答内容の評価",
        "answer_eval",
        {
            "evaluation_name": "返品回答の評価",
            "question": "商品の返品期限と条件は？",
            "expected_answer": "商品到着後7日以内で、未使用品に限り返品できます。",
            "expected_points": [
                {
                    "point_id": "deadline",
                    "label": "返品期限",
                    "required_terms": ["7日以内"],
                    "contradiction_terms": ["30日以内"],
                },
                {
                    "point_id": "condition",
                    "label": "返品条件",
                    "required_terms": ["未使用"],
                    "contradiction_terms": ["使用済みでも"],
                },
            ],
            "evidence": [
                {
                    "evidence_id": "returns-policy",
                    "text": "返品は商品到着後7日以内で、未使用品に限り受け付けます。",
                }
            ],
            "generated_answer": "返品は商品到着後7日以内で受け付けます。商品が未使用の場合に限ります。",
            "answer_claims": [
                {
                    "claim_id": "claim-deadline",
                    "text": "返品は商品到着後7日以内で受け付けます。",
                    "evidence_ids": ["returns-policy"],
                    "expected_point_ids": ["deadline"],
                    "support_terms": ["7日以内"],
                },
                {
                    "claim_id": "claim-condition",
                    "text": "商品が未使用の場合に限ります。",
                    "evidence_ids": ["returns-policy"],
                    "expected_point_ids": ["condition"],
                    "support_terms": ["未使用"],
                },
            ],
            "learning_note": {
                "observation": "必要な回答要素と根拠の対応を分けて確認する。",
                "decision": "正確性、根拠性、網羅性、簡潔性を同じ条件で比較する。",
                "risk_note": "単語一致による判定なので、意味上の正しさは評価結果と根拠を見て確認する。",
            },
        },
        "質問・期待する回答・根拠・回答内の主張を照合し、正確性、根拠性、網羅性、簡潔性と要改善箇所を保存します。",
        samples=(
            {"id": "acceptable", "label": "必要事項を満たす回答", "input": {}},
            {
                "id": "insufficient",
                "label": "回答不足を確認",
                "input": {
                    "generated_answer": "返品は商品到着後7日以内で受け付けます。",
                    "answer_claims": [
                        {
                            "claim_id": "claim-deadline",
                            "text": "返品は商品到着後7日以内で受け付けます。",
                            "evidence_ids": ["returns-policy"],
                            "expected_point_ids": ["deadline"],
                            "support_terms": ["7日以内"],
                        }
                    ],
                },
            },
            {
                "id": "unsupported",
                "label": "根拠のない主張を確認",
                "input": {
                    "generated_answer": "返品は商品到着後7日以内で受け付けます。商品が未使用の場合に限ります。返送料は無料です。",
                    "answer_claims": [
                        {
                            "claim_id": "claim-deadline",
                            "text": "返品は商品到着後7日以内で受け付けます。",
                            "evidence_ids": ["returns-policy"],
                            "expected_point_ids": ["deadline"],
                            "support_terms": ["7日以内"],
                        },
                        {
                            "claim_id": "claim-condition",
                            "text": "商品が未使用の場合に限ります。",
                            "evidence_ids": ["returns-policy"],
                            "expected_point_ids": ["condition"],
                            "support_terms": ["未使用"],
                        },
                        {
                            "claim_id": "claim-shipping-fee",
                            "text": "返送料は無料です。",
                            "evidence_ids": [],
                            "expected_point_ids": [],
                            "support_terms": ["返送料は無料"],
                        },
                    ],
                },
            },
            {
                "id": "excessive",
                "label": "不要な補足を確認",
                "input": {
                    "evidence": [
                        {
                            "evidence_id": "returns-policy",
                            "text": "返品は商品到着後7日以内で、未使用品に限り受け付けます。",
                        },
                        {
                            "evidence_id": "packing-guide",
                            "text": "返送には購入時の箱を使用できます。",
                        },
                    ],
                    "generated_answer": "返品は商品到着後7日以内で受け付けます。商品が未使用の場合に限ります。返送には購入時の箱を使用できます。",
                    "answer_claims": [
                        {
                            "claim_id": "claim-deadline",
                            "text": "返品は商品到着後7日以内で受け付けます。",
                            "evidence_ids": ["returns-policy"],
                            "expected_point_ids": ["deadline"],
                            "support_terms": ["7日以内"],
                        },
                        {
                            "claim_id": "claim-condition",
                            "text": "商品が未使用の場合に限ります。",
                            "evidence_ids": ["returns-policy"],
                            "expected_point_ids": ["condition"],
                            "support_terms": ["未使用"],
                        },
                        {
                            "claim_id": "claim-packing",
                            "text": "返送には購入時の箱を使用できます。",
                            "evidence_ids": ["packing-guide"],
                            "expected_point_ids": [],
                            "support_terms": ["購入時の箱"],
                        },
                    ],
                },
            },
        ),
    ),
    "system35": LearningSystem(
        "system35",
        "Prompt A/B比較",
        "prompt_ab",
        {
            "experiment_name": "カスタマーサポートPrompt比較",
            "prompt_a": "質問に短く答えてください。",
            "prompt_b": "提示された根拠を明示し、質問に必要な情報を漏れなく簡潔に答えてください。",
            "fixed_conditions": {
                "model": "recorded-support-model",
                "temperature": 0.2,
                "max_tokens": 160,
                "dataset_version": "support-eval-v1",
            },
            "scoring_weights": {
                "correctness": 0.35,
                "groundedness": 0.25,
                "completeness": 0.25,
                "conciseness": 0.15,
            },
            "evaluation_cases": [
                {
                    "case_id": "case-returns",
                    "question": "商品の返品期限と条件は？",
                    "required_terms": ["7日以内", "未使用"],
                    "evidence_terms": ["返品規約"],
                    "forbidden_terms": ["30日以内"],
                    "max_answer_chars": 70,
                    "output_a": "返品は7日以内です。",
                    "output_b": "返品規約によると、商品到着後7日以内で、未使用品に限り返品できます。",
                },
                {
                    "case_id": "case-shipping",
                    "question": "通常配送には何日かかりますか？",
                    "required_terms": ["2〜3営業日"],
                    "evidence_terms": ["配送案内"],
                    "forbidden_terms": ["翌日必着"],
                    "max_answer_chars": 65,
                    "output_a": "通常配送は2〜3営業日です。",
                    "output_b": "配送案内によると、通常配送は2〜3営業日です。",
                },
                {
                    "case_id": "case-support-hours",
                    "question": "問い合わせ窓口の受付時間は？",
                    "required_terms": ["平日9時から18時"],
                    "evidence_terms": ["サポート案内"],
                    "forbidden_terms": ["24時間"],
                    "max_answer_chars": 45,
                    "output_a": "受付時間は平日9時から18時です。",
                    "output_b": "サポート案内では24時間対応です。",
                },
            ],
            "adoption_record": {
                "selected_variant": "B",
                "reason": "全体平均が高く、返品条件と配送根拠を明示できたため。",
                "risk_note": "受付時間のケースは悪化しているため、誤った回答を直してから採用する。",
            },
        },
        "同じ実行条件と評価ケースで記録した二つの回答を採点し、改善・悪化ケースとPromptの採用理由をJSONへ保存します。",
        samples=(
            {"id": "balanced", "label": "改善と悪化の両方を比較", "input": {}},
            {
                "id": "prompt-a-wins",
                "label": "Prompt Aが優れるケース",
                "input": {
                    "experiment_name": "誤回答を含むPrompt Bの比較",
                    "evaluation_cases": [
                        {
                            "case_id": "case-returns",
                            "question": "商品の返品期限は？",
                            "required_terms": ["7日以内"],
                            "evidence_terms": ["返品規約"],
                            "forbidden_terms": ["30日以内"],
                            "max_answer_chars": 55,
                            "output_a": "返品規約によると、返品は7日以内です。",
                            "output_b": "返品規約によると、返品は30日以内です。",
                        }
                    ],
                    "adoption_record": {
                        "selected_variant": "A",
                        "reason": "Prompt Bの回答に誤った期限が含まれたため。",
                        "risk_note": "評価ケースを増やして再確認する。",
                    },
                },
            },
            {
                "id": "tie",
                "label": "同点で採用を保留",
                "input": {
                    "experiment_name": "同一回答の比較",
                    "evaluation_cases": [
                        {
                            "case_id": "case-shipping",
                            "question": "通常配送には何日かかりますか？",
                            "required_terms": ["2〜3営業日"],
                            "evidence_terms": ["配送案内"],
                            "forbidden_terms": ["翌日必着"],
                            "max_answer_chars": 65,
                            "output_a": "配送案内によると、通常配送は2〜3営業日です。",
                            "output_b": "配送案内によると、通常配送は2〜3営業日です。",
                        }
                    ],
                    "adoption_record": {
                        "selected_variant": "保留",
                        "reason": "評価結果が同点のため、採用を決めない。",
                        "risk_note": "差が現れる評価ケースを追加する。",
                    },
                },
            },
        ),
    ),
    "system36": LearningSystem(
        "system36",
        "実行Traceの作成",
        "trace",
        {
            "trace_name": "返品期限回答の記録",
            "user_input": "返品期限は？",
            "retrieved_context": ["返品条件は7日以内"],
            "model_config": {"provider": "recorded", "model": "mock-model", "temperature": 0.2, "max_tokens": 160},
            "prompt": "検索根拠に基づいて、質問へ簡潔に答えてください。",
            "prompt_version": "support-v1",
            "output": "返品条件は7日以内です。",
            "evaluation": {
                "evaluation_id": "answer-eval-001",
                "status": "passed",
                "score": 1.0,
                "note": "検索根拠と回答内容が一致しています。",
            },
            "masking_policy": {"enabled": True, "replacement": "[MASKED]", "terms": []},
            "retention_note": "最新20件を学習用JSONへ保存します。",
        },
        "入力、検索根拠、モデル設定、Prompt、出力、評価を一つのTraceとしてマスク後にJSONへ保存し、一覧・詳細・再実行条件を確認します。",
        samples=(
            {"id": "complete", "label": "再実行できるTrace", "input": {}},
            {
                "id": "missing-fields",
                "label": "不足項目があるTrace",
                "input": {
                    "trace_name": "記録不足の回答",
                    "prompt": "",
                    "prompt_version": "",
                    "evaluation": {},
                },
            },
            {
                "id": "masked",
                "label": "機密値をマスクするTrace",
                "input": {
                    "trace_name": "連絡先を含む回答",
                    "user_input": "customer@example.comの返品期限は？",
                    "retrieved_context": ["customer@example.comの注文は返品条件の対象です。"],
                    "output": "customer@example.comの返品期限は7日以内です。",
                    "evaluation": {
                        "evaluation_id": "answer-eval-002",
                        "status": "passed",
                        "score": 1.0,
                        "note": "連絡先を除けば根拠と回答が一致しています。",
                    },
                    "masking_policy": {
                        "enabled": True,
                        "replacement": "[MASKED]",
                        "terms": ["customer@example.com"],
                    },
                },
            },
        ),
    ),
}
