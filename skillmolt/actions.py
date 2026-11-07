"""Uninstall and delete skills, reversibly.

- uninstall: remove one symlink that exposes a skill to one agent.
- delete:    move the skill folder to the system Trash and remove every
             symlink that pointed at it.

Every operation is written to ~/.skillmolt/history.json with enough
detail to undo it, and nothing is ever removed permanently.
"""

import json
import os
import shutil
import sys
import time
import uuid

STATE_DIR = os.path.expanduser("~/.skillmolt")
HISTORY_PATH = os.path.join(STATE_DIR, "history.json")
LEGACY_STATE_DIR = os.path.expanduser("~/.skill-sweep")  # name before the SkillMolt rename


class ActionError(Exception):
    pass


def trash_dir():
    if sys.platform == "darwin":
        path = os.path.expanduser("~/.Trash")
    elif sys.platform.startswith("linux"):
        base = os.environ.get("XDG_DATA_HOME") or os.path.expanduser("~/.local/share")
        path = os.path.join(base, "Trash", "files")
    else:
        path = os.path.join(STATE_DIR, "trash")
    os.makedirs(path, exist_ok=True)
    return path


def _migrate_legacy():
    """Carry undo history over from the old ~/.skill-sweep folder once."""
    if STATE_DIR != os.path.expanduser("~/.skillmolt"):
        return  # tests and custom setups manage their own state
    if os.path.isdir(LEGACY_STATE_DIR) and not os.path.exists(STATE_DIR):
        os.rename(LEGACY_STATE_DIR, STATE_DIR)


def load_history():
    _migrate_legacy()
    try:
        with open(HISTORY_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return []


def _save_history(history):
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = HISTORY_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    os.replace(tmp, HISTORY_PATH)


def _record(action, name, steps):
    entry = {
        "id": uuid.uuid4().hex[:10],
        "time": time.time(),
        "action": action,
        "name": name,
        "steps": steps,
        "restored": False,
    }
    history = load_history()
    history.insert(0, entry)
    _save_history(history)
    return entry


def _unlink(path):
    if not os.path.islink(path):
        raise ActionError("not a symlink: %s" % path)
    target = os.readlink(path)
    os.unlink(path)
    return {"op": "unlink", "path": path, "target": target}


def uninstall(skill, install_path):
    """Remove one symlink install of a skill."""
    install = next((i for i in skill["installs"] if i["path"] == install_path), None)
    if install is None:
        raise ActionError("unknown install")
    if install["kind"] != "link":
        raise ActionError("this install is the skill's own folder; use delete instead")
    step = _unlink(install_path)
    return _record("uninstall", skill["name"], [step])


def _delete_steps(skill):
    real = skill["real_path"]
    if not os.path.isdir(real):
        raise ActionError("folder no longer exists: %s" % real)
    steps = []
    for install in skill["installs"]:
        if install["kind"] == "link" and os.path.islink(install["path"]):
            steps.append(_unlink(install["path"]))
    dest = os.path.join(trash_dir(), "%s (skillmolt %s)" % (os.path.basename(real), time.strftime("%Y%m%d-%H%M%S")))
    n = 1
    while os.path.lexists(dest):
        n += 1
        dest = os.path.join(trash_dir(), "%s (skillmolt %s-%d)" % (os.path.basename(real), time.strftime("%Y%m%d-%H%M%S"), n))
    shutil.move(real, dest)
    steps.append({"op": "move", "src": real, "dst": dest})
    return steps


def delete(skill):
    """Move the skill folder to the Trash and drop every link to it."""
    return _record("delete", skill["name"], _delete_steps(skill))


def _record_partial(action, name, steps, err):
    """Keep whatever already happened undoable, then report the failure."""
    if steps:
        entry = _record(action, name, steps)
        raise ActionError("%s (partly done; undo it from History: %s)" % (err, entry["id"]))
    raise ActionError(str(err))


def delete_package(name, skills):
    """Delete every skill in a package as one undoable action."""
    steps = []
    for skill in skills:
        try:
            steps.extend(_delete_steps(skill))
        except (ActionError, OSError) as e:
            _record_partial("delete-package", name, steps, "%s: %s" % (skill["name"], e))
    return _record("delete-package", name, steps)


def uninstall_package(name, skills, agent):
    """Remove one agent's links to every skill in a package, as one action."""
    steps = []
    for skill in skills:
        for install in skill["installs"]:
            if install["agent"] != agent or install["kind"] != "link":
                continue
            try:
                steps.append(_unlink(install["path"]))
            except (ActionError, OSError) as e:
                _record_partial("uninstall-package", name, steps, "%s: %s" % (skill["name"], e))
    if not steps:
        raise ActionError("%s has no links in %s" % (name, agent))
    return _record("uninstall-package", "%s · %s" % (name, agent), steps)


def remove_broken(link_path, name):
    """Remove a symlink whose target no longer exists."""
    if not os.path.islink(link_path) or os.path.exists(link_path):
        raise ActionError("not a broken link: %s" % link_path)
    step = _unlink(link_path)
    return _record("remove-broken", name, [step])


def restore(entry_id):
    history = load_history()
    entry = next((e for e in history if e["id"] == entry_id), None)
    if entry is None:
        raise ActionError("unknown history entry")
    if entry["restored"]:
        raise ActionError("already restored")
    # Undo in reverse order: put the folder back before relinking to it.
    for step in reversed(entry["steps"]):
        if step["op"] == "move":
            if os.path.exists(step["src"]):
                raise ActionError("something already exists at %s" % step["src"])
            if not os.path.exists(step["dst"]):
                raise ActionError("no longer in the Trash: %s" % step["dst"])
            shutil.move(step["dst"], step["src"])
        elif step["op"] == "unlink":
            if not os.path.lexists(step["path"]):
                os.symlink(step["target"], step["path"])
    entry["restored"] = True
    entry["restored_at"] = time.time()
    _save_history(history)
    return entry
