from pathlib import Path
import sys


BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from scripts.seed_initial_data import main


if __name__ == "__main__":
    main()
