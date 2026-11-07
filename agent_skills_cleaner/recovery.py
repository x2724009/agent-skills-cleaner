"""Ways to get a deleted skill back, best first:

1. trash     - the folder is still in the Trash
2. backup    - a .tar.gz copy taken right before deletion (kept BACKUP_DAYS)
3. git       - the skill lived in a git repository that is still on disk
4. download  - the installer's lock file recorded an archive URL or a git repo

Backups and sources are recorded on each "move" step in the undo history.
"""

import os
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
import urllib.error
import urllib.request

BACKUP_DAYS = 30
MAX_BACKUP_BYTES = 200 * 1024 * 1024
MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024


class RecoveryError(Exception):
    pass


# ---------------------------------------------------------------- backups

def backup_dir(state_dir):
    return os.path.join(state_dir, "backups")


def _folder_size(path):
    total = 0
    for root, _dirs, files in os.walk(path):
        for f in files:
            try:
                total += os.lstat(os.path.join(root, f)).st_size
            except OSError:
                pass
    return total


def make_backup(real_path, state_dir):
    """Archive a skill folder before it is deleted. Returns the archive path, or None if too big."""
    if _folder_size(real_path) > MAX_BACKUP_BYTES:
        return None
    folder = backup_dir(state_dir)
    os.makedirs(folder, exist_ok=True)
    name = "%s-%s" % (time.strftime("%Y%m%d-%H%M%S"), os.path.basename(real_path))
    path = os.path.join(folder, name + ".tar.gz")
    n = 1
    while os.path.exists(path):
        n += 1
        path = os.path.join(folder, "%s-%d.tar.gz" % (name, n))
    with tarfile.open(path, "w:gz") as tar:
        tar.add(real_path, arcname=os.path.basename(real_path))  # symlinks stay symlinks
    return path


def prune_backups(state_dir, days=BACKUP_DAYS):
    folder = backup_dir(state_dir)
    if not os.path.isdir(folder):
        return 0
    cutoff = time.time() - days * 86400
    removed = 0
    for name in os.listdir(folder):
        path = os.path.join(folder, name)
        try:
            if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                os.remove(path)
                removed += 1
        except OSError:
            pass
    return removed


def _extract_tar(archive, dest_dir):
    with tarfile.open(archive) as tar:
        if hasattr(tarfile, "tar_filter"):
            tar.extractall(dest_dir, filter="tar")
        else:
            tar.extractall(dest_dir)


# ---------------------------------------------------------------- sources

def _git(args, cwd=None, timeout=60):
    return subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, timeout=timeout)


def _git_root(path, stop):
    cur = os.path.dirname(path)
    while cur and cur.startswith(stop + os.sep):
        if os.path.exists(os.path.join(cur, ".git")):
            return cur
        cur = os.path.dirname(cur)
    return None


def describe_source(skill, home=None):
    """Where this skill came from, recorded at delete time so it can be reinstalled."""
    home = os.path.realpath(home or os.path.expanduser("~"))
    real = skill["real_path"]
    managed = skill.get("managed") or {}
    url = managed.get("source_url") or ""
    if url:
        kind = "archive" if re.search(r"\.(tar\.gz|tgz)$", url) else "git-url" if (url.endswith(".git") or "github.com/" in url) else "url"
        return {"kind": kind, "url": url, "label": managed.get("source") or url, "name": skill["name"],
                "folder": os.path.basename(real)}
    root = _git_root(real, home)
    if root and shutil.which("git"):
        try:
            commit = _git(["rev-parse", "HEAD"], cwd=root).stdout.strip()
            remote = _git(["remote", "get-url", "origin"], cwd=root).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            commit, remote = "", ""
        if commit:
            return {"kind": "git-repo", "repo": root, "path": os.path.relpath(real, root), "commit": commit,
                    "url": remote, "label": remote or root, "name": skill["name"], "folder": os.path.basename(real)}
    if skill.get("source_hint"):
        return {"kind": "link", "url": skill["source_hint"], "label": skill["source_hint"], "name": skill["name"]}
    return None


def can_reinstall(source):
    if not source:
        return False
    if source["kind"] == "git-repo":
        return os.path.isdir(os.path.join(source["repo"], ".git")) and bool(shutil.which("git"))
    if source["kind"] == "archive":
        return source["url"].startswith("https://")
    if source["kind"] == "git-url":
        return source["url"].startswith("https://") and bool(shutil.which("git"))
    return False


def _find_skill_dir(root, name, folder):
    """The folder under root that holds this skill's SKILL.md (matched by folder or frontmatter name)."""
    for cur, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        if "SKILL.md" not in files:
            continue
        if os.path.basename(cur) in (folder, name):
            return cur
        try:
            with open(os.path.join(cur, "SKILL.md"), encoding="utf-8", errors="replace") as f:
                head = f.read(2000)
        except OSError:
            continue
        if re.search(r"^name:\s*['\"]?%s['\"]?\s*$" % re.escape(name), head, re.M):
            return cur
    return None


def _download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "agent-skills-cleaner"})
    with urllib.request.urlopen(req, timeout=60) as resp, open(dest, "wb") as out:
        total = 0
        while True:
            chunk = resp.read(65536)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_DOWNLOAD_BYTES:
                raise RecoveryError("download is larger than %d MB" % (MAX_DOWNLOAD_BYTES // 1048576))
            out.write(chunk)


def reinstall(source, target):
    """Put the skill back at target from its recorded source."""
    if os.path.lexists(target):
        raise RecoveryError("something already exists at %s" % target)
    kind = source["kind"]
    if kind == "git-repo":
        r = _git(["checkout", source["commit"], "--", source["path"]], cwd=source["repo"])
        if r.returncode != 0:
            raise RecoveryError("git could not restore %s: %s" % (source["path"], r.stderr.strip()[:300]))
        if not os.path.isdir(target):
            raise RecoveryError("git restored the files somewhere else; expected %s" % target)
        return
    tmp = tempfile.mkdtemp(prefix="agent-skills-cleaner-")
    try:
        if kind == "archive":
            archive = os.path.join(tmp, "skill.tar.gz")
            _download(source["url"], archive)
            out = os.path.join(tmp, "x")
            os.makedirs(out)
            _extract_tar(archive, out)
        elif kind == "git-url":
            out = os.path.join(tmp, "repo")
            r = _git(["clone", "--depth", "1", source["url"], out], timeout=180)
            if r.returncode != 0:
                raise RecoveryError("git clone failed: %s" % r.stderr.strip()[:300])
        else:
            raise RecoveryError("no automatic way to reinstall from %s" % source.get("label"))
        found = _find_skill_dir(out, source["name"], source.get("folder") or source["name"])
        if not found and os.path.isfile(os.path.join(out, "SKILL.md")):
            found = out
        if not found:
            raise RecoveryError("could not find %s in the download" % source["name"])
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.move(found, target)
    except (OSError, urllib.error.URLError, subprocess.SubprocessError, tarfile.TarError) as e:
        raise RecoveryError(str(e))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ---------------------------------------------------------------- per step

def method_for(step):
    """How a recorded "move" step can be undone right now: trash, backup, reinstall or None."""
    try:
        os.lstat(step["dst"])
        return "trash"
    except FileNotFoundError:
        pass
    except OSError:
        pass  # blocked (macOS privacy); fall through to the other ways
    if step.get("backup") and os.path.isfile(step["backup"]):
        return "backup"
    if can_reinstall(step.get("source")):
        return "reinstall"
    return None


def undo_move(step, method):
    src = step["src"]
    if method == "trash":
        shutil.move(step["dst"], src)
    elif method == "backup":
        parent = os.path.dirname(src)
        tmp = tempfile.mkdtemp(prefix="agent-skills-cleaner-", dir=parent if os.path.isdir(parent) else None)
        try:
            _extract_tar(step["backup"], tmp)
            entries = os.listdir(tmp)
            if len(entries) != 1:
                raise RecoveryError("unexpected backup layout in %s" % step["backup"])
            shutil.move(os.path.join(tmp, entries[0]), src)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    elif method == "reinstall":
        reinstall(step["source"], src)
    else:
        raise RecoveryError("no way to bring back %s" % src)
