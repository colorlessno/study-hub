# 後方互換 re-export。実装は common/search に移動済み。
from studyai.common.search.web_fetch_tool import WebFetchTool

__all__ = ["WebFetchTool"]
