(function () {
  "use strict";

  const CFG = window.AGENT_SKILLS_CLEANER;
  const $ = (sel) => document.querySelector(sel);

  const I18N = {
    zh: {
      tagline: "管理电脑上所有 AI 工具的 skills，按你实际用的模型找出没必要的那些",
      rescan: "重新扫描",
      history: "操作记录",
      readonlyBanner: "只读模式：可以查看分析结果，卸载和删除已禁用",
      howTitle: "拖累指数是怎么算的？",
      howBody:
        "<ul>" +
        "<li><b>纯提示词</b>（没有脚本、没有命令行工具）先 +25：它只是在告诉模型怎么想，而前沿模型多半已经会了。</li>" +
        "<li><b>强制指令多</b>（大量“必须/永远/每次”）、<b>要求先调用别的技能</b>、<b>规定冗长流程</b>、<b>说明过长</b>、<b>触发范围过宽</b>、<b>长期未更新</b>，各自加分。</li>" +
        "<li><b>带脚本或工具</b>、<b>教模型用具体的命令行接口</b>、<b>附带参考资料</b>会减分——这些是模型凭空做不到的。</li>" +
        "<li><b>已知过时清单</b>（社区维护的 known.json）优先于自动规则。</li>" +
        "<li><b>按档位</b>：自动从各工具的配置文件识别它用的模型和档位，“模型自己会的”那几项加分，中档模型只算 50%，小模型只算 20%；结论按能看到它的最弱模型来定。</li>" +
        "<li>≥60 建议删除，35–59 可以考虑，&lt;35 保留。分数只是参考，最终由你决定。</li>" +
        "</ul>" +
        "<p class='muted'>“卸载”只解除某个工具与技能的链接，原文件不动；“删除”把技能文件夹移到废纸篓并解除所有链接。两者都能在操作记录里一键撤销。</p>",
      search: "搜索名称或介绍…",
      allAgents: "全部工具",
      agentsLabel: "所在工具",
      editModels: "模型识别",
      modelsTitle: "每个工具用的是什么模型",
      modelsHint: "模型和档位是从各工具的配置文件里自动识别的。识别不准时可以在这里改，留空就用自动识别的结果。",
      modelPlaceholder: "没识别到，可手动填写",
      tierUnset: "档位未设置",
      tier_frontier: "前沿模型",
      tier_mid: "中档模型",
      tier_small: "小模型",
      save: "保存",
      saved: "模型设置已保存",
      noModel: "未识别到模型",
      srcManual: "手动设置",
      srcDefault: "默认（该工具只用这家模型）",
      srcFile: (f) => "读取自 " + f,
      srcNone: "没找到配置",
      tierAuto: (x) => "自动：" + x,
      tierUnknown: "未识别",
      alsoReads: (n, m, tier) => n + " 也会读取这个目录：" + m + "（" + tier + "）",
      readerNote: (n, m, tier) => n + " 会读取所有工具的技能目录，它用的是 " + m + "（" + tier + "），所以这些目录都至少按" + tier + "评判。",
      judgedAs: (tier) => "按" + tier + "评判",
      judgedWhy: "删除会让所有工具都失去它，所以整体结论按能看到它的最弱模型来定；卸载时看每个工具自己的结论。",
      judgedForAgent: (a, tier) => "当前按 " + a + " 的" + tier + "显示",
      total: "全部技能",
      remove: "建议删除",
      consider: "可以考虑",
      keep: "建议保留",
      broken: "失效链接",
      hintRemove: "跟不上现在的模型，反而拖累它",
      hintConsider: "价值有限，看你用不用",
      hintKeep: "带工具或模型不知道的知识",
      score: "拖累指数",
      overview: (r, n) => "<b>" + r + "</b>个建议删除<span class='of'>· 共 " + n + " 个技能</span>",
      all: "全部",
      reasons: "评分理由",
      installedIn: "安装位置",
      description: "介绍",
      moreAgents: (n) => " 等 " + n + " 个",
      expand: "展开详情",
      viewVerdict: "按结论",
      viewPackage: "按技能包",
      ungrouped: "未归入技能包",
      ungroupedHint: "单独安装的技能",
      pkgSkills: (n) => n + " 个技能",
      pkgCounts: (r, c) => (r ? r + " 个建议删除" : "") + (r && c ? " · " : "") + (c ? c + " 个可以考虑" : ""),
      pkgAllKeep: "全部建议保留",
      kind_lock: "安装器记录",
      kind_plugin: "插件",
      kind_git: "git 仓库",
      kind_known: "已知清单",
      kind_folder: "同一文件夹",
      kind_prefix: "按名称推测",
      pkgSource: "来源",
      pkgDelete: "整包删除",
      pkgUninstall: (a) => "从 " + a + " 卸载整包",
      confirmPkgDeleteTitle: (n, k) => "删除技能包 " + n + "（" + k + " 个技能）？",
      confirmPkgDeleteBody: "包里每个技能的文件夹都会移到废纸篓，并解除所有链接。删除前会自动备份，清空废纸篓后 30 天内也能在操作记录里一键撤销：",
      pkgKeepWarn: (n) => "注意：包里有 " + n + " 个技能被评为“建议保留”，也会一起删除。",
      pkgGuessWarn: "注意：这个包是按名称前缀推测的，请确认这些技能确实属于同一套。",
      confirmPkgUninstallTitle: (n, a) => "从 " + a + " 卸载技能包 " + n + "？",
      confirmPkgUninstallBody: "只解除该工具里的这些链接，技能文件和其他工具不受影响：",
      "act_delete-package": "删除技能包",
      "act_uninstall-package": "卸载技能包",
      "act_keep-for": "只留给某个应用",
      keepFor: (r) => "只留给 " + r,
      keepPkgFor: (r) => "整包只留给 " + r,
      readerTag: (r) => "可只留给 " + r,
      readerFilter: (r) => "可只留给 " + r,
      readerHint: (r, m, tier, v, score) => "对只用前沿模型的工具（Claude、GPT）来说，它是「" + v + "」（" + score + " 分）。但 " + r + " 用的 " + m + " 是" + tier + "，可能还用得上。可以只留给 " + r + "：从其他工具里移除，只让 " + r + " 读到。",
      notMovable: "它的本体在 git 仓库等其他项目里，为了不破坏那个项目，这里不自动移动，请手动处理。",
      confirmKeepTitle: (n, r) => "把 " + n + " 只留给 " + r + "？",
      confirmKeepBody: (r, home) => "会移除其他工具里的链接，并把技能文件夹移到 " + home + "，之后只有 " + r + " 能读到。可以在操作记录里撤销：",
      moveTo: "移到",
      known: "已知过时",
      link: "链接",
      folder: "本体",
      uninstall: "卸载",
      delete: "删除",
      reveal: "在访达中显示",
      lines: "行",
      select: "选中",
      bulk: (n) => "删除选中的 " + n + " 个",
      emptyList: "没有符合条件的技能",
      brokenTitle: "失效链接",
      brokenHint: "指向的文件夹已经不存在",
      removeLink: "移除",
      cancel: "取消",
      confirmUninstallTitle: (n, a) => "从 " + a + " 卸载 " + n + "？",
      confirmUninstallBody: "只会移除这一个链接，技能原文件和其他工具里的链接都不受影响：",
      confirmDeleteTitle: (n) => "删除 " + n + "？",
      confirmBulkTitle: (n) => "删除 " + n + " 个技能？",
      confirmDeleteBody: "技能文件夹会被移到废纸篓，所有指向它的链接都会被移除。删除前会自动备份一份，即使清空了废纸篓，30 天内也能在“操作记录”里撤销：",
      moveToTrash: "移到废纸篓",
      unlinkFrom: "移除链接",
      outsideRoot: "注意：这个技能的原文件不在任何工具的技能目录里，而是在上面这个位置，它可能属于别的项目。",
      managedWarn: (s) => "注意：这个技能由安装器管理（" + s + "），更新时可能被装回来。",
      doUninstall: "卸载",
      doDelete: "移到废纸篓",
      done: "完成",
      undo: "撤销",
      restored: "已撤销",
      restore: "撤销",
      noHistory: "还没有操作记录",
      historyHint: "所有操作都记在 ~/.agent-skills-cleaner/history.json。撤销时依次尝试：从废纸篓放回 → 从备份恢复（保留 30 天）→ 从原来的安装地址重新下载。",
      undo_trash: "可从废纸篓放回",
      undo_backup: "废纸篓已清空，可从备份恢复",
      undo_reinstall: "可从原地址重新下载",
      undo_links: "可恢复链接",
      undo_none: "已无法撤销：废纸篓已清空，也没有备份或可重装的来源",
      sourceLabel: "来源",
      backedUp: "已备份",
      act_uninstall: "卸载",
      act_delete: "删除",
      "act_remove-broken": "移除失效链接",
      error: "出错了：",
    },
    en: {
      tagline: "Manage every agent's skills and find the ones your models have outgrown",
      rescan: "Rescan",
      history: "History",
      readonlyBanner: "Read-only mode: analysis only, uninstall and delete are disabled",
      howTitle: "How is the drag index calculated?",
      howBody:
        "<ul>" +
        "<li><b>Prompt-only</b> skills (no scripts, no CLI) start at +25: they tell the model how to think, which frontier models mostly already know.</li>" +
        "<li>Points are added for <b>lots of hard rules</b> (MUST/ALWAYS/every time), <b>chaining other skills</b>, <b>prescribed ceremony</b>, <b>very long instructions</b>, <b>broad triggers</b> and <b>staleness</b>.</li>" +
        "<li>Points are removed for <b>bundled scripts or tools</b>, <b>teaching a specific CLI</b> and <b>reference material</b> - things a model cannot do from scratch.</li>" +
        "<li>The community-maintained <b>known list</b> (known.json) wins over heuristics.</li>" +
        "<li><b>By tier</b>: each agent's model is detected from its config file. Points for what strong models already do count 50% for mid-range and 20% for small models, and the verdict follows the weakest model that can see the skill.</li>" +
        "<li>≥60 remove, 35–59 consider, &lt;35 keep. The score is advice; you decide.</li>" +
        "</ul>" +
        "<p class='muted'>Uninstall removes one agent's link and leaves the files alone. Delete moves the skill folder to the Trash and removes every link. Both can be undone from History.</p>",
      search: "Search name or description…",
      allAgents: "All agents",
      agentsLabel: "Agent",
      editModels: "Models",
      modelsTitle: "Which model each agent runs",
      modelsHint: "Models and tiers are detected from each agent's config files. Correct them here if detection is wrong; leave a field empty to use the detected value.",
      modelPlaceholder: "Not detected; type one",
      tierUnset: "Tier not set",
      tier_frontier: "Frontier",
      tier_mid: "Mid-range",
      tier_small: "Small",
      save: "Save",
      saved: "Models saved",
      noModel: "No model found",
      srcManual: "set by you",
      srcDefault: "default (this agent only runs one vendor)",
      srcFile: (f) => "from " + f,
      srcNone: "no config found",
      tierAuto: (x) => "Auto: " + x,
      tierUnknown: "unknown",
      alsoReads: (n, m, tier) => n + " also reads this folder: " + m + " (" + tier + ")",
      readerNote: (n, m, tier) => n + " reads every agent's skills folder with " + m + " (" + tier + "), so each folder is judged at " + tier + " or below.",
      judgedAs: (tier) => "Judged for a " + tier + " model",
      judgedWhy: "Deleting removes it from every agent, so the overall verdict follows the weakest model that can see it. For uninstalling, check each agent's own verdict.",
      judgedForAgent: (a, tier) => "Showing " + a + "'s " + tier + " verdict",
      total: "All skills",
      remove: "Remove",
      consider: "Consider",
      keep: "Keep",
      broken: "Broken links",
      hintRemove: "Outpaced by current models, now a drag",
      hintConsider: "Limited value, your call",
      hintKeep: "Ships tools or knowledge models lack",
      score: "Drag",
      overview: (r, n) => "<b>" + r + "</b>to remove<span class='of'>· " + n + " skills scanned</span>",
      all: "All",
      reasons: "Why this score",
      installedIn: "Installed in",
      description: "About",
      moreAgents: (n) => " +" + (n - 1),
      expand: "Show details",
      viewVerdict: "By verdict",
      viewPackage: "By package",
      ungrouped: "Not in a package",
      ungroupedHint: "Installed on their own",
      pkgSkills: (n) => n + " skills",
      pkgCounts: (r, c) => (r ? r + " to remove" : "") + (r && c ? " · " : "") + (c ? c + " to consider" : ""),
      pkgAllKeep: "All worth keeping",
      kind_lock: "installer",
      kind_plugin: "plugin",
      kind_git: "git repo",
      kind_known: "known list",
      kind_folder: "same folder",
      kind_prefix: "guessed from names",
      pkgSource: "Source",
      pkgDelete: "Delete package",
      pkgUninstall: (a) => "Uninstall from " + a,
      confirmPkgDeleteTitle: (n, k) => "Delete package " + n + " (" + k + " skills)?",
      confirmPkgDeleteBody: "Every skill folder in the package goes to the Trash and every link is removed. Each one is backed up first, so you can undo the whole package from History for 30 days, even after emptying the Trash:",
      pkgKeepWarn: (n) => "Note: " + n + " skills in this package are rated keep and will be deleted too.",
      pkgGuessWarn: "Note: this package was guessed from name prefixes. Check that these skills really belong together.",
      confirmPkgUninstallTitle: (n, a) => "Uninstall package " + n + " from " + a + "?",
      confirmPkgUninstallBody: "Only these links in that agent are removed. Skill files and other agents stay:",
      "act_delete-package": "Delete package",
      "act_uninstall-package": "Uninstall package",
      "act_keep-for": "Keep for one app",
      keepFor: (r) => "Keep for " + r + " only",
      keepPkgFor: (r) => "Keep package for " + r + " only",
      readerTag: (r) => r + " only?",
      readerFilter: (r) => "Keep for " + r,
      readerHint: (r, m, tier, v, score) => "For agents that only run frontier models (Claude, GPT) this is \"" + v + "\" (" + score + "). " + r + " runs " + m + ", a " + tier + " model that may still use it. You can keep it for " + r + " only: it is removed from every other agent.",
      notMovable: "Its files live in another project (such as a git repository). Move it by hand so that project is not broken.",
      confirmKeepTitle: (n, r) => "Keep " + n + " for " + r + " only?",
      confirmKeepBody: (r, home) => "Links in other agents are removed and the skill folder moves to " + home + ", where only " + r + " reads it. You can undo this from History:",
      moveTo: "Move to",
      known: "Known stale",
      link: "link",
      folder: "folder",
      uninstall: "Uninstall",
      delete: "Delete",
      reveal: "Show in Finder",
      lines: "lines",
      select: "Select",
      bulk: (n) => "Delete " + n + " selected",
      emptyList: "No skills match",
      brokenTitle: "Broken links",
      brokenHint: "The folder they point to is gone",
      removeLink: "Remove",
      cancel: "Cancel",
      confirmUninstallTitle: (n, a) => "Uninstall " + n + " from " + a + "?",
      confirmUninstallBody: "Only this one link is removed. The skill's files and other agents' links stay:",
      confirmDeleteTitle: (n) => "Delete " + n + "?",
      confirmBulkTitle: (n) => "Delete " + n + " skills?",
      confirmDeleteBody: "The skill folder goes to the Trash and every link to it is removed. It is backed up first, so you can undo this from History for 30 days, even after emptying the Trash:",
      moveToTrash: "Move to Trash",
      unlinkFrom: "Remove link",
      outsideRoot: "Note: this skill's files live outside every agent's skills folder (path above) and may belong to another project.",
      managedWarn: (s) => "Note: an installer manages this skill (" + s + ") and may reinstall it on update.",
      doUninstall: "Uninstall",
      doDelete: "Move to Trash",
      done: "Done",
      undo: "Undo",
      restored: "Undone",
      restore: "Undo",
      noHistory: "Nothing yet",
      historyHint: "Every action is logged in ~/.agent-skills-cleaner/history.json. Undo tries, in order: the Trash, a backup (kept 30 days), then reinstalling from where the skill came from.",
      undo_trash: "In the Trash",
      undo_backup: "Trash emptied; restorable from backup",
      undo_reinstall: "Can be re-downloaded from its source",
      undo_links: "Links can be restored",
      undo_none: "Can no longer be undone: the Trash was emptied and there is no backup or known source",
      sourceLabel: "Source",
      backedUp: "backed up",
      act_uninstall: "Uninstall",
      act_delete: "Delete",
      "act_remove-broken": "Remove broken link",
      error: "Error: ",
    },
  };

  let lang = "zh";
  try { lang = localStorage.getItem("agent-skills-cleaner-lang") || (navigator.language.startsWith("zh") ? "zh" : "en"); } catch (e) { /* storage blocked */ }
  const t = (k, ...a) => { const v = I18N[lang][k]; return typeof v === "function" ? v(...a) : v; };

  let report = null;
  let agentFilter = "";
  let modelCfg = { agents: {} };
  const prof = (a) => (report && report.profile && report.profile[a]) || { model: "", tier: "", readers: [], effective: "frontier" };
  const modelOf = (a) => prof(a).model || "";
  const tierOf = (a) => prof(a).tier || "";
  const srcLabel = (src) => src === "manual" ? t("srcManual") : src === "default" ? t("srcDefault") : src ? t("srcFile", src) : t("srcNone");
  function agentTitle(a) {
    const p = prof(a);
    let line = a + " · " + (p.model || t("noModel")) + (p.tier ? "（" + t("tier_" + p.tier) + "）" : "") + " · " + srcLabel(p.source);
    p.readers.forEach((r) => { line += "\n" + t("alsoReads", r.name, r.model || "?", r.tier ? t("tier_" + r.tier) : "?"); });
    return line + "\n" + t("judgedAs", t("tier_" + p.effective));
  }
  let filter = "all";
  const selected = new Set();

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function home(p) {
    return report && report.home ? p.replace(report.home, "~") : p;
  }
  function size(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }

  async function api(path, body) {
    const opts = { headers: { "X-Token": CFG.token } };
    if (body !== undefined) {
      opts.method = "POST";
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  function applyI18n() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $("#btn-lang").textContent = lang === "zh" ? "EN" : "中文";
  }

  function toast(msg, undoId) {
    const el = $("#toast");
    el.innerHTML = "<span>" + esc(msg) + "</span>" + (undoId ? "<button data-undo='" + esc(undoId) + "'>" + esc(t("undo")) + "</button>" : "");
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, undoId ? 8000 : 3500);
  }

  function confirmDialog(title, bodyHtml, okLabel) {
    return new Promise((resolve) => {
      const dlg = $("#confirm");
      $("#confirm-title").textContent = title;
      $("#confirm-body").innerHTML = bodyHtml;
      $("#confirm-ok").textContent = okLabel;
      dlg.returnValue = "";
      dlg.onclose = () => resolve(dlg.returnValue === "ok");
      dlg.showModal();
    });
  }

  function agents() {
    const set = new Set();
    report.skills.forEach((s) => s.installs.forEach((i) => set.add(i.agent)));
    return [...set].sort();
  }

  function visibleSkills() {
    const q = $("#q").value.trim().toLowerCase();
    const agent = agentFilter;
    return report.skills.filter((s) => {
      if (filter === "reader") { if (!s.reader_hint) return false; }
      else if (filter !== "all" && filter !== "broken" && eff(s).verdict !== filter) return false;
      if (filter === "broken") return false;
      if (agent && !s.installs.some((i) => i.agent === agent)) return false;
      if (q && !(s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))) return false;
      return true;
    });
  }

  // The tier a skill is shown for: the filtered agent's tier, else the weakest that can see it.
  function eff(s) {
    const tier = (agentFilter && s.agent_tiers[agentFilter]) || s.tier;
    return Object.assign({ tier }, s.tiers[tier]);
  }
  const tierName = (tier) => t("tier_" + tier);

  const open = new Set();
  const openPkgs = new Set();
  let view = "verdict";
  try { view = localStorage.getItem("agent-skills-cleaner-view") || "verdict"; } catch (e) { /* storage blocked */ }
  const pkgById = (id) => (report.packages || []).find((p) => p.id === id);

  function renderSummary() {
    const pool = agentFilter ? report.skills.filter((s) => s.installs.some((i) => i.agent === agentFilter)) : report.skills;
    const c = { remove: 0, consider: 0, keep: 0 };
    pool.forEach((s) => { c[eff(s).verdict] += 1; });
    const n = pool.length;
    $("#ov-line").innerHTML = t("overview", c.remove, n);
    $("#dist").innerHTML = ["remove", "consider", "keep"].filter((k) => c[k])
      .map((k) => "<span class='" + k + "' style='flex-grow:" + c[k] + "' title='" + esc(t(k) + " " + c[k]) + "'></span>").join("");
    const items = [
      ["all", n, t("all")],
      ["remove", c.remove, t("remove")],
      ["consider", c.consider, t("consider")],
      ["keep", c.keep, t("keep")],
    ];
    const hinted = pool.filter((s) => s.reader_hint).length;
    if (hinted) items.push(["reader", hinted, t("readerFilter", report.readers[0].name)]);
    if (report.broken.length) items.push(["broken", report.broken.length, t("broken")]);
    $("#summary").innerHTML = items.map(([k, num, l]) =>
      "<button data-filter='" + k + "' aria-pressed='" + (filter === k) + "'>" +
      (k === "all" ? "" : "<span class='dot " + k + "'></span>") +
      "<span>" + esc(l) + "</span><span class='n'>" + num + "</span></button>").join("");
  }

  function renderRow(s) {
    const isOpen = open.has(s.id);
    const e = eff(s);
    const agentsList = [...new Set(s.installs.map((i) => i.agent))];
    const where = agentsList.map((a) => "<span class='atag" + (a === agentFilter ? " on" : "") + "' title='" + esc(agentTitle(a)) + "'>" + esc(a) +
      (modelOf(a) ? "<i>" + esc(modelOf(a)) + "</i>" : "") + "</span>").join("");
    const checked = selected.has(s.id) ? " checked" : "";

    let detail = "";
    if (isOpen) {
      const reasons = s.reasons.concat(e.adjust ? [e.adjust] : []).map((r) => {
        const pts = r.id === "known" ? "★" : r.points > 0 ? "+" + r.points : r.points < 0 ? String(r.points) : "·";
        return "<li class='" + r.kind + "'><span class='pts'>" + pts + "</span><span class='" + (r.id === "known" ? "known-reason" : "") + "'>" + esc(r[lang]) + "</span></li>";
      }).join("");
      const installs = s.installs.map((i) => {
        const isLink = i.kind === "link";
        const btn = isLink && !CFG.readonly
          ? "<button class='small' data-uninstall='" + esc(s.id) + "' data-path='" + esc(i.path) + "' aria-label='" + esc(t("uninstall") + " · " + i.agent) + "'>" + esc(t("uninstall")) + "</button>"
          : "";
        const at = s.agent_tiers[i.agent];
        const av = s.tiers[at];
        return "<div class='inst' title='" + esc(home(i.path)) + "'><span class='agent'>" + esc(i.agent) + "</span>" +
          "<span class='kind'>" + esc((modelOf(i.agent) || "—") + (prof(i.agent).readers.length ? " + " + prof(i.agent).readers.map((r) => r.name + " " + (r.model || "")).join(", ") : "") + " · " + (isLink ? t("link") : t("folder"))) + "</span>" +
          "<span class='pill " + av.verdict + "' title='" + esc(tierName(at)) + "'>" + av.score + " " + esc(t(av.verdict)) + "</span>" + btn + "</div>";
      }).join("");
      detail =
        "<div class='row-detail'>" +
        "<div class='full'><div class='label'>" + esc(t("description")) + "</div><p class='fulldesc'>" + esc(s.description || "—") + "</p></div>" +
        "<div><div class='label'>" + esc(t("reasons")) + " · " + esc(t("judgedAs", tierName(e.tier))) + "</div><ul class='reasons'>" + reasons + "</ul>" +
        "<p class='meta'>" + esc(agentFilter && s.agent_tiers[agentFilter] ? t("judgedForAgent", agentFilter, tierName(e.tier)) : t("judgedWhy")) + "</p></div>" +
        "<div><div class='label'>" + esc(t("installedIn")) + "</div><div class='installs'>" + installs + "</div>" +
        "<p class='meta mono'>" + esc(home(s.real_path)) + " · " + s.skill_md_lines + " " + esc(t("lines")) + " · " + size(s.stats.bytes) + "</p></div>" +
        (s.reader_hint ? readerBox(s) : "") +
        "<div class='full detail-foot'>" +
        "<button class='small ghost' data-reveal='" + esc(s.id) + "'>" + esc(t("reveal")) + "</button>" +
        (CFG.readonly ? "" : "<button class='small danger' data-delete='" + esc(s.id) + "'>" + esc(t("delete")) + "</button>") +
        "</div></div>";
    }

    return (
      "<article class='row " + e.verdict + (isOpen ? " open" : "") + "' data-id='" + esc(s.id) + "'>" +
      "<div class='row-main' data-toggle='" + esc(s.id) + "' role='button' tabindex='0' aria-expanded='" + isOpen + "' aria-label='" + esc(s.name + " · " + t("expand")) + "'>" +
      (CFG.readonly ? "" : "<label class='check'><input type='checkbox' data-select='" + esc(s.id) + "'" + checked + " aria-label='" + esc(t("select") + " " + s.name) + "'></label>") +
      "<div class='who'><h3 class='name'><span class='nm'>" + esc(s.name) + "</span>" +
      (s.known ? "<span class='tag'>" + esc(t("known")) + "</span>" : "") +
      (s.reader_hint ? "<span class='tag hint'>" + esc(t("readerTag", s.reader_hint.reader)) + "</span>" : "") +
      (s.package && view === "verdict" ? "<span class='tag pkg-tag'>" + esc(pkgById(s.package).name) + "</span>" : "") + "</h3>" +
      "<p class='desc'>" + esc(s.description || "—") + "</p></div>" +
      "<div class='where'>" + where + "</div>" +
      "<div class='gauge' title='" + esc(t("score") + " " + e.score + "/100 · " + tierName(e.tier)) + "'><span class='num'>" + e.score + "</span><span class='track'><i style='width:" + e.score + "%'></i></span></div>" +
      "<span class='pill " + e.verdict + "'>" + esc(t(e.verdict)) + "</span>" +
      "<span class='chev' aria-hidden='true'></span>" +
      "</div>" + detail + "</article>"
    );
  }

  function renderList() {
    const list = $("#list");
    document.body.classList.toggle("readonly", !!CFG.readonly);
    if (filter === "broken") { list.innerHTML = ""; renderBroken(true); return; }
    const skills = visibleSkills();
    if (!skills.length) { list.innerHTML = "<p class='empty'>" + esc(t("emptyList")) + "</p>"; renderBroken(false); return; }
    $("#view-seg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    if (view === "package") { list.innerHTML = renderPackages(skills); renderBroken(filter === "all"); return; }
    const hints = { remove: t("hintRemove"), consider: t("hintConsider"), keep: t("hintKeep") };
    let html = "";
    ["remove", "consider", "keep"].forEach((v) => {
      const group = skills.filter((s) => eff(s).verdict === v).sort((a, b) => eff(b).score - eff(a).score);
      if (!group.length) return;
      html += "<section class='group'><h2 class='group-title'><span class='dot " + v + "'></span>" + esc(t(v)) +
        " <span class='count'>" + group.length + "</span><span class='hint'>" + esc(hints[v]) + "</span></h2>" +
        "<div class='rows'>" + group.map(renderRow).join("") + "</div></section>";
    });
    list.innerHTML = html;
    renderBroken(filter === "all");
  }

  function miniDist(c) {
    return "<span class='dist mini' aria-hidden='true'>" + ["remove", "consider", "keep"].filter((k) => c[k])
      .map((k) => "<span class='" + k + "' style='flex-grow:" + c[k] + "'></span>").join("") + "</span>";
  }

  function pkgAgents(pkg) {
    const set = new Set();
    pkg.skill_ids.forEach((id) => { const s = skillById(id); if (s) s.installs.forEach((i) => { if (i.kind === "link") set.add(i.agent); }); });
    return [...set].sort();
  }

  function renderPackages(skills) {
    const visible = new Set(skills.map((s) => s.id));
    let html = "";
    (report.packages || []).forEach((p) => {
      const members = p.skill_ids.filter((id) => visible.has(id)).map(skillById);
      if (!members.length) return;
      const isOpen = openPkgs.has(p.id);
      const c = p.counts;
      const verdictLine = c.remove || c.consider ? t("pkgCounts", c.remove, c.consider) : t("pkgAllKeep");
      html += "<section class='pkg" + (isOpen ? " open" : "") + "'>" +
        "<div class='pkg-head' data-pkg-toggle='" + esc(p.id) + "' role='button' tabindex='0' aria-expanded='" + isOpen + "'>" +
        "<span class='chev' aria-hidden='true'></span>" +
        "<div class='who'><h3 class='name'><span class='nm'>" + esc(p.name) + "</span><span class='tag" + (p.guessed ? " guess" : "") + "'>" + esc(t("kind_" + p.kind)) + "</span></h3>" +
        "<p class='desc'>" + esc(t("pkgSkills", p.skill_ids.length)) + " · " + esc(verdictLine) + "</p></div>" +
        miniDist(c) + "</div>";
      if (isOpen) {
        const agentsBtns = CFG.readonly ? "" : pkgAgents(p).map((a) =>
          "<button class='small' data-pkg-uninstall='" + esc(p.id) + "' data-agent='" + esc(a) + "'>" + esc(t("pkgUninstall", a)) + "</button>").join("");
        html += "<div class='pkg-body'><div class='pkg-actions'>" +
          (p.detail ? "<span class='meta mono'>" + esc(t("pkgSource")) + ": " + esc(home(p.detail)) + "</span>" : "<span></span>") +
          "<span class='acts'>" + agentsBtns +
          (CFG.readonly || !report.readers || !report.readers.length ? "" : "<button class='small' data-pkg-keep='" + esc(p.id) + "'>" + esc(t("keepPkgFor", report.readers[0].name)) + "</button>") +
          (CFG.readonly ? "" : "<button class='small danger' data-pkg-delete='" + esc(p.id) + "'>" + esc(t("pkgDelete")) + "</button>") +
          "</span></div><div class='rows'>" + members.map(renderRow).join("") + "</div></div>";
      }
      html += "</section>";
    });
    const loose = skills.filter((s) => !s.package);
    if (loose.length) {
      html += "<section class='group'><h2 class='group-title'>" + esc(t("ungrouped")) + " <span class='count'>" + loose.length +
        "</span><span class='hint'>" + esc(t("ungroupedHint")) + "</span></h2><div class='rows'>" + loose.map(renderRow).join("") + "</div></section>";
    }
    return html;
  }

  function renderBroken(show) {
    const el = $("#broken");
    if (!show || !report.broken.length) { el.innerHTML = ""; return; }
    el.innerHTML =
      "<section class='group'><h2 class='group-title'><span class='dot broken'></span>" + esc(t("brokenTitle")) + " <span class='count'>" + report.broken.length + "</span><span class='hint'>" + esc(t("brokenHint")) + "</span></h2><div class='rows'>" +
      report.broken.map((b) =>
        "<article class='row broken-row'><div class='who'><h3 class='name'><span class='nm'>" + esc(b.name) + "</span><span class='tag'>" + esc(b.agent) + "</span></h3>" +
        "<p class='desc mono'>" + esc(home(b.path)) + " → " + esc(b.target) + "</p></div>" +
        (CFG.readonly ? "" : "<button class='small danger' data-broken='" + esc(b.id) + "'>" + esc(t("removeLink")) + "</button>") +
        "</article>").join("") + "</div></section>";
  }

  function renderBulk() {
    const btn = $("#btn-bulk");
    const n = [...selected].filter((id) => report.skills.some((s) => s.id === id)).length;
    btn.hidden = n === 0 || CFG.readonly;
    btn.textContent = t("bulk", n);
  }

  function renderAgents() {
    const list = agents();
    if (agentFilter && !list.includes(agentFilter)) agentFilter = "";
    const count = (a) => report.skills.filter((s) => s.installs.some((i) => i.agent === a)).length;
    const items = [["", t("allAgents"), report.skills.length]].concat(list.map((a) => [a, a, count(a)]));
    $("#agents").innerHTML = "<span class='agents-label'>" + esc(t("agentsLabel")) + "</span>" + items.map(([v, label, n]) =>
      "<button data-agent-filter='" + esc(v) + "' aria-pressed='" + (agentFilter === v) + "'" + (v ? " title='" + esc(agentTitle(v)) + "'" : "") + ">" + esc(label) +
      (v && modelOf(v) ? "<span class='model'>" + esc(modelOf(v)) + "</span>" : "") +
      (v && prof(v).readers.length ? "<span class='reader'>+" + esc(prof(v).readers.map((r) => r.name).join("+")) + "</span>" : "") +
      "<span class='n'>" + n + "</span></button>").join("") +
      "<button class='ghost small edit-models' data-edit-models>" + esc(t("editModels")) + "</button>";
  }


  function render() {
    applyI18n();
    $("#readonly-banner").hidden = !CFG.readonly;
    if (!report) return;
    renderSummary();
    renderAgents();
    renderList();
    renderBulk();
  }

  async function load() {
    $("#btn-rescan").disabled = true;
    try {
      const [r, cfg] = await Promise.all([api("/api/scan"), api("/api/config").catch(() => modelCfg)]);
      report = r;
      modelCfg = cfg;
      const ids = new Set(report.skills.map((s) => s.id));
      [...selected].forEach((id) => { if (!ids.has(id)) selected.delete(id); });
      render();
    } catch (e) {
      toast(t("error") + e.message);
    } finally {
      $("#btn-rescan").disabled = false;
    }
  }

  const skillById = (id) => report.skills.find((s) => s.id === id);

  function deletePlan(s) {
    const links = s.installs.filter((i) => i.kind === "link");
    const outside = !s.installs.some((i) => i.kind === "folder");
    let html = "<ul><li>" + esc(t("moveToTrash")) + ": <code>" + esc(home(s.real_path)) + "</code></li>" +
      links.map((i) => "<li>" + esc(t("unlinkFrom")) + " (" + esc(i.agent) + "): <code>" + esc(home(i.path)) + "</code></li>").join("") + "</ul>";
    if (outside) html += "<div class='warn'>" + esc(t("outsideRoot")) + "</div>";
    if (s.managed) html += "<div class='warn'>" + esc(t("managedWarn", s.managed.source || "lock")) + "</div>";
    return html;
  }

  async function doDelete(ids) {
    const skills = ids.map(skillById).filter(Boolean);
    if (!skills.length) return;
    const title = skills.length === 1 ? t("confirmDeleteTitle", skills[0].name) : t("confirmBulkTitle", skills.length);
    const body = "<p>" + esc(t("confirmDeleteBody")) + "</p>" +
      skills.map((s) => (skills.length > 1 ? "<h3>" + esc(s.name) + "</h3>" : "") + deletePlan(s)).join("");
    if (!(await confirmDialog(title, body, t("doDelete")))) return;
    let last = null;
    for (const s of skills) {
      try {
        last = (await api("/api/delete", { skill_id: s.id })).entry;
        selected.delete(s.id);
      } catch (e) {
        toast(t("error") + s.name + ": " + e.message);
        await load();
        return;
      }
    }
    toast(t("done") + " · " + (skills.length === 1 ? skills[0].name : skills.length), skills.length === 1 && last ? last.id : null);
    await load();
  }

  async function doUninstall(id, path) {
    const s = skillById(id);
    const inst = s.installs.find((i) => i.path === path);
    const body = "<p>" + esc(t("confirmUninstallBody")) + "</p><ul><li><code>" + esc(home(path)) + "</code> → <code>" + esc(inst.target) + "</code></li></ul>";
    if (!(await confirmDialog(t("confirmUninstallTitle", s.name, inst.agent), body, t("doUninstall")))) return;
    try {
      const r = await api("/api/uninstall", { skill_id: id, path });
      toast(t("done") + " · " + s.name, r.entry.id);
    } catch (e) {
      toast(t("error") + e.message);
    }
    await load();
  }

  function readerBox(s) {
    const h = s.reader_hint;
    const r = report.readers.find((x) => x.name === h.reader) || { model: "?", tier: "mid" };
    const tn = lang === "en" ? tierName(r.tier || "mid").toLowerCase() : tierName(r.tier || "mid");
    return "<div class='full hint-box'><p>" + esc(t("readerHint", h.reader, r.model || "?", tn, t(h.own_verdict), h.own_score)) + "</p>" +
      (h.movable
        ? (CFG.readonly ? "" : "<button class='small' data-keep-for='" + esc(s.id) + "'>" + esc(t("keepFor", h.reader)) + "</button>")
        : "<p class='muted'>" + esc(t("notMovable")) + "</p>") + "</div>";
  }

  function keepPlan(s, r) {
    const links = s.installs.filter((i) => i.kind === "link");
    return "<ul>" + links.map((i) => "<li>" + esc(t("unlinkFrom")) + " (" + esc(i.agent) + "): <code>" + esc(home(i.path)) + "</code></li>").join("") +
      "<li>" + esc(t("moveTo")) + ": <code>" + esc(home(r.home)) + "/" + esc(s.real_path.split("/").pop()) + "</code></li></ul>";
  }

  async function doKeepFor(ids, pid) {
    const r = report.readers[0];
    const skills = ids.map(skillById).filter(Boolean);
    const title = pid ? t("confirmKeepTitle", pkgById(pid).name, r.name) : t("confirmKeepTitle", skills[0].name, r.name);
    const body = "<p>" + esc(t("confirmKeepBody", r.name, home(r.home))) + "</p>" +
      skills.map((s) => (skills.length > 1 ? "<h3>" + esc(s.name) + "</h3>" : "") + keepPlan(s, r)).join("");
    if (!(await confirmDialog(title, body, t("keepFor", r.name)))) return;
    try {
      const res = await api("/api/keep-for", pid ? { package_id: pid, reader: r.name } : { skill_id: skills[0].id, reader: r.name });
      toast(t("done") + " · " + (pid ? pkgById(pid).name : skills[0].name) + " → " + r.name, res.entry.id);
    } catch (e) {
      toast(t("error") + e.message);
    }
    await load();
  }

  async function doDeletePackage(pid) {
    const p = pkgById(pid);
    const skills = p.skill_ids.map(skillById).filter(Boolean);
    let body = "<p>" + esc(t("confirmPkgDeleteBody")) + "</p>";
    if (p.counts.keep) body += "<div class='warn'>" + esc(t("pkgKeepWarn", p.counts.keep)) + "</div>";
    if (p.guessed) body += "<div class='warn'>" + esc(t("pkgGuessWarn")) + "</div>";
    body += skills.map((s) => "<h3>" + esc(s.name) + "</h3>" + deletePlan(s)).join("");
    if (!(await confirmDialog(t("confirmPkgDeleteTitle", p.name, skills.length), body, t("doDelete")))) return;
    try {
      const r = await api("/api/delete-package", { package_id: pid });
      skills.forEach((s) => selected.delete(s.id));
      toast(t("done") + " · " + p.name, r.entry.id);
    } catch (e) {
      toast(t("error") + e.message);
    }
    await load();
  }

  async function doUninstallPackage(pid, agent) {
    const p = pkgById(pid);
    const links = [];
    p.skill_ids.map(skillById).filter(Boolean).forEach((s) => s.installs.forEach((i) => {
      if (i.agent === agent && i.kind === "link") links.push(i);
    }));
    const body = "<p>" + esc(t("confirmPkgUninstallBody")) + "</p><ul>" +
      links.map((i) => "<li><code>" + esc(home(i.path)) + "</code></li>").join("") + "</ul>";
    if (!(await confirmDialog(t("confirmPkgUninstallTitle", p.name, agent), body, t("doUninstall")))) return;
    try {
      const r = await api("/api/uninstall-package", { package_id: pid, agent });
      toast(t("done") + " · " + p.name, r.entry.id);
    } catch (e) {
      toast(t("error") + e.message);
    }
    await load();
  }

  function openModels() {
    const dlg = $("#models");
    const saved = modelCfg.agents || {};
    const readers = [];
    agents().forEach((a) => prof(a).readers.forEach((r) => { if (!readers.some((x) => x.name === r.name)) readers.push(r); }));
    $("#models-body").innerHTML = agents().map((a, i) => {
      const p = prof(a);
      const o = saved[a] || {};
      const autoTier = p.tier && p.source !== "manual" ? t("tier_" + p.tier) : t("tierUnknown");
      return "<div class='model-row'><label class='agent' for='model-" + i + "'>" + esc(a) +
        "<span class='src'>" + esc(srcLabel(p.source === "manual" ? null : p.source)) + "</span></label>" +
        "<input id='model-" + i + "' data-model-agent='" + esc(a) + "' value='" + esc(o.model || "") + "' placeholder='" + esc(p.source !== "manual" && p.model ? p.model : t("modelPlaceholder")) + "' maxlength='80'>" +
        "<select id='tier-" + i + "' aria-label='" + esc(a) + "'>" +
        ["", "frontier", "mid", "small"].map((v) => "<option value='" + v + "'" + ((o.tier || "") === v ? " selected" : "") + ">" + esc(v ? t("tier_" + v) : t("tierAuto", autoTier)) + "</option>").join("") +
        "</select></div>";
    }).join("") + readers.map((r) =>
      "<p class='muted reader-note'>" + esc(t("readerNote", r.name, r.model || "?", r.tier ? t("tier_" + r.tier) : "?")) + "</p>").join("");
    dlg.returnValue = "";
    dlg.onclose = async () => {
      if (dlg.returnValue !== "ok") return;
      const agentsCfg = {};
      dlg.querySelectorAll("[data-model-agent]").forEach((input, i) => {
        const model = input.value.trim();
        const tier = $("#tier-" + i).value;
        if (model || tier) agentsCfg[input.dataset.modelAgent] = { model, tier };
      });
      try {
        modelCfg = await api("/api/config", { agents: agentsCfg });
        toast(t("saved"));
      } catch (e) {
        toast(t("error") + e.message);
      }
      await load();
    };
    dlg.showModal();
  }

  async function doRestore(id) {
    try {
      await api("/api/restore", { entry_id: id });
      toast(t("restored"));
    } catch (e) {
      toast(t("error") + e.message);
    }
    await load();
    if (!$("#drawer").hidden) loadHistory();
  }

  async function loadHistory() {
    const list = await api("/api/history");
    const el = $("#history");
    if (!list.length) { el.innerHTML = "<p class='empty'>" + esc(t("noHistory")) + "</p>"; return; }
    el.innerHTML = list.map((e) => {
      const when = new Date(e.time * 1000).toLocaleString(lang === "zh" ? "zh-CN" : "en");
      const steps = e.steps.map((s) => "<li>" + (s.op === "move"
        ? esc(home(s.src)) + " → " + esc(s.dst.indexOf("/.Trash") >= 0 || s.dst.indexOf("Trash/") >= 0 ? t("moveToTrash") : home(s.dst)) +
          (s.backup ? " · " + esc(t("backedUp")) : "") +
          (s.source && s.source.label ? " · " + esc(t("sourceLabel")) + ": " + esc(s.source.label) : "")
        : esc(t("unlinkFrom")) + " " + esc(home(s.path))) + "</li>").join("");
      const undo = e.restored ? null : e.undo === "none" ? "none" : (e.undo || []).indexOf("reinstall") >= 0 ? "reinstall" : (e.undo || []).indexOf("backup") >= 0 ? "backup" : (e.undo || []).length ? (e.undo[0] === "links" ? "links" : "trash") : null;
      return "<div class='hist" + (e.restored ? " restored" : "") + "'><div class='hist-head'><span><b>" + esc(t("act_" + e.action) || e.action) + "</b> " + esc(e.name) +
        "<br><span class='muted'>" + esc(when) + "</span></span>" +
        (e.restored ? "<span class='muted'>" + esc(t("restored")) + "</span>" : CFG.readonly || undo === "none" ? "" : "<button class='small' data-restore='" + esc(e.id) + "'>" + esc(t("restore")) + "</button>") +
        "</div>" + (undo ? "<p class='undo-state " + undo + "'>" + esc(t("undo_" + undo)) + "</p>" : "") + "<ul>" + steps + "</ul></div>";
    }).join("");
  }

  function toggleRow(id) {
    if (open.has(id)) open.delete(id); else open.add(id);
    renderList();
    const row = document.querySelector(".row[data-id='" + CSS.escape(id) + "'] .row-main");
    if (row) row.focus({ preventScroll: true });
  }

  function togglePkg(id) {
    if (openPkgs.has(id)) openPkgs.delete(id); else openPkgs.add(id);
    renderList();
    const head = document.querySelector("[data-pkg-toggle='" + CSS.escape(id) + "']");
    if (head) head.focus({ preventScroll: true });
  }

  document.addEventListener("keydown", (ev) => {
    const el = ev.target.closest && ev.target.closest("[data-toggle], [data-pkg-toggle]");
    if (el && ev.target === el && (ev.key === "Enter" || ev.key === " ")) {
      ev.preventDefault();
      if (el.dataset.toggle) toggleRow(el.dataset.toggle); else togglePkg(el.dataset.pkgToggle);
    }
    if (ev.key === "Escape" && !$("#drawer").hidden) closeDrawer();
  });

  document.addEventListener("click", (ev) => {
    if (ev.target.closest(".check")) return;
    const el = ev.target.closest("button, [data-toggle], [data-pkg-toggle]");
    if (!el) return;
    const d = el.dataset;
    if (d.filter) { filter = filter === d.filter && d.filter !== "all" ? "all" : d.filter; render(); }
    else if (d.uninstall) doUninstall(d.uninstall, d.path);
    else if (d.delete) doDelete([d.delete]);
    else if (d.reveal) api("/api/reveal", { skill_id: d.reveal }).catch((e) => toast(t("error") + e.message));
    else if (d.broken) {
      const b = report.broken.find((x) => x.id === d.broken);
      confirmDialog(t("brokenTitle") + ": " + b.name, "<ul><li><code>" + esc(home(b.path)) + "</code> → <code>" + esc(b.target) + "</code></li></ul>", t("removeLink"))
        .then((ok) => ok && api("/api/remove-broken", { broken_id: b.id }).then((r) => { toast(t("done"), r.entry.id); return load(); }).catch((e) => toast(t("error") + e.message)));
    }
    else if (d.restore) doRestore(d.restore);
    else if (d.undo) { $("#toast").hidden = true; doRestore(d.undo); }
    else if (d.toggle) toggleRow(d.toggle);
    else if (d.editModels !== undefined) openModels();
    else if (d.closeModels !== undefined) $("#models").close();
    else if (d.agentFilter !== undefined) { agentFilter = d.agentFilter; renderAgents(); renderSummary(); renderList(); }
    else if (d.pkgToggle) togglePkg(d.pkgToggle);
    else if (d.pkgDelete) doDeletePackage(d.pkgDelete);
    else if (d.keepFor) doKeepFor([d.keepFor]);
    else if (d.pkgKeep) doKeepFor(pkgById(d.pkgKeep).skill_ids, d.pkgKeep);
    else if (d.pkgUninstall) doUninstallPackage(d.pkgUninstall, d.agent);
    else if (d.view) {
      view = d.view;
      try { localStorage.setItem("agent-skills-cleaner-view", view); } catch (e) { /* storage blocked */ }
      renderList();
    }
  });

  document.addEventListener("change", (ev) => {
    const id = ev.target.dataset && ev.target.dataset.select;
    if (!id) return;
    if (ev.target.checked) selected.add(id); else selected.delete(id);
    renderBulk();
  });

  $("#q").addEventListener("input", renderList);
  $("#btn-rescan").addEventListener("click", load);
  $("#btn-bulk").addEventListener("click", () => doDelete([...selected]));
  $("#btn-lang").addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    try { localStorage.setItem("agent-skills-cleaner-lang", lang); } catch (e) { /* storage blocked */ }
    render();
    if (!$("#drawer").hidden) loadHistory();
  });
  function closeDrawer() { $("#drawer").hidden = true; $("#scrim").hidden = true; }
  $("#btn-history").addEventListener("click", () => { $("#drawer").hidden = false; $("#scrim").hidden = false; loadHistory(); });
  $("#btn-close-drawer").addEventListener("click", closeDrawer);
  $("#scrim").addEventListener("click", closeDrawer);

  render();
  load();
})();
