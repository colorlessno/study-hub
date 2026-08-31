from __future__ import annotations

from enterprise_ai_demo import main


if __name__ == "__main__":
    import sys

    sys.argv.extend(["--system", "system41"]) if "--system" not in sys.argv else None
    main()
