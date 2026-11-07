"""Find agent skills on this machine and collect facts about each one.

A "skill" is a folder that contains a SKILL.md. The same folder is often
installed into several agents (Claude Code, Codex, Cursor...) through
symlinks, so skills are grouped by their real path and every place that
exposes them is recorded as an "install".
"""

import hashlib
import json
import os
import re
import time

# Where each agent looks for user-level skills. Missing folders are skipped.
DEFAULT_ROOTS = [
    ("Claude Code", "~/.claude/skills"),
    ("Codex", "~/.codex/skills"),
    ("Shared (~/.agents)", "~/.agents/skills"),
    ("Cursor", "~/.cursor/skills"),
    ("Gemini CLI", "~/.gemini/skills"),
    ("GitHub Copilot", "~/.copilot/skills"),
    ("OpenCode", "~/.config/opencode/skills"),
    ("Windsurf", "~/.codeium/windsurf/skills"),
    ("Kiro", "~/.kiro/skills"),
    ("Qwen Code", "~/.qwen/skills"),
    ("Trae", "~/.trae/skills"),
]

LOCK_FILES = ["~/.agents/.skill-lock.json"]

CODE_EXTS = {".py", ".js", ".mjs", ".cjs", ".ts", ".sh", ".rb", ".go", ".rs", ".swift"}
TOOL_MARKERS = {"pyproject.toml", "package.json", "requirements.txt", "uv.lock", "Cargo.toml", "go.mod"}
DATA_DIRS = {"references", "reference", "templates", "assets", "examples", "themes", "rules", "luts", "audio"}
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv"}


def _expand(path):
    return os.path.abspath(os.path.expanduser(path))


def parse_frontmatter(text):
    """Parse the small YAML subset used by SKILL.md headers.

    Handles `key: value`, quoted values and `|` / `>` block scalars, which
    covers every SKILL.md seen in the wild without pulling in PyYAML.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return {}, text

    meta = {}
    i = 1
    while i < end:
        line = lines[i]
        if not line.strip() or line.startswith((" ", "\t", "#")) or ":" not in line:
            i += 1
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if value[:1] in ("|", ">"):
            folded = value[0] == ">"
            block = []
            i += 1
            while i < end and (not lines[i].strip() or lines[i].startswith((" ", "\t"))):
                block.append(lines[i].strip())
                i += 1
            joiner = " " if folded else "\n"
            meta[key] = joiner.join(b for b in block if b).strip()
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        meta[key] = value
        i += 1
    body = "\n".join(lines[end + 1:])
    return meta, body


def _walk_stats(folder):
    stats = {"files": 0, "bytes": 0, "code_files": 0, "tool_markers": [], "data_dirs": [], "newest": 0.0}
    for top in os.listdir(folder):
        if top in DATA_DIRS and os.path.isdir(os.path.join(folder, top)):
            stats["data_dirs"].append(top)
        if top in TOOL_MARKERS:
            stats["tool_markers"].append(top)
    for root, dirs, files in os.walk(folder):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            path = os.path.join(root, name)
            try:
                st = os.stat(path)
            except OSError:
                continue
            stats["files"] += 1
            stats["bytes"] += st.st_size
            stats["newest"] = max(stats["newest"], st.st_mtime)
            if os.path.splitext(name)[1].lower() in CODE_EXTS:
                stats["code_files"] += 1
        if stats["files"] > 5000:
            break
    return stats


def _load_locks():
    managed = {}
    for lock in LOCK_FILES:
        path = _expand(lock)
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            continue
        skills = data.get("skills", data) if isinstance(data, dict) else {}
        if not isinstance(skills, dict):
            continue
        for name, info in skills.items():
            source = ""
            if isinstance(info, dict):
                source = info.get("source") or info.get("sourceUrl") or info.get("repo") or ""
            managed[name] = {"lock": path, "source": source}
    return managed


def skill_id(real_path):
    return hashlib.sha1(real_path.encode("utf-8")).hexdigest()[:12]


def scan(roots=None):
    """Return {"skills": [...], "roots": [...], "scanned_at": ts}."""
    roots = roots or DEFAULT_ROOTS
    managed = _load_locks()
    by_real = {}
    broken = []
    root_info = []

    for agent, raw in roots:
        root = _expand(raw)
        exists = os.path.isdir(root)
        root_info.append({"agent": agent, "path": root, "exists": exists})
        if not exists:
            continue
        for entry in sorted(os.listdir(root)):
            if entry.startswith("."):
                continue
            path = os.path.join(root, entry)
            is_link = os.path.islink(path)
            target = os.readlink(path) if is_link else None
            if is_link and not os.path.exists(path):
                broken.append({"agent": agent, "path": path, "name": entry, "target": target})
                continue
            if not os.path.isdir(path):
                continue
            real = os.path.realpath(path)
            if not os.path.isfile(os.path.join(real, "SKILL.md")):
                continue
            install = {"agent": agent, "path": path, "kind": "link" if is_link else "folder", "target": target}
            by_real.setdefault(real, []).append(install)

    skills = []
    for real, installs in by_real.items():
        with open(os.path.join(real, "SKILL.md"), encoding="utf-8", errors="replace") as f:
            text = f.read()
        meta, body = parse_frontmatter(text)
        name = meta.get("name") or os.path.basename(real)
        stats = _walk_stats(real)
        bins = re.search(r"^\s*bins:\s*\[([^\]]*)\]", text, re.M)
        declared = [b.strip().strip("'\"") for b in bins.group(1).split(",") if b.strip()] if bins else []
        skills.append({
            "id": skill_id(real),
            "name": name,
            "description": meta.get("description", ""),
            "real_path": real,
            "installs": installs,
            "skill_md_lines": text.count("\n") + 1,
            "skill_md_chars": len(text),
            "body": body,
            "stats": stats,
            "declared_bins": declared,
            "managed": managed.get(name) or managed.get(os.path.basename(real)),
        })

    # Several separate copies of a skill with the same name are worth flagging.
    names = {}
    for s in skills:
        names.setdefault(s["name"], []).append(s["id"])
    for s in skills:
        s["duplicates"] = [i for i in names[s["name"]] if i != s["id"]]

    for b in broken:
        b["id"] = skill_id("broken:" + b["path"])

    skills.sort(key=lambda s: s["name"].lower())
    return {"skills": skills, "broken": broken, "roots": root_info, "scanned_at": time.time()}
