from __future__ import annotations

import argparse
import asyncio
import json

from studyai.systems.ai_learning.service import learning_service


def main() -> None:
    parser = argparse.ArgumentParser(description="Run StudyAI system17-system36 local demo.")
    parser.add_argument("--system", required=True, help="system id, for example system17")
    parser.add_argument("--input-json", default="{}", help="JSON object merged into the default input")
    args = parser.parse_args()

    payload = json.loads(args.input_json)
    result = asyncio.run(learning_service.execute_async(args.system, payload))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
