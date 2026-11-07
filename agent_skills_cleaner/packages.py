"""Group skills into packages (bundles that were installed together).

Signals, strongest first. A skill takes the first one that applies:

1. lock    - an installer lock file records where it came from
2. plugin  - an ancestor folder holds a .claude-plugin/plugin.json
3. git     - an ancestor folder (not a skills root) is a git repository
4. known   - the known-stale list puts it in a named group
5. folder  - it lives with sibling skills in a folder that is not a skills root
6. prefix  - three or more leftover skills share a name prefix (a guess)

Groups with a single member are dropped: a package of one is just a skill.
"""

import hashlib
import json
import os

MIN_PREFIX_MEMBERS = 3


def _pkg_id(kind, key):
    return "pkg-" + hashlib.sha1((kind + ":" + key).encode("utf-8")).hexdigest()[:10]


def _common_prefix_name(names):
    parts = [n.split("-")[0] for n in names]
    return parts[0] if parts and len(parts[0]) >= 3 and all(p == parts[0] for p in parts) else None


def _ancestors(path, stop):
    """Yield parent folders of path, nearest first, staying below stop."""
    cur = os.path.dirname(path)
    while cur and cur != stop and cur != os.path.dirname(cur):
        if not cur.startswith(stop + os.sep):
            return
        yield cur
        cur = os.path.dirname(cur)


def _plugin_name(folder):
    manifest = os.path.join(folder, ".claude-plugin", "plugin.json")
    try:
        with open(manifest, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("name") or os.path.basename(folder)
    except (OSError, ValueError, AttributeError):
        return None


def _container(skill, root_reals, home):
    """Return (kind, key, name, detail) from the skill's own location, or None."""
    real = skill["real_path"]
    for folder in _ancestors(real, home):
        if folder in root_reals:
            break
        name = _plugin_name(folder)
        if name:
            return ("plugin", folder, name, folder)
        if os.path.exists(os.path.join(folder, ".git")):
            return ("git", folder, os.path.basename(folder), folder)
    return None


def _folder_key(skill, root_reals):
    parent = os.path.dirname(skill["real_path"])
    if parent in root_reals:
        return None
    base = os.path.basename(parent)
    name = os.path.basename(os.path.dirname(parent)) if base in ("skills", "skill") else base
    return (parent, name)


def group(skills, roots, home=None):
    """Attach skill["package"] and return the list of packages."""
    home = os.path.realpath(home or os.path.expanduser("~"))
    root_reals = {os.path.realpath(r["path"]) for r in roots}
    buckets = {}  # (kind, key) -> {"name", "detail", "skills": []}

    def put(kind, key, name, detail, skill):
        b = buckets.setdefault((kind, key), {"name": name, "detail": detail, "skills": []})
        b["skills"].append(skill)

    leftover = []
    for s in skills:
        managed = s.get("managed") or {}
        source = managed.get("source")
        if source:
            put("lock", source, None, source, s)
            continue
        found = _container(s, root_reals, home)
        if found:
            put(found[0], found[1], found[2], found[3], s)
            continue
        if s.get("group"):
            put("known", s["group"], s["group"], None, s)
            continue
        leftover.append(s)

    rest = []
    folders = {}
    for s in leftover:
        fk = _folder_key(s, root_reals)
        if fk:
            folders.setdefault(fk, []).append(s)
        else:
            rest.append(s)
    for (parent, name), members in folders.items():
        if len(members) > 1:
            for s in members:
                put("folder", parent, name, parent, s)
        else:
            rest.extend(members)

    prefixes = {}
    for s in rest:
        if "-" in s["name"]:
            prefixes.setdefault(s["name"].split("-")[0], []).append(s)
    for prefix, members in prefixes.items():
        if len(prefix) >= 3 and len(members) >= MIN_PREFIX_MEMBERS:
            for s in members:
                put("prefix", prefix, prefix, None, s)

    packages = []
    for (kind, key), b in buckets.items():
        members = b["skills"]
        if len(members) < 2:
            continue
        name = b["name"]
        if kind == "lock":
            name = key.rstrip("/").split("/")[-1] if "/" in key else (_common_prefix_name([m["name"] for m in members]) or key)
        pid = _pkg_id(kind, key)
        counts = {"remove": 0, "consider": 0, "keep": 0}
        for m in members:
            m["package"] = pid
            counts[m["verdict"]] += 1
        packages.append({
            "id": pid,
            "name": name,
            "kind": kind,
            "detail": b["detail"],
            "guessed": kind == "prefix",
            "skill_ids": [m["id"] for m in members],
            "counts": counts,
        })
    for s in skills:
        s.setdefault("package", None)
    packages.sort(key=lambda p: (-p["counts"]["remove"], -p["counts"]["consider"], -len(p["skill_ids"]), p["name"].lower()))
    return packages
