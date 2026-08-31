from __future__ import annotations

import argparse
import json

from studyai.systems.enterprise_ai.service import enterprise_ai_service


def main() -> None:
    parser = argparse.ArgumentParser(description="Run StudyAI system37-system44 enterprise AI local demo.")
    parser.add_argument("--system", required=True, help="system id, for example system37")
    parser.add_argument("--input-json", default="{}", help="JSON object merged into the default input")
    parser.add_argument("--mode", default="mock", choices=["mock", "lmstudio"])
    args = parser.parse_args()

    payload = json.loads(args.input_json)
    result = enterprise_ai_service.execute(args.system, {"input": payload, "mode": args.mode})
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
