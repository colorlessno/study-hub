from __future__ import annotations

import asyncio
from pathlib import Path

from studyai.common.ai.llm_client import LLMClient
from studyai.systems.system11.prompts.organize_prompt import ORGANIZE_SYSTEM_PROMPT, build_organize_prompt
from studyai.systems.system11.schemas.organizer import ActionItem, ScanSummary

_CONFIDENCE_THRESHOLD = 0.70


class PlanGenerator:
    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self.llm_client = llm_client or LLMClient()

    async def generate_plan(
        self,
        file_info_list: list[dict],
        output_folder: str,
    ) -> tuple[str, list[ActionItem], ScanSummary, str]:
        if not file_info_list:
            summary = ScanSummary(total_actions=0, moves=0, renames=0, archives=0, skips=0, duplicates_found=0)
            return "対象ファイルがありませんでした。", [], summary, "local_rules"

        user_prompt = build_organize_prompt(output_folder, file_info_list)
        try:
            raw = await asyncio.wait_for(
                self.llm_client.extract_json(ORGANIZE_SYSTEM_PROMPT, user_prompt),
                timeout=8,
            )
            raw_actions = raw.get("actions") if isinstance(raw.get("actions"), list) else []
            summary_text = str(raw.get("summary") or "AIが整理案を生成しました。")
            planning_method = "llm"
        except Exception:
            raw_actions = self._build_local_actions(file_info_list, output_folder)
            summary_text = "AIを利用できなかったため、教材用の規則で整理案を生成しました。"
            planning_method = "local_rules"

        actions = self._build_actions(raw_actions, file_info_list, output_folder)
        summary = self._summarize(actions)
        return summary_text, actions, summary, planning_method

    @staticmethod
    def _build_local_actions(file_info_list: list[dict], output_folder: str) -> list[dict]:
        output = Path(output_folder)
        image_extensions = {".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
        actions: list[dict] = []
        for index, file_info in enumerate(file_info_list, start=1):
            source = Path(str(file_info["path"]))
            name = source.name
            lowered = name.lower()
            action: dict = {
                "action_id": f"local-{index:03d}",
                "source_path": str(source),
                "confidence": 1,
            }
            if bool(file_info.get("is_forbidden")):
                action.update(action_type="keep", reason="実行形式のファイルは安全のため操作しません。")
            elif "old" in lowered:
                action.update(
                    action_type="archive",
                    dest_path=str(output / "archive" / name),
                    reason="古い資料と分かる名前のため保管フォルダへ移します。",
                )
            elif " " in name:
                action.update(
                    action_type="rename",
                    new_name=name.replace(" ", "-").lower(),
                    reason="空白を含まない分かりやすい名前へ変更します。",
                )
            elif source.suffix.lower() in image_extensions:
                action.update(
                    action_type="move",
                    dest_path=str(output / "images" / name),
                    reason="画像を画像用フォルダへまとめます。",
                )
            else:
                action.update(
                    action_type="move",
                    dest_path=str(output / "documents" / name),
                    reason="文書を文書用フォルダへまとめます。",
                )
            actions.append(action)
        return actions

    @staticmethod
    def _build_actions(raw_actions: list, file_info_list: list[dict], output_folder: str) -> list[ActionItem]:
        known_sources = {str(Path(str(item["path"])).resolve()): item for item in file_info_list}
        output = Path(output_folder).resolve()
        used_sources: set[str] = set()

        actions: list[ActionItem] = []
        for index, item in enumerate(raw_actions, start=1):
            if not isinstance(item, dict):
                continue
            action_type = str(item.get("action_type") or "keep").lower()
            if action_type not in {"move", "rename", "archive", "keep"}:
                action_type = "keep"

            source_path = str(Path(str(item.get("source_path") or "")).resolve())
            file_info = known_sources.get(source_path)
            if file_info is None or source_path in used_sources:
                continue
            used_sources.add(source_path)

            try:
                confidence = max(0.0, min(float(item.get("confidence") or 0.0), 1.0))
            except (TypeError, ValueError):
                confidence = 0.0
            reason = str(item.get("reason") or "")
            dest_path = str(item.get("dest_path") or "") or None
            new_name = str(item.get("new_name") or "") or None

            if bool(file_info.get("is_forbidden")):
                action_type = "keep"
                reason = "実行形式のファイルは安全のため操作しません。"
            elif confidence < _CONFIDENCE_THRESHOLD and action_type != "keep":
                action_type = "keep"
                reason = "整理案の確信度が基準未満のため操作しません。"

            if action_type in {"move", "archive"}:
                try:
                    destination = Path(dest_path or "").resolve()
                    destination.relative_to(output)
                    if destination == output:
                        raise ValueError
                    dest_path = str(destination)
                except ValueError:
                    action_type = "keep"
                    dest_path = None
                    reason = "整理先が教材用出力フォルダ外のため操作しません。"
            elif action_type == "rename":
                if not new_name or Path(new_name).name != new_name or new_name in {".", ".."}:
                    action_type = "keep"
                    new_name = None
                    reason = "変更後の名前が安全条件を満たさないため操作しません。"
            else:
                dest_path = None
                new_name = None

            action = ActionItem(
                action_id=str(item.get("action_id") or f"plan-{index:03d}"),
                action_type=action_type,
                source_path=source_path,
                dest_path=dest_path,
                new_name=new_name,
                reason=reason,
                confidence=confidence,
            )
            actions.append(action)

        for source_path in known_sources.keys() - used_sources:
            actions.append(ActionItem(
                action_id=f"keep-{len(actions) + 1:03d}",
                action_type="keep",
                source_path=source_path,
                reason="整理案に含まれなかったため操作しません。",
                confidence=1,
            ))
        return actions

    @staticmethod
    def _summarize(actions: list[ActionItem]) -> ScanSummary:
        counts = {"move": 0, "rename": 0, "archive": 0, "keep": 0}
        for action in actions:
            counts[action.action_type] = counts.get(action.action_type, 0) + 1
        summary = ScanSummary(
            total_actions=len(actions),
            moves=counts["move"],
            renames=counts["rename"],
            archives=counts["archive"],
            skips=counts["keep"],
            duplicates_found=0,
        )
        return summary
