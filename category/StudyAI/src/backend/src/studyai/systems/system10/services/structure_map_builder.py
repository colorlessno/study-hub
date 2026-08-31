from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from studyai.systems.system10.schemas.indexing import FolderMapNode, FolderMapResponse


class StructureMapBuilder:
    def build(self, *, root_path: str, indexed_files: list, duplicate_groups: list) -> FolderMapResponse:
        normalized_root = Path(root_path)
        grouped: dict[tuple[str, ...], list] = defaultdict(list)
        for item in indexed_files:
            try:
                relative_parent = Path(item.folder_path).relative_to(normalized_root)
            except ValueError:
                relative_parent = Path(".")
            grouped[relative_parent.parts].append(item)

        issues: list[str] = []
        if duplicate_groups:
            issues.append(f"重複候補ファイルが {len(duplicate_groups)} グループあります。")

        root_node = self._build_node(normalized_root, tuple(), grouped)
        return FolderMapResponse(folder_tree=root_node, issues=issues)

    def _build_node(self, root_path: Path, current_parts: tuple[str, ...], grouped: dict[tuple[str, ...], list]) -> FolderMapNode:
        current_path = root_path.joinpath(*current_parts) if current_parts else root_path
        direct_files = grouped.get(current_parts, [])
        child_keys = sorted(
            {
                key[: len(current_parts) + 1]
                for key in grouped
                if len(key) > len(current_parts) and key[: len(current_parts)] == current_parts
            }
        )
        children = [self._build_node(root_path, child_key, grouped) for child_key in child_keys]
        file_count = len(direct_files) + sum(child.file_count for child in children)
        size_mb = round(
            (sum((item.file_size or 0) for item in direct_files) + sum((child.size_mb or 0) * 1024 * 1024 for child in children))
            / 1024
            / 1024,
            2,
        )
        description = " / ".join(current_parts) if current_parts else f"{root_path.name} 配下のファイル構成"
        return FolderMapNode(
            path=str(current_path),
            description=description,
            file_count=file_count,
            size_mb=size_mb,
            children=children,
        )
