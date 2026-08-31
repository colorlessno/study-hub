from __future__ import annotations

from ai_learning_demo import main


if __name__ == "__main__":
    import sys
    sys.argv.extend(["--system", "system23"]) if "--system" not in sys.argv else None
    main()
