"""Keep the deployment requirements generated from the runtime uv lock."""
from pathlib import Path
import subprocess
import sys

backend = Path(__file__).resolve().parents[1] / "backend"
result = subprocess.run([
    "uv", "export", "--locked", "--no-dev", "--no-emit-project",
    "--no-header", "--no-annotate", "--no-hashes",
], cwd=backend, check=True, capture_output=True, text=True, encoding="utf-8")
expected = "# Generated from uv.lock; run: python scripts/check_requirements.py --write\n" + result.stdout
target = backend / "requirements.txt"
if sys.argv[1:] == ["--write"]:
    target.write_text(expected, encoding="utf-8", newline="\n")
elif sys.argv[1:]:
    raise SystemExit("Usage: python scripts/check_requirements.py [--write]")
elif target.read_text(encoding="utf-8") != expected:
    raise SystemExit("requirements.txt differs from uv.lock; run python scripts/check_requirements.py --write")
print("PASS: deployment requirements match the locked runtime dependencies")
