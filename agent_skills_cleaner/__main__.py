import argparse
import json
import os
import sys

from . import __version__
from .analyzer import analyze_with_models

LABELS = {"remove": "REMOVE  ", "consider": "CONSIDER", "keep": "KEEP    "}


def parse_roots(values):
    """--root "Agent=path" pairs; when given they replace the default folders."""
    roots = []
    for v in values or []:
        agent, sep, path = v.partition("=")
        if not sep:
            agent, path = os.path.basename(v.rstrip("/")) or v, v
        roots.append((agent, path))
    return roots or None


def report(as_json, roots=None):
    result = analyze_with_models(roots)
    if as_json:
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        print()
        return
    print("Models (detected from each agent's config):")
    for agent, p in result["profile"].items():
        if not (p.get("model") or p["readers"]):
            continue
        extra = "".join("; also read by %s (%s, %s)" % (r["name"], r["model"] or "?", r["tier"] or "?") for r in p["readers"])
        print("  %-20s %s (%s)%s -> judged as %s" % (agent, p.get("model") or "?", p.get("tier") or "?", extra, p["effective"]))
    print()
    for s in result["skills"]:
        agents = ", ".join(sorted({i["agent"] for i in s["installs"]}))
        print("%s %3d  %-34s %s" % (LABELS[s["verdict"]], s["score"], s["name"][:34], agents))
    for b in result["broken"]:
        print("BROKEN        %-34s %s -> %s" % (b["name"][:34], b["agent"], b["target"]))
    c = result["counts"]
    print("\n%d skills: %d remove, %d consider, %d keep, %d broken links"
          % (len(result["skills"]), c["remove"], c["consider"], c["keep"], len(result["broken"])))


def main(argv=None):
    p = argparse.ArgumentParser(prog="agent-skills-cleaner", description="Find agent skills that hold modern models back.")
    p.add_argument("--version", action="version", version=__version__)
    p.add_argument("--root", action="append", metavar="AGENT=PATH",
                   help="scan this skills folder instead of the defaults (repeatable)")
    sub = p.add_subparsers(dest="cmd")
    s = sub.add_parser("serve", help="open the web UI (default)")
    s.add_argument("--port", type=int, default=7457)
    s.add_argument("--no-browser", action="store_true")
    s.add_argument("--readonly", action="store_true", help="disable uninstall/delete")
    r = sub.add_parser("report", help="print the analysis in the terminal")
    r.add_argument("--json", action="store_true")
    args = p.parse_args(argv)

    if args.cmd == "report":
        report(args.json, parse_roots(args.root))
    else:
        from .server import serve
        serve(port=getattr(args, "port", 7457),
              open_browser=not getattr(args, "no_browser", False),
              readonly=getattr(args, "readonly", False),
              roots=parse_roots(args.root))


if __name__ == "__main__":
    main()
