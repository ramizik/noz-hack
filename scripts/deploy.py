#!/usr/bin/env python3
"""Deploy sentinel_agent_cycle to Tensorlake: set secrets, deploy, register cron."""

import os
import shutil
import site
import subprocess
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

AGENT_FILE = Path(__file__).parent.parent / "agents" / "python" / "sentinel_agent.py"

# Locate tl CLI — may be in user Scripts dir, not on PATH
_user_scripts = Path(site.getusersitepackages()).parent / "Scripts"
_tl = shutil.which("tl") or str(_user_scripts / "tl.exe")

SECRETS = [
    "TENSORLAKE_API_KEY",
    "NIA_API_KEY",
    "OPENAI_API_KEY",
    "TENSORLAKE_MEMORY_SANDBOX_ID",
]


def display_cmd(cmd: list[str]) -> str:
    safe = []
    for part in cmd:
        if any(part.startswith(f"{key}=") for key in SECRETS):
            safe.append(part.split("=", 1)[0] + "=<redacted>")
        else:
            safe.append(part)
    return " ".join(safe)


def run(cmd: list[str]) -> None:
    print(f"$ {display_cmd(cmd)}")
    env = os.environ.copy()
    env["PATH"] = str(_user_scripts) + os.pathsep + env.get("PATH", "")
    subprocess.run(cmd, check=True, shell=(sys.platform == "win32"), env=env)


def main() -> None:
    # 1. Validate required env vars
    missing = [k for k in ["TENSORLAKE_API_KEY", "TENSORLAKE_MEMORY_SANDBOX_ID"] if not os.environ.get(k)]
    if missing:
        print(f"Missing env vars: {', '.join(missing)}", file=sys.stderr)
        raise SystemExit(1)

    # 2. Set secrets in Tensorlake
    print("\n--- Setting secrets ---")
    for key in SECRETS:
        val = os.environ.get(key, "")
        if val:
            run([_tl, "secrets", "set", f"{key}={val}"])
        else:
            print(f"  ⚠ {key} not set in .env — skipping")

    # 3. Deploy the application (use tensorlake-deploy directly — tl deploy can't find it on Windows PATH)
    print("\n--- Deploying application ---")
    _deploy_script = _user_scripts / "tensorlake-deploy"
    run(["python", str(_deploy_script), str(AGENT_FILE)])

    # 4. Register cron
    print("\n--- Registering cron schedule ---")
    run(["python", str(Path(__file__).parent / "register_cron.py")])

    print("\nOK Deploy complete. Agent will fire every 2 minutes.")


if __name__ == "__main__":
    main()
