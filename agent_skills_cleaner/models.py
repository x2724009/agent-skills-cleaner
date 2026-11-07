"""Find out which model each agent runs, and how capable that model is.

Nothing here asks the user. Each agent's own config file is read with a
small, tolerant pattern; the model id is then mapped to a tier by name.

Some apps (DSH, for example) load skills from every other agent's folder.
They are "readers": a skill in ~/.codex/skills is also seen by DSH's model,
so it must be judged for the weakest of the two.
"""

import json
import os
import re

TIERS = ("frontier", "mid", "small")

# Checked in order: the first pattern that matches the model id wins.
TIER_PATTERNS = [
    ("small", r"(?<![a-z])(nano|lite|tiny)(?![a-z])|(?<![\d.])\d{1,2}(\.\d)?b(?![a-z])|ollama|phi-?\d|gemma"),
    ("mid", r"(?<![a-z])(flash|mini|haiku|turbo|air|small|plus|lightning|instant|chat)(?![a-z])"),
    ("frontier", r"opus|sonnet|fable|claude|gpt|(?<![a-z])o[1-9](?![a-z])|codex|gemini|grok|deepseek|qwen|kimi|glm|max|pro"),
]


def tier_for_model(model):
    m = (model or "").lower()
    if not m:
        return ""
    for tier, pattern in TIER_PATTERNS:
        if re.search(pattern, m):
            return tier
    return ""


def _read(path):
    try:
        with open(os.path.expanduser(path), encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def _json_model(path, *keys):
    text = _read(path)
    if text is None:
        return None
    try:
        data = json.loads(text)
        for k in keys:
            data = data.get(k) if isinstance(data, dict) else None
        if isinstance(data, str) and data:
            return data
    except ValueError:
        m = re.search(r'"%s"\s*:\s*"([^"]+)"' % re.escape(keys[-1]), text)
        if m:
            return m.group(1)
    return None


def _toml_model(path):
    text = _read(path)
    if text is None:
        return None
    # Only the top-level `model = "..."`, before the first [table].
    head = re.split(r"^\s*\[", text, maxsplit=1, flags=re.M)[0]
    m = re.search(r'^\s*model\s*=\s*"([^"]+)"', head, re.M)
    return m.group(1) if m else None


def _dsh_model():
    for profile in ("desktop", "headless"):
        text = _read("~/.dsh/profiles/%s/cordis.patch.yml" % profile)
        if not text:
            continue
        m = re.search(r"id:\s*agent-default-model\b.*?\n\s*model:\s*([^\s#]+)", text, re.S)
        if m:
            return m.group(1).strip("'\""), "~/.dsh/profiles/%s/cordis.patch.yml" % profile
    return None, None


# Agent name -> (how to find its model, the file we read, fallback when the
# agent is tied to one vendor and no explicit model is configured).
AGENT_SOURCES = {
    "Claude Code": [
        (lambda: os.environ.get("ANTHROPIC_MODEL"), "$ANTHROPIC_MODEL"),
        (lambda: _json_model("~/.claude/settings.json", "model"), "~/.claude/settings.json"),
    ],
    "Codex": [(lambda: _toml_model("~/.codex/config.toml"), "~/.codex/config.toml")],
    "Gemini CLI": [
        (lambda: _json_model("~/.gemini/settings.json", "model", "name"), "~/.gemini/settings.json"),
        (lambda: _json_model("~/.gemini/settings.json", "model"), "~/.gemini/settings.json"),
    ],
    "GitHub Copilot": [(lambda: _json_model("~/.copilot/config.json", "model"), "~/.copilot/config.json")],
    "OpenCode": [(lambda: _json_model("~/.config/opencode/opencode.json", "model"), "~/.config/opencode/opencode.json")],
    "Qwen Code": [(lambda: _json_model("~/.qwen/settings.json", "model", "name"), "~/.qwen/settings.json")],
}
VENDOR_DEFAULT = {
    "Claude Code": "Claude",
    "Codex": "GPT",
    "Gemini CLI": "Gemini",
}

# Apps that read other agents' skill folders. Keys in DSH's source list map
# to the agent names used by the scanner.
DSH_SOURCE_AGENTS = {
    "agents": "Shared (~/.agents)", "claude": "Claude Code", "codex": "Codex",
    "cursor": "Cursor", "gemini": "Gemini CLI", "copilot": "GitHub Copilot",
    "opencode": "OpenCode", "windsurf": "Windsurf", "trae": "Trae",
    "qoder": "Qoder", "codebuddy": "CodeBuddy", "workbuddy": "WorkBuddy", "kiro": "Kiro",
    "dsh": "DSH",
}
# Folders only one reader app loads, used to hide a skill from everyone else.
READER_HOMES = {"DSH": "~/.dsh/skills"}


def _dsh_reader():
    if not os.path.isdir(os.path.expanduser("~/.dsh")):
        return None
    model, source = _dsh_model()
    reads = []
    text = _read("~/.dsh/skills-manager/state.json")
    if text:
        try:
            sources = json.loads(text).get("sources", {})
            reads = sorted({DSH_SOURCE_AGENTS[k] for k, on in sources.items() if on and k in DSH_SOURCE_AGENTS})
        except (ValueError, AttributeError):
            pass
    if not reads:
        return None
    return {"name": "DSH", "model": model or "", "tier": tier_for_model(model), "source": source or "~/.dsh",
            "reads": reads, "home": os.path.expanduser(READER_HOMES["DSH"])}


def detect():
    """Return {"agents": {name: {...}}, "readers": [...]} from config files."""
    agents = {}
    for name, finders in AGENT_SOURCES.items():
        model, source = None, None
        for find, where in finders:
            model = find()
            if model:
                source = where
                break
        if not model and name in VENDOR_DEFAULT:
            model, source = VENDOR_DEFAULT[name], "default"
        if model:
            agents[name] = {"model": model, "tier": tier_for_model(model), "source": source}
    readers = [r for r in (_dsh_reader(),) if r]
    for r in readers:  # a reader's own folder is that reader's agent entry
        agents.setdefault(r["name"], {"model": r["model"], "tier": r["tier"], "source": r["source"]})
    return {"agents": agents, "readers": readers}


def weakest(tiers):
    known = [t for t in tiers if t in TIERS]
    return max(known, key=TIERS.index) if known else ""


def effective_profile(detected, overrides, agent_names):
    """Combine detection with the user's optional overrides.

    Returns {agent: {"model", "tier", "source", "readers": [...], "effective": tier}}
    where "effective" is the weakest tier among the agent and every app that
    reads its folder. Agents with no known tier count as frontier.
    """
    out = {}
    readers = detected.get("readers", [])
    for name in agent_names:
        info = dict(detected["agents"].get(name) or {"model": "", "tier": "", "source": None})
        o = overrides.get(name) or {}
        if o.get("model"):
            info["model"], info["source"] = o["model"], "manual"
            info["tier"] = tier_for_model(o["model"]) or info.get("tier", "")
        if o.get("tier"):
            info["tier"], info["tier_source"] = o["tier"], "manual"
        r_here = [r for r in readers if name in r["reads"]]
        info["readers"] = [{"name": r["name"], "model": r["model"], "tier": r["tier"]} for r in r_here]
        # A folder with no agent of its own (the shared one) is judged only by its readers.
        own = info.get("tier") or ("" if name.startswith("Shared") else "frontier")
        info["effective"] = weakest([own] + [r["tier"] for r in r_here]) or "frontier"
        out[name] = info
    return out
