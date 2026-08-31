# -*- coding: utf-8 -*-
"""
LM Studio プロンプト検証スクリプト(標準ライブラリのみ、pip不要)

5つのプロンプトを実際のワークフロー順に連結実行し、
JSON妥当性・件数・所要時間を自動チェックする。

使い方:
  python verify_prompts.py --check-only         # API接続なしで入力とpromptを静的検証
  python verify_prompts.py --connection-only    # モデル一覧取得まで確認して終了
  python verify_prompts.py                      # 全5ステップ連結実行
  python verify_prompts.py --steps mindmap,scamper
  python verify_prompts.py --model "qwen2.5-14b-instruct" --temperature 0.4

前提: LM Studio がモデルロード済みで起動していること(既定 http://localhost:1234/v1)
結果: verify/results/<日時>/ に raw応答・parse済みJSON・report.md を保存
"""
import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROMPT_DIR = HERE.parent / "prompts"
RESULT_BASE = HERE / "results"

STEP_ORDER = ["mindmap", "scamper", "persona", "six_hats", "reverse_plan"]
MINDMAP_CATEGORIES = ["関連性", "性質", "構成", "抽象化", "時間軸"]
SIX_HATS_KEYS = ["idea_id", "white", "red", "black", "yellow", "green", "blue", "purple", "scores", "improved_summary"]
SCORE_KEYS = ["feasibility", "market_need", "uniqueness", "profitability", "risk"]
PLAN_KEYS = ["idea_id", "final_goal", "milestones", "day1_actions", "week1_actions",
             "requirements", "first_hypothesis", "failure_points", "alternatives"]
BASE_INPUT_KEYS = ["theme", "background", "purpose", "constraints"]
EXPECTED_PLACEHOLDERS = {
    "mindmap": {"theme", "background", "purpose", "constraints"},
    "scamper": {"theme", "constraints", "mindmap_output"},
    "persona": {"theme", "constraints", "scamper_ideas"},
    "six_hats": {"theme", "constraints", "item"},
    "reverse_plan": {"theme", "constraints", "item"},
}
REQUIRED_PROMPT_SECTIONS = ["## 入力", "## 指示", "## 出力形式"]


def configure_utf8_output():
    """StudyHubへ渡す標準出力と標準エラーをUTF-8へ統一する"""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            reconfigure(encoding="utf-8", errors="replace")


def display_path(value):
    """テーマ内は相対パス、テーマ外はファイル名だけを表示する"""
    resolved = Path(value).resolve()
    try:
        return resolved.relative_to(HERE.parent).as_posix()
    except ValueError:
        return resolved.name


# ---------- HTTP ----------

def http_json(url, payload=None, timeout=600):
    if payload is None:
        req = urllib.request.Request(url)
    else:
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def chat(args, prompt):
    payload = {
        "model": args.model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": args.temperature,
        "max_tokens": args.max_tokens,
    }
    t0 = time.time()
    resp = http_json(f"{args.base_url}/chat/completions", payload, timeout=args.timeout)
    elapsed = time.time() - t0
    content = resp["choices"][0]["message"]["content"]
    usage = resp.get("usage", {})
    return content, usage, elapsed


# ---------- JSON抽出(アプリ本体の参考実装) ----------

def extract_json(text):
    """応答テキストから最初のバランスした {...} を抽出してparseする"""
    start = text.find("{")
    if start < 0:
        return None, "応答に '{' が見つからない"
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1]), None
                    except json.JSONDecodeError as e:
                        return None, f"JSON構文エラー: {e}"
    return None, "JSONが閉じていない(max_tokens不足で途中で切れた可能性)"


# ---------- ステップ別バリデータ(戻り値: 問題点リスト。空=OK) ----------

def v_mindmap(d):
    issues = []
    cats = d.get("categories")
    if not isinstance(cats, list):
        return ["categories がない/配列でない"]
    names = [c.get("name") for c in cats]
    if names != MINDMAP_CATEGORIES:
        issues.append(f"観点名が想定と異なる: {names}")
    for c in cats:
        n = len(c.get("items") or [])
        if n != 10:
            issues.append(f"観点「{c.get('name')}」items {n}件(期待10)")
    n = len(d.get("combinations") or [])
    if n != 10:
        issues.append(f"combinations {n}件(期待10)")
    return issues


def v_scamper(d):
    issues = []
    ideas = d.get("ideas")
    if not isinstance(ideas, list):
        return ["ideas がない/配列でない"]
    if len(ideas) != 21:
        issues.append(f"ideas {len(ideas)}件(期待21)")
    ids = set()
    for i in ideas:
        if not re.fullmatch(r"[SCAMPER]\d+", str(i.get("id", ""))):
            issues.append(f"id形式が不正: {i.get('id')}")
        ids.add(i.get("id"))
        for k in ("operation", "idea_name", "description", "target_user"):
            if not i.get(k):
                issues.append(f"{i.get('id')}: {k} が空")
    best = d.get("best_ids") or []
    if len(best) != 10:
        issues.append(f"best_ids {len(best)}件(期待10)")
    unknown = [b for b in best if b not in ids]
    if unknown:
        issues.append(f"best_ids に存在しないid: {unknown}")
    return issues


def v_persona(d, expected_ideas):
    issues = []
    personas = d.get("personas")
    if not isinstance(personas, list):
        return ["personas がない/配列でない"]
    if len(personas) != 3:
        issues.append(f"personas {len(personas)}体(期待3)")
    evs = d.get("evaluations") or []
    expected = len(expected_ideas) * 3
    if len(evs) != expected:
        issues.append(f"evaluations {len(evs)}件(期待{expected})")
    for e in evs:
        s = e.get("usage_score")
        if not (isinstance(s, int) and 0 <= s <= 10):
            issues.append(f"usage_score不正: {e.get('idea_id')}/{e.get('persona_name')} = {s}")
        if e.get("idea_id") not in expected_ideas:
            issues.append(f"evaluations に未知のidea_id: {e.get('idea_id')}")
    return issues


def v_six_hats(d):
    issues = [f"キー欠落: {k}" for k in SIX_HATS_KEYS if k not in d]
    scores = d.get("scores") or {}
    for k in SCORE_KEYS:
        s = scores.get(k)
        if not (isinstance(s, int) and 0 <= s <= 10):
            issues.append(f"scores.{k} 不正: {s}")
    return issues


def v_reverse_plan(d):
    issues = [f"キー欠落: {k}" for k in PLAN_KEYS if k not in d]
    for k in ("milestones", "day1_actions", "week1_actions", "requirements",
              "failure_points", "alternatives"):
        if k in d and not (isinstance(d[k], list) and d[k]):
            issues.append(f"{k} が空/配列でない")
    return issues


# ---------- プロンプト組み立て ----------

def render(step, variables):
    path = PROMPT_DIR / f"{step}.md"
    text = path.read_text(encoding="utf-8")
    for k, v in variables.items():
        text = text.replace("{{%s}}" % k, str(v))
    leftover = sorted(set(re.findall(r"\{\{(\w+)\}\}", text)))
    return text, leftover


def parse_steps(value):
    steps = STEP_ORDER if value == "all" else [s.strip() for s in value.split(",") if s.strip()]
    invalid = [s for s in steps if s not in STEP_ORDER]
    if invalid:
        raise ValueError(f"不明なステップ: {', '.join(invalid)} (有効: {', '.join(STEP_ORDER)})")
    if not steps:
        raise ValueError("ステップが指定されていません")
    positions = [STEP_ORDER.index(step) for step in steps]
    if len(positions) != len(set(positions)) or positions != sorted(positions):
        raise ValueError("ステップは重複させず、上流から順に指定してください")
    return steps


def validate_assets(input_path, steps):
    issues = []
    path = Path(input_path)
    try:
        base_vars = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as e:
        return {}, [f"入力JSONを読めません: {path}: {e}"]

    if not isinstance(base_vars, dict):
        return {}, [f"入力JSONのルートはobjectにしてください: {path}"]

    for key in BASE_INPUT_KEYS:
        value = base_vars.get(key)
        if not isinstance(value, str) or not value.strip():
            issues.append(f"入力項目 {key} は空でない文字列にしてください")

    for step in steps:
        prompt_path = PROMPT_DIR / f"{step}.md"
        try:
            text = prompt_path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as e:
            issues.append(f"promptを読めません: {prompt_path}: {e}")
            continue

        placeholders = set(re.findall(r"\{\{(\w+)\}\}", text))
        expected = EXPECTED_PLACEHOLDERS[step]
        if placeholders != expected:
            issues.append(
                f"{step}: placeholder差異 expected={sorted(expected)} actual={sorted(placeholders)}"
            )
        missing_sections = [section for section in REQUIRED_PROMPT_SECTIONS if section not in text]
        if missing_sections:
            issues.append(f"{step}: section欠落 {missing_sections}")

    return base_vars, issues


def jdump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)


def pick_top_idea(scamper, persona):
    """ペルソナ平均スコア最高の1案を選ぶ(アプリの収束①と同じロジック)"""
    ideas = {i["id"]: i for i in scamper["ideas"]}
    best = [b for b in (scamper.get("best_ids") or []) if b in ideas] or list(ideas)
    scores = {}
    for e in persona.get("evaluations", []):
        s = e.get("usage_score")
        if isinstance(s, (int, float)):
            scores.setdefault(e.get("idea_id"), []).append(s)

    def avg(i):
        v = scores.get(i, [])
        return sum(v) / len(v) if v else -1

    top = max(best, key=avg)
    item = dict(ideas[top])
    item["persona_evaluations"] = [e for e in persona.get("evaluations", [])
                                   if e.get("idea_id") == top]
    return top, item, avg(top)


# ---------- メイン ----------

def main():
    configure_utf8_output()
    p = argparse.ArgumentParser(description="LM Studio プロンプト検証")
    p.add_argument("--base-url", default="http://localhost:1234/v1")
    p.add_argument("--model", default=None, help="未指定なら /v1/models の先頭を使用")
    p.add_argument("--steps", default="all", help="例: mindmap,scamper(上流から順に指定)")
    p.add_argument("--temperature", type=float, default=0.7)
    p.add_argument("--max-tokens", type=int, default=8192)
    p.add_argument("--timeout", type=int, default=600, help="1呼び出しのタイムアウト秒")
    p.add_argument("--input", default=str(HERE / "test_input.json"))
    p.add_argument("--check-only", action="store_true", help="API接続なしで入力とprompt構造だけを検証")
    p.add_argument("--connection-only", action="store_true", help="LM Studioのモデル一覧取得まで確認して終了")
    args = p.parse_args()

    try:
        steps = parse_steps(args.steps)
    except ValueError as e:
        print(f"[NG] {e}")
        sys.exit(1)

    base_vars, asset_issues = validate_assets(args.input, steps)
    if asset_issues:
        print("[NG] 入力またはpromptの静的検証に失敗しました。")
        for issue in asset_issues:
            print(f"     - {issue}")
        sys.exit(1)
    if args.check_only:
        print(f"[OK] 入力JSONとprompt {len(steps)}件の静的検証に成功しました。")
        return

    # 接続確認 & モデル決定
    try:
        models = http_json(f"{args.base_url}/models", timeout=10)
        available = [m["id"] for m in models.get("data", [])]
    except (urllib.error.URLError, OSError) as e:
        print(f"[NG] LM Studio に接続できません({args.base_url}): {e}")
        print("     LM Studio を起動し、モデルをロードしてから再実行してください。")
        sys.exit(1)
    if not available:
        print("[NG] ロード済みモデルがありません。LM Studio でモデルをロードしてください。")
        sys.exit(1)
    if args.model is None:
        args.model = available[0]
    print(f"接続OK: {args.base_url}  モデル: {args.model}")
    if args.connection_only:
        print("[OK] LM Studioの接続確認に成功しました。生成処理は実行していません。")
        return

    outdir = RESULT_BASE / datetime.now().strftime("%Y%m%d-%H%M%S")
    outdir.mkdir(parents=True, exist_ok=True)

    ctx = {}      # ステップ間の受け渡し
    report = []   # (step, 判定, 所要秒, トークン, 問題点リスト)

    for step in steps:
        # 依存チェックと変数組み立て
        variables = dict(base_vars)
        try:
            if step == "scamper":
                variables["mindmap_output"] = jdump(ctx["mindmap"])
            elif step == "persona":
                sc = ctx["scamper"]
                ideas = {i["id"]: i for i in sc["ideas"]}
                subset = [ideas[b] for b in sc["best_ids"] if b in ideas]
                ctx["best_idea_ids"] = [i["id"] for i in subset]
                variables["scamper_ideas"] = jdump(subset)
            elif step == "six_hats":
                top_id, item, score = pick_top_idea(ctx["scamper"], ctx["persona"])
                print(f"  → ペルソナ平均スコア最高の1案で検証: {top_id}(平均{score:.1f})")
                variables["item"] = jdump(item)
            elif step == "reverse_plan":
                item = {"idea": ctx["six_hats_item"], "six_hats": ctx["six_hats"]}
                variables["item"] = jdump(item)
        except KeyError as e:
            print(f"[SKIP] {step}: 上流ステップ {e} の結果がありません(--steps に上流も含めてください)")
            report.append((step, "SKIP", 0, "-", [f"上流{e}未実行"]))
            continue

        prompt, leftover = render(step, variables)
        issues = []
        if leftover:
            issues.append(f"未置換のプレースホルダ: {leftover}")
        (outdir / f"{step}_prompt.txt").write_text(prompt, encoding="utf-8")

        print(f"[{step}] 実行中...")
        try:
            content, usage, elapsed = chat(args, prompt)
        except Exception as e:
            print(f"[NG] {step}: API呼び出し失敗: {e}")
            report.append((step, "NG", 0, "-", [f"API失敗: {e}"]))
            break
        (outdir / f"{step}_raw.txt").write_text(content, encoding="utf-8")

        data, err = extract_json(content)
        if err:
            issues.append(err)
            verdict = "NG"
        else:
            (outdir / f"{step}_parsed.json").write_text(jdump(data), encoding="utf-8")
            validator = {
                "mindmap": lambda d: v_mindmap(d),
                "scamper": lambda d: v_scamper(d),
                "persona": lambda d: v_persona(d, set(ctx.get("best_idea_ids", []))),
                "six_hats": lambda d: v_six_hats(d),
                "reverse_plan": lambda d: v_reverse_plan(d),
            }[step]
            issues += validator(data)
            ctx[step] = data
            if step == "six_hats":
                ctx["six_hats_item"] = json.loads(variables["item"])
            verdict = "OK" if not issues else "WARN"

        tok = f"in:{usage.get('prompt_tokens', '?')} out:{usage.get('completion_tokens', '?')}"
        report.append((step, verdict, elapsed, tok, issues))
        print(f"  → {verdict}  {elapsed:.0f}秒  {tok}")
        for msg in issues:
            print(f"     - {msg}")
        if verdict == "NG":
            print("  → JSONが取得できなかったため、以降のステップを中止します。")
            break

    # レポート出力
    lines = ["# プロンプト検証レポート", "",
             f"- 日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
             f"- 入力: {display_path(args.input)}",
             f"- モデル: {args.model}",
             f"- temperature: {args.temperature} / max_tokens: {args.max_tokens}", "",
             "| ステップ | 判定 | 所要 | トークン | 問題点 |",
             "|---|---|---|---|---|"]
    for step, verdict, sec, tok, issues in report:
        memo = "<br>".join(issues) if issues else "-"
        lines.append(f"| {step} | {verdict} | {sec:.0f}秒 | {tok} | {memo} |")
    lines += ["", "判定の意味: OK=合格 / WARN=JSONは取れたが件数・形式に差異 / NG=JSON取得失敗", ""]
    (outdir / "report.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"\nレポート: {display_path(outdir / 'report.md')}")
    print("WARN/NG があれば report.md と *_raw.txt を確認してください。")
    if any(verdict == "NG" for _, verdict, _, _, _ in report):
        sys.exit(1)


if __name__ == "__main__":
    main()
