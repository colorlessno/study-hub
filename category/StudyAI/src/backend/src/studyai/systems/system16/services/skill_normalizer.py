from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system16.repositories.skill_alias_repository import SkillAliasRepository


@dataclass(frozen=True, slots=True)
class AliasRule:
    canonical_name: str
    category: str
    bucket: str
    aliases: tuple[str, ...]


class SkillNormalizer:
    BUILTIN_RULES: tuple[AliasRule, ...] = (
        AliasRule("Python", "technical", "languages", ("python", "py")),
        AliasRule("Java", "technical", "languages", ("java",)),
        AliasRule("C#", "technical", "languages", ("c#", "c＃", "csharp")),
        AliasRule("JavaScript", "technical", "languages", ("javascript", "js")),
        AliasRule("TypeScript", "technical", "languages", ("typescript", "ts")),
        AliasRule("SQL", "technical", "languages", ("sql",)),
        AliasRule("PostgreSQL", "technical", "databases", ("postgresql", "postgres", "postgre sql")),
        AliasRule("MySQL", "technical", "databases", ("mysql",)),
        AliasRule("Oracle", "technical", "databases", ("oracle",)),
        AliasRule("SQLServer", "technical", "databases", ("sqlserver", "sql server", "mssql")),
        AliasRule("DB2", "technical", "databases", ("db2",)),
        AliasRule("Linux", "technical", "os", ("linux",)),
        AliasRule("Windows", "technical", "os", ("windows", "win")),
        AliasRule("MacOS", "technical", "os", ("macos", "mac os")),
        AliasRule("AWS", "technical", "tools", ("aws", "amazon web services")),
        AliasRule("Azure", "technical", "tools", ("azure",)),
        AliasRule("GCP", "technical", "tools", ("gcp", "google cloud")),
        AliasRule("Docker", "technical", "tools", ("docker",)),
        AliasRule("Kubernetes", "technical", "tools", ("kubernetes", "k8s")),
        AliasRule("Git", "technical", "tools", ("git",)),
        AliasRule("SVN", "technical", "tools", ("svn", "subversion")),
        AliasRule("Visual Studio", "technical", "tools", ("visual studio",)),
        AliasRule("VSCode", "technical", "tools", ("vscode", "vs code")),
        AliasRule("要件定義", "process", "processes", ("要件定義",)),
        AliasRule("基本設計", "process", "processes", ("基本設計",)),
        AliasRule("詳細設計", "process", "processes", ("詳細設計",)),
        AliasRule("製造", "process", "processes", ("製造", "実装", "開発")),
        AliasRule("単体試験", "process", "processes", ("単体試験", "単体テスト")),
        AliasRule("結合試験", "process", "processes", ("結合試験", "結合テスト")),
        AliasRule("総合試験", "process", "processes", ("総合試験", "総合テスト")),
        AliasRule("運用", "process", "processes", ("運用",)),
        AliasRule("保守", "process", "processes", ("保守",)),
        AliasRule("金融", "domain", "domains", ("金融", "銀行", "保険", "証券")),
        AliasRule("製造", "domain", "domains", ("製造", "工場")),
        AliasRule("物流", "domain", "domains", ("物流", "倉庫", "配送")),
        AliasRule("公共", "domain", "domains", ("公共", "官公庁", "自治体")),
        AliasRule("医療", "domain", "domains", ("医療", "病院", "ヘルスケア")),
        AliasRule("小売", "domain", "domains", ("小売", "流通", "店舗")),
        AliasRule("EC", "domain", "domains", ("ec", "eコマース", "通販")),
        AliasRule("通信", "domain", "domains", ("通信", "telecom")),
        AliasRule("SE", "role", "roles", ("se", "システムエンジニア")),
        AliasRule("PG", "role", "roles", ("pg", "プログラマ", "プログラマー")),
        AliasRule("PL", "role", "roles", ("pl", "プロジェクトリーダー")),
        AliasRule("PM", "role", "roles", ("pm", "プロジェクトマネージャー", "プロジェクトマネジャー")),
        AliasRule("PMO", "role", "roles", ("pmo",)),
        AliasRule("TL", "role", "roles", ("tl", "テックリード")),
    )

    async def load_alias_rules(self, session: AsyncSession) -> list[AliasRule]:
        repository = SkillAliasRepository(session)
        dynamic_rules = [
            AliasRule(
                canonical_name=item.canonical_name,
                category=item.category or "technical",
                bucket=self._bucket_for_category(item.category or "technical"),
                aliases=(item.alias_name,),
            )
            for item in await repository.list_aliases()
        ]
        deduplicated: dict[tuple[str, str, str], set[str]] = {}
        for rule in [*self.BUILTIN_RULES, *dynamic_rules]:
            key = (rule.canonical_name, rule.category, rule.bucket)
            deduplicated.setdefault(key, set()).update(alias.casefold() for alias in rule.aliases if alias.strip())
        return [
            AliasRule(canonical_name=key[0], category=key[1], bucket=key[2], aliases=tuple(sorted(aliases)))
            for key, aliases in deduplicated.items()
        ]

    def extract_catalog(self, text: str, rules: list[AliasRule]) -> dict:
        normalized_text = text.casefold()
        result = {
            "languages": [],
            "databases": [],
            "os": [],
            "tools": [],
            "processes": [],
            "domains": [],
            "roles": [],
        }
        for rule in rules:
            if self._matches_any_alias(normalized_text, rule.aliases):
                bucket_values = result.setdefault(rule.bucket, [])
                if rule.canonical_name not in bucket_values:
                    bucket_values.append(rule.canonical_name)
        for key in result:
            result[key] = sorted(result[key])
        result["technical_all"] = sorted({*result["languages"], *result["databases"], *result["os"], *result["tools"]})
        return result

    def normalize_terms(self, terms: list[str], rules: list[AliasRule], category: str) -> list[str]:
        if not terms:
            return []
        index: dict[str, str] = {}
        for rule in rules:
            if rule.category != category:
                continue
            index[rule.canonical_name.casefold()] = rule.canonical_name
            for alias in rule.aliases:
                index[alias.casefold()] = rule.canonical_name
        normalized = []
        for term in terms:
            canonical = index.get(term.casefold(), term.strip())
            if canonical and canonical not in normalized:
                normalized.append(canonical)
        return normalized

    def _matches_any_alias(self, text: str, aliases: tuple[str, ...]) -> bool:
        return any(self._match_alias(text, alias) for alias in aliases)

    @staticmethod
    def _match_alias(text: str, alias: str) -> bool:
        escaped = re.escape(alias)
        if re.fullmatch(r"[a-z0-9+# .-]+", alias):
            return re.search(rf"(?<![a-z0-9]){escaped}(?![a-z0-9])", text) is not None
        return alias in text

    @staticmethod
    def _bucket_for_category(category: str) -> str:
        return {
            "technical": "tools",
            "process": "processes",
            "domain": "domains",
            "role": "roles",
        }.get(category, "tools")
