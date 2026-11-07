"""Score how much a skill is likely to hold a modern model back.

The score ("drag index", 0-100) comes from two sources:
  1. heuristics over the skill's files and wording, and
  2. a curated list of skills known to be superseded (data/known.json).

Heuristics only say "this looks like X". The curated list is where people
record actual experience, so its verdict wins when both exist.
"""

import json
import os
import re
import time

from .packages import group as group_packages

HERE = os.path.dirname(os.path.abspath(__file__))
KNOWN_PATH = os.path.join(HERE, "data", "known.json")

REMOVE_AT = 60
CONSIDER_AT = 35

STRONG_DIRECTIVES = re.compile(
    r"\b(MUST|ALWAYS|NEVER|REQUIRED|MANDATORY|NON-NEGOTIABLE)\b"
    r"|\b(every|any) (conversation|task|response|time)\b"
    r"|\bbefore (any|every|touching|writing)\b"
    r"|\boverrides?\b"
    r"|必须|一律|无论如何|每次|绝不|不得|强制",
)
SKILL_CHAINING = re.compile(r"Skill tool|invoke (the )?skill|use (the )?\S+ skill|REQUIRED SUB-?SKILL|调用.{0,6}技能|先加载", re.I)
PROCESS_WORDS = re.compile(
    r"brainstorm|implementation plan|red[- ]green|test[- ]first|TDD|subagent|checkpoint|checklist|"
    r"spec review|worktree|头脑风暴|实施计划|检查清单",
    re.I,
)
GENERIC_ADVICE = re.compile(
    r"best practices|guidelines|common (LLM )?mistakes|truncation|placeholder|behavioral|"
    r"code quality|be thorough|think step|最佳实践|行为准则|注意事项",
    re.I,
)
BROAD_TRIGGER = re.compile(
    r"(any|every) (conversation|task|request)|starting any|whenever|even if the user|"
    r"即使用户|都应该触发|触发词包括|只要",
    re.I,
)
STUB_WORDS = re.compile(r"redirect|deprecated|handled by|统一交由|已废弃|请改用", re.I)
CODE_BLOCK = re.compile(r"```(bash|sh|shell|zsh|console|text|)\s*\n(.*?)```", re.S)
INLINE_CMD = re.compile(r"`([a-z][\w.-]*) [a-z+-][^`]*`")
# Commands every model already knows; teaching them adds nothing.
COMMON_CMDS = {
    "cd", "export", "echo", "cat", "ls", "mkdir", "cp", "mv", "rm", "source", "sudo", "git", "python",
    "python3", "node", "npm", "pip", "pip3", "curl", "wget", "open", "brew", "grep", "find", "sed", "awk",
    "chmod", "touch", "head", "tail", "if", "for", "then", "do", "done", "fi", "import", "from", "const",
    "let", "def", "return", "function", "class", "var", "print", "true", "false", "null", "npx", "uvx",
    "pipx", "du", "df", "ps", "kill", "which", "test", "make", "docker", "jq", "tar", "zip", "unzip",
}


def _cli_commands(body):
    """Specific commands a skill teaches, seen at least three times."""
    found = {}

    def add(cmd, rest):
        if cmd in ("npx", "uvx", "pipx") and rest:
            cmd = rest[0]
        if cmd not in COMMON_CMDS and re.match(r"^[a-z][\w.-]*$", cmd):
            found[cmd] = found.get(cmd, 0) + 1

    for _, block in CODE_BLOCK.findall(body):
        for line in block.splitlines():
            words = line.strip().lstrip("$ ").split()
            if len(words) >= 2 and not words[0].startswith("#"):
                add(words[0], words[1:])
    for cmd, in ((m,) for m in INLINE_CMD.findall(body)):
        add(cmd, [])
    return [c for c in sorted(found, key=lambda c: -found[c]) if found[c] >= 3]


# Tiers, strongest first. A skill's overall verdict follows the weakest
# model that can see it, since deleting it takes it from every agent.
TIERS = ("frontier", "mid", "small")
TIER_WEIGHT = {"frontier": 1.0, "mid": 0.5, "small": 0.2}
TIER_NAMES = {
    "frontier": {"zh": "前沿模型", "en": "frontier"},
    "mid": {"zh": "中档模型", "en": "mid-range"},
    "small": {"zh": "小模型", "en": "small"},
}
# Points that reflect "the model already knows how to do this".
CAPABILITY_REASONS = {"pure_prompt", "overrides", "chains_skills", "process_heavy", "generic_advice"}
# How a known-list verdict (written for frontier models) relaxes for weaker ones.
KNOWN_BY_TIER = {
    "remove": {"frontier": "remove", "mid": "consider", "small": "keep"},
    "consider": {"frontier": "consider", "mid": "keep", "small": "keep"},
    "keep": {"frontier": "keep", "mid": "keep", "small": "keep"},
}


def load_known(path=KNOWN_PATH):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f).get("rules", [])
    except (OSError, ValueError):
        return []


def _match_known(skill, known):
    names = {skill["name"].lower(), os.path.basename(skill["real_path"]).lower()}
    for rule in known:
        if names & {n.lower() for n in rule.get("names", [])}:
            return rule
    return None


def _reason(rid, kind, points, zh, en):
    return {"id": rid, "kind": kind, "points": points, "zh": zh, "en": en}


def analyze_skill(skill, known=None, now=None):
    known = known if known is not None else load_known()
    now = now or time.time()
    st = skill["stats"]
    body = skill.get("body", "")
    desc = skill.get("description", "")
    lines = skill["skill_md_lines"]
    reasons = []

    commands = skill.get("declared_bins", []) + [c for c in _cli_commands(body) if c not in skill.get("declared_bins", [])]
    has_tools = st["code_files"] > 0 or bool(st["tool_markers"])
    if not has_tools and commands:
        has_tools = True
        shown = "、".join(commands[:3])
        reasons.append(_reason("teaches_cli", "good", -30,
            "教模型使用具体的命令行工具（%s），这是模型不知道的接口细节" % shown,
            "Teaches a specific command-line tool (%s) - interface details a model does not know" % ", ".join(commands[:3])))
    elif has_tools:
        reasons.append(_reason("has_tools", "good", -35,
            "带脚本或命令行工具（%d 个代码文件），这是模型无法凭空替代的能力" % st["code_files"],
            "Ships scripts or a CLI (%d code files) - something a model cannot do on its own" % st["code_files"]))
    else:
        reasons.append(_reason("pure_prompt", "bad", 25,
            "纯提示词：没有脚本或工具，只是告诉模型该怎么想、怎么做",
            "Prompt only: no scripts or tools, it just tells the model how to think"))
        if st["data_dirs"]:
            reasons.append(_reason("has_data", "good", -10,
                "附带参考资料或模板（%s），可能包含模型不知道的规范" % "、".join(st["data_dirs"]),
                "Bundles reference material (%s) the model may not know" % ", ".join(st["data_dirs"])))

    directives = len(STRONG_DIRECTIVES.findall(body))
    density = directives * 100.0 / max(lines, 1)
    if directives >= 8 and density >= 4:
        reasons.append(_reason("overrides", "bad", 20,
            "大量强制指令（%d 处“必须/永远/每次”），会压过模型自己的判断" % directives,
            "Heavy on hard rules (%d MUST/ALWAYS/every-time), overriding the model's own judgement" % directives))
    elif directives >= 4:
        reasons.append(_reason("overrides", "bad", 10,
            "有不少强制指令（%d 处）" % directives,
            "Several hard rules (%d)" % directives))

    if len(SKILL_CHAINING.findall(body)) >= 3:
        reasons.append(_reason("chains_skills", "bad", 10,
            "要求先调用其他技能，层层套娃，增加每次任务的流程负担",
            "Makes the model invoke other skills first, adding overhead to every task"))

    if len(PROCESS_WORDS.findall(body)) >= 4 and not has_tools:
        reasons.append(_reason("process_heavy", "bad", 10,
            "规定了一整套固定流程（计划、清单、子任务……），简单任务也会被拖长",
            "Prescribes a fixed ceremony (plans, checklists, subagents) even for simple work"))

    if GENERIC_ADVICE.search(desc) and not has_tools:
        reasons.append(_reason("generic_advice", "bad", 10,
            "通用的写作或编码建议，前沿模型已经内化",
            "Generic writing/coding advice that frontier models have internalised"))

    if lines > 400 and not has_tools:
        reasons.append(_reason("long_prompt", "bad", 10,
            "说明有 %d 行，每次触发都要读完，占用上下文" % lines,
            "%d-line instructions loaded on every trigger, eating context" % lines))

    if len(desc) > 500 or BROAD_TRIGGER.search(desc):
        reasons.append(_reason("broad_trigger", "bad", 10,
            "触发条件太宽，容易在不需要的时候被调用",
            "Trigger conditions are broad, so it fires when not needed"))

    if lines < 25 and STUB_WORDS.search(body + desc):
        reasons.append(_reason("stub", "info", 5,
            "只是一个转发壳，实际工作交给别的技能",
            "Just a redirect stub that hands off to another skill"))

    age_days = (now - st["newest"]) / 86400 if st["newest"] else 0
    if age_days > 365 and not has_tools:
        reasons.append(_reason("stale", "bad", 5,
            "超过 %d 天没有更新，写于更早一代模型" % int(age_days),
            "Untouched for %d days, written for an older model generation" % int(age_days)))

    if skill.get("duplicates"):
        reasons.append(_reason("duplicate", "info", 0,
            "电脑上还有 %d 份同名的独立副本" % len(skill["duplicates"]),
            "%d other separate copies with the same name exist" % len(skill["duplicates"])))

    if skill.get("managed"):
        reasons.append(_reason("managed", "info", 0,
            "由安装器管理（%s），删除后可能在更新时被装回" % (skill["managed"].get("source") or "lock file"),
            "Managed by an installer (%s); it may come back on update" % (skill["managed"].get("source") or "lock file")))

    base = sum(r["points"] for r in reasons)
    capability = sum(r["points"] for r in reasons if r["id"] in CAPABILITY_REASONS)
    rule = _match_known(skill, known)
    if rule:
        reasons.insert(0, _reason("known", rule.get("verdict", "consider") == "keep" and "good" or "bad", 0,
                                  rule["reason"]["zh"], rule["reason"]["en"]))

    tiers = {t: _score_for_tier(base, capability, rule, t) for t in TIERS}
    top = tiers["frontier"]
    return {
        "score": top["score"],
        "verdict": top["verdict"],
        "reasons": reasons,
        "tiers": tiers,
        "known": bool(rule),
        "group": rule.get("group") if rule else None,
    }


def _verdict(score):
    if score >= REMOVE_AT:
        return "remove"
    if score >= CONSIDER_AT:
        return "consider"
    return "keep"


def _score_for_tier(base, capability, rule, tier):
    """Score a skill for one model tier.

    Weaker models still benefit from being told how to plan, verify and
    follow a process, so the capability-related points count for less.
    """
    keep_share = TIER_WEIGHT[tier]
    adjust = -int(round(capability * (1 - keep_share))) if capability > 0 else 0
    score = base + adjust
    known_verdict = None
    if rule:
        known_verdict = (rule.get("by_tier") or {}).get(tier) or KNOWN_BY_TIER.get(rule.get("verdict", "consider"), {}).get(tier)
        if known_verdict == "remove":
            score = max(score, 75)
        elif known_verdict == "consider":
            score = min(max(score, CONSIDER_AT + 5), REMOVE_AT - 1)
        elif known_verdict == "keep":
            score = min(score, 15)
    score = max(0, min(100, score))
    note = None
    if tier != "frontier" and (adjust or (rule and known_verdict != rule.get("verdict"))):
        pct = int(round(keep_share * 100))
        note = _reason("tier_adjust", "good", adjust,
            "按%s评判：提示词、流程、强制指令这些“模型自己会的”部分只算 %d%%%s" % (
                TIER_NAMES[tier]["zh"], pct, "；已知清单的结论也相应放宽" if rule else ""),
            "Judged for a %s model: points for what strong models already do (prompting, process, hard rules) count %d%%%s" % (
                TIER_NAMES[tier]["en"], pct, "; the known-list verdict is relaxed too" if rule else ""))
    return {"score": score, "verdict": _verdict(score), "adjust": note}


def analyze(scan_result, known=None, agent_tiers=None):
    """agent_tiers maps an agent name to "frontier", "mid" or "small".
    Agents without a tier are treated as frontier."""
    known = known if known is not None else load_known()
    agent_tiers = agent_tiers or {}
    out = []
    for skill in scan_result["skills"]:
        item = {k: v for k, v in skill.items() if k != "body"}
        item.update(analyze_skill(skill, known))
        seen = {i["agent"]: (agent_tiers.get(i["agent"]) or "frontier") for i in item["installs"]}
        item["agent_tiers"] = seen
        weakest = max((TIERS.index(t) for t in seen.values()), default=0)
        item["tier"] = TIERS[weakest]
        item["score"] = item["tiers"][item["tier"]]["score"]
        item["verdict"] = item["tiers"][item["tier"]]["verdict"]
        out.append(item)
    order = {"remove": 0, "consider": 1, "keep": 2}
    out.sort(key=lambda s: (order[s["verdict"]], -s["score"], s["name"].lower()))
    packages = group_packages(out, scan_result["roots"])
    counts = {"remove": 0, "consider": 0, "keep": 0}
    for s in out:
        counts[s["verdict"]] += 1
    return {
        "skills": out,
        "packages": packages,
        "broken": scan_result["broken"],
        "roots": scan_result["roots"],
        "scanned_at": scan_result["scanned_at"],
        "counts": counts,
        "home": os.path.expanduser("~"),
    }
