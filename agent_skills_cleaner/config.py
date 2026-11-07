"""Optional per-agent overrides for the detected model and tier.

Models are detected automatically (see models.py). Anything saved here wins
over detection. Stored next to the undo history.
"""

import json
import os

from . import actions

TIERS = ("frontier", "mid", "small")
MAX_LEN = 80

def config_path():
    return os.path.join(actions.STATE_DIR, "config.json")


def load_config():
    actions._migrate_legacy()
    agents = {}
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
