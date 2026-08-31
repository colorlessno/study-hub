from pathlib import Path
import subprocess


def main() -> int:
    validator = Path(__file__).with_name("validate-architecture-learning.mjs")
    result = subprocess.run(["node", str(validator)], check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
