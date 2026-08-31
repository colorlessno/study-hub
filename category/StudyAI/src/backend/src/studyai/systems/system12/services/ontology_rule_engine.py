from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system12.repositories.ontology_repository import OntologyRepository


class OntologyRuleEngine:
    async def apply_rules(self, session: AsyncSession, *, conditions: dict, candidates: list[dict]) -> list[dict]:
        rules = await OntologyRepository(session).list_ng_rules()
        scene = str(conditions.get("scene") or "").strip()
        recipient = str(conditions.get("recipient") or "").strip()

        filtered: list[dict] = []
        for item in candidates:
            product = item["product"]
            rejected = False
            for rule in rules:
                if rule.scene is not None and scene and rule.scene.name != scene:
                    continue
                if rule.recipient is not None and recipient and rule.recipient.name != recipient:
                    continue
                if self._matches_rule(product, rule.ng_attribute):
                    if rule.severity == "block":
                        rejected = True
                        break
                    item.setdefault("warnings", []).append(rule.reason or f"{rule.ng_attribute} は注意対象です。")
            if not rejected:
                filtered.append(item)
        return filtered

    @staticmethod
    def _matches_rule(product, ng_attribute: str) -> bool:
        target = ng_attribute.casefold()
        searchable = [
            product.name or "",
            product.category or "",
            product.description or "",
            " ".join(product.tags or []),
            " ".join(str(value) for value in (product.attributes or {}).values()),
        ]
        haystack = "\n".join(searchable).casefold()
        return target in haystack
