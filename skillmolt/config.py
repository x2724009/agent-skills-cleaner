"""Per-agent settings: which model each agent runs and how capable it is.

Stored in ~/.skillmolt/config.json next to the undo history. The tier is
recorded now so scoring can take it into account later.
"""

import json
import os

from . import actions

TIERS = ("frontier", "mid", "small")
MAX_LEN = 80

# Sensible guesses for agents tied to one vendor; everything else starts blank.
DEFAULTS = {
    "Claude Code": {"model": "Claude", "tier": "frontier"},
    "Codex": {"model": "GPT", "tier": "frontier"},
    "Gemini CLI": {"model": "Gemini", "tier": "frontier"},
}


def config_path():
    return os.path.join(actions.STATE_DIR, "config.json")


def load_config():
    agents = {k: dict(v) for k, v in DEFAULTS.items()}
    try:
        with open(config_path(), encoding="utf-8") as f:
            saved = json.load(f).get("agents", {})
        if isinstance(saved, dict):
            agents.update({k: v for k, v in saved.items() if isinstance(v, dict)})
    except (OSError, ValueError, AttributeError):
        pass
    return {"agents": agents}


def _clean(value):
    if not isinstance(value, dict):
        raise ValueError("bad entry")
    model = str(value.get("model") or "").strip()[:MAX_LEN]
    tier = value.get("tier") or ""
    if tier not in TIERS + ("",):
        raise ValueError("unknown tier: %s" % tier)
    return {"model": model, "tier": tier}


def save_config(data):
    agents = data.get("agents") if isinstance(data, dict) else None
    if not isinstance(agents, dict):
        raise ValueError("expected {agents: {...}}")
    clean = {}
    for name, value in agents.items():
        name = str(name).strip()[:MAX_LEN]
        if name:
            clean[name] = _clean(value)
    os.makedirs(actions.STATE_DIR, exist_ok=True)
    tmp = config_path() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"agents": clean}, f, ensure_ascii=False, indent=2)
    os.replace(tmp, config_path())
    return load_config()
