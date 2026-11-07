"""Uninstall and delete skills, reversibly.

- uninstall: remove one symlink that exposes a skill to one agent.
- delete:    move the skill folder to the system Trash and remove every
             symlink that pointed at it.

Every operation is written to ~/.agent-skills-cleaner/history.json with enough
detail to undo it, and nothing is ever removed permanently.
"""

import json
import os
import shutil
import tarfile
import sys
import time
import uuid

from . import recovery

STATE_DIR = os.path.expanduser("~/.agent-skills-cleaner")
HISTORY_PATH = os.path.join(STATE_DIR, "history.json")
LEGACY_STATE_DIRS = [os.path.expanduser(p) for p in ("~/.skill-sweep", "~/.skillmolt")]  # earlier names of this tool


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
    """Move undo history and settings over from older folder names, file by file."""
    if STATE_DIR != os.path.expanduser("~/.agent-skills-cleaner"):
        return  # tests and custom setups manage their own state
    for old in LEGACY_STATE_DIRS:
        if not os.path.isdir(old):
            continue
        for name in ("history.json", "config.json"):
            src, dst = os.path.join(old, name), os.path.join(STATE_DIR, name)
            if os.path.isfile(src) and not os.path.exists(dst):
                os.makedirs(STATE_DIR, exist_ok=True)
                os.replace(src, dst)
        try:
            os.rmdir(old)  # only succeeds once nothing else is left in it
        except OSError:
            pass


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
    dest = os.path.join(trash_dir(), "%s (agent-skills-cleaner %s)" % (os.path.basename(real), time.strftime("%Y%m%d-%H%M%S")))
    n = 1
    while os.path.lexists(dest):
        n += 1
        dest = os.path.join(trash_dir(), "%s (agent-skills-cleaner %s-%d)" % (os.path.basename(real), time.strftime("%Y%m%d-%H%M%S"), n))
    try:
        backup = recovery.make_backup(real, STATE_DIR)
    except (OSError, tarfile.TarError):
        backup = None
    source = recovery.describe_source(skill)
    shutil.move(real, dest)
    steps.append({"op": "move", "src": real, "dst": dest, "backup": backup, "source": source})
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


def _keep_for_steps(skill, dest_dir):
    """Move one skill into a folder only a specific app reads, dropping every other link."""
    if not any(i["kind"] == "folder" for i in skill["installs"]):
        raise ActionError("%s lives outside the agents' skills folders (for example in a git repository); "
                          "move it by hand so that project is not broken" % skill["name"])
    real = skill["real_path"]
    dest = os.path.join(dest_dir, os.path.basename(real))
    if os.path.lexists(dest):
        raise ActionError("%s already exists" % dest)
    if os.path.realpath(os.path.dirname(real)) == os.path.realpath(dest_dir):
        raise ActionError("%s is already there" % skill["name"])
    steps = []
    for install in skill["installs"]:
        if install["kind"] == "link" and os.path.islink(install["path"]):
            steps.append(_unlink(install["path"]))
    os.makedirs(dest_dir, exist_ok=True)
    shutil.move(real, dest)
    steps.append({"op": "move", "src": real, "dst": dest})
    return steps


def keep_for(skill, reader, dest_dir):
    """Hide a skill from every agent except one app (e.g. DSH), as one undoable action."""
    return _record("keep-for", "%s → %s" % (skill["name"], reader), _keep_for_steps(skill, dest_dir))


def keep_package_for(name, skills, reader, dest_dir):
    steps = []
    for skill in skills:
        try:
            steps.extend(_keep_for_steps(skill, dest_dir))
        except (ActionError, OSError) as e:
            _record_partial("keep-for", "%s → %s" % (name, reader), steps, "%s: %s" % (skill["name"], e))
    return _record("keep-for", "%s → %s" % (name, reader), steps)


def remove_broken(link_path, name):
    """Remove a symlink whose target no longer exists."""
    if not os.path.islink(link_path) or os.path.exists(link_path):
        raise ActionError("not a broken link: %s" % link_path)
    step = _unlink(link_path)
    return _record("remove-broken", name, [step])


def _explain(err):
    if isinstance(err, PermissionError) and ".Trash" in str(err):
        return ("macOS blocked access to the Trash (%s). Run this tool from a terminal app that has "
                "Full Disk Access (System Settings > Privacy & Security), or put the folder back from Finder." % err)
    return str(err)


def _check_restorable(steps):
    """Pick how to undo every step, and fail before touching anything if one cannot be undone."""
    methods = []
    for step in steps:
        if step["op"] != "move":
            methods.append(None)
            continue
        if os.path.lexists(step["src"]):
            raise ActionError("something already exists at %s" % step["src"])
        method = recovery.method_for(step)
        if method is None:
            raise ActionError("%s can no longer be brought back: it is gone from the Trash and there is no "
                              "backup or known source to reinstall it from" % os.path.basename(step["src"]))
        methods.append(method)
    return methods


def undo_methods(entry):
    """For the History panel: how each deleted folder would come back, or None."""
    return [recovery.method_for(st) for st in entry["steps"] if st["op"] == "move"]


def history_view():
    out = []
    for e in load_history():
        e = dict(e)
        if not e.get("restored"):
            methods = undo_methods(e)
            e["undo"] = "none" if None in methods else sorted(set(methods)) or ["links"]
        out.append(e)
    return out


def restore(entry_id):
    history = load_history()
    entry = next((e for e in history if e["id"] == entry_id), None)
    if entry is None:
        raise ActionError("unknown history entry")
    if entry["restored"]:
        raise ActionError("already restored")
    steps = list(reversed(entry["steps"]))  # put folders back before relinking to them
    methods = _check_restorable(steps)
    done = []
    try:
        for step, method in zip(steps, methods):
            if step["op"] == "move":
                recovery.undo_move(step, method)
                done.append((step, method))
            elif step["op"] == "unlink" and not os.path.lexists(step["path"]):
                os.symlink(step["target"], step["path"])
                done.append((step, None))
    except (OSError, recovery.RecoveryError) as e:
        for step, method in reversed(done):  # leave things exactly as they were
            try:
                if step["op"] == "unlink":
                    os.unlink(step["path"])
                elif method == "trash":
                    shutil.move(step["src"], step["dst"])
                else:
                    shutil.rmtree(step["src"])  # we created it from a backup or a download
            except OSError:
                pass
        raise ActionError(_explain(e) if isinstance(e, OSError) else str(e))
    entry["restored_via"] = sorted({m for m in methods if m})
    entry["restored"] = True
    entry["restored_at"] = time.time()
    _save_history(history)
    return entry
