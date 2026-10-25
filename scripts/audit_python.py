"""Audit every registry package in uv.lock, including dev and other platforms."""
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import tomllib

root = Path(__file__).resolve().parents[1]
lock = tomllib.loads((root / "backend/uv.lock").read_text(encoding="utf-8"))
requirements = sorted({
    f"{package['name']}=={package['version']}"
    for package in lock["package"] if "registry" in package.get("source", {})
})
if not requirements:
    raise SystemExit("No registry dependencies found in uv.lock")
with TemporaryDirectory(prefix="gym-python-audit-") as directory:
    path = Path(directory) / "requirements.txt"
    path.write_text("\n".join(requirements) + "\n", encoding="utf-8")
    # Do not resolve or install audited packages: these versions already come from the lock.
    subprocess.run([
        "uvx", "pip-audit", "--strict", "--disable-pip", "--no-deps", "-r", str(path),
    ], check=True)
