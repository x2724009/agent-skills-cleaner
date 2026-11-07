(function () {
  "use strict";

  const CFG = window.SKILLMOLT;
  const $ = (sel) => document.querySelector(sel);

  const I18N = {
    zh: {
      tagline: "管理电脑上所有 AI 工具的 skills，蜕掉模型已经用不上的旧壳",
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
        "<li>≥60 建议删除，35–59 可以考虑，&lt;35 保留。分数只是参考，最终由你决定。</li>" +
        "</ul>" +
        "<p class='muted'>“卸载”只解除某个工具与技能的链接，原文件不动；“删除”把技能文件夹移到废纸篓并解除所有链接。两者都能在操作记录里一键撤销。</p>",
      search: "搜索名称或介绍…",
      allAgents: "全部工具",
      agentsLabel: "所在工具",
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
      confirmPkgDeleteBody: "包里每个技能的文件夹都会移到废纸篓，并解除所有链接。整包算一次操作，可以在操作记录里一键撤销：",
      pkgKeepWarn: (n) => "注意：包里有 " + n + " 个技能被评为“建议保留”，也会一起删除。",
      pkgGuessWarn: "注意：这个包是按名称前缀推测的，请确认这些技能确实属于同一套。",
      confirmPkgUninstallTitle: (n, a) => "从 " + a + " 卸载技能包 " + n + "？",
      confirmPkgUninstallBody: "只解除该工具里的这些链接，技能文件和其他工具不受影响：",
      "act_delete-package": "删除技能包",
      "act_uninstall-package": "卸载技能包",
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
      confirmDeleteBody: "技能文件夹会被移到废纸篓，所有指向它的链接都会被移除。之后可以在“操作记录”里撤销：",
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
      historyHint: "所有操作都会记在 ~/.skillmolt/history.json，删除的文件在废纸篓里，随时可以恢复。",
      act_uninstall: "卸载",
      act_delete: "删除",
      "act_remove-broken": "移除失效链接",
      error: "出错了：",
    },
    en: {
      tagline: "Manage every agent's skills and shed the ones your models have outgrown",
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
        "<li>≥60 remove, 35–59 consider, &lt;35 keep. The score is advice; you decide.</li>" +
        "</ul>" +
        "<p class='muted'>Uninstall removes one agent's link and leaves the files alone. Delete moves the skill folder to the Trash and removes every link. Both can be undone from History.</p>",
      search: "Search name or description…",
      allAgents: "All agents",
      agentsLabel: "Agent",
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
      confirmPkgDeleteBody: "Every skill folder in the package goes to the Trash and every link is removed. The whole package is one action you can undo from History:",
      pkgKeepWarn: (n) => "Note: " + n + " skills in this package are rated keep and will be deleted too.",
      pkgGuessWarn: "Note: this package was guessed from name prefixes. Check that these skills really belong together.",
      confirmPkgUninstallTitle: (n, a) => "Uninstall package " + n + " from " + a + "?",
      confirmPkgUninstallBody: "Only these links in that agent are removed. Skill files and other agents stay:",
      "act_delete-package": "Delete package",
      "act_uninstall-package": "Uninstall package",
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
      confirmDeleteBody: "The skill folder goes to the Trash and every link to it is removed. You can undo this from History:",
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
      historyHint: "Every action is logged in ~/.skillmolt/history.json and deleted files sit in the Trash, so everything can be restored.",
      act_uninstall: "Uninstall",
      act_delete: "Delete",
      "act_remove-broken": "Remove broken link",
      error: "Error: ",
    },
  };

  let lang = "zh";
  try { lang = localStorage.getItem("skillmolt-lang") || (navigator.language.startsWith("zh") ? "zh" : "en"); } catch (e) { /* storage blocked */ }
  const t = (k, ...a) => { const v = I18N[lang][k]; return typeof v === "function" ? v(...a) : v; };

  let report = null;
  let agentFilter = "";
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
      if (filter !== "all" && filter !== "broken" && s.verdict !== filter) return false;
      if (filter === "broken") return false;
      if (agent && !s.installs.some((i) => i.agent === agent)) return false;
      if (q && !(s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))) return false;
      return true;
    });
  }

  const open = new Set();
  const openPkgs = new Set();
  let view = "verdict";
  try { view = localStorage.getItem("skillmolt-view") || "verdict"; } catch (e) { /* storage blocked */ }
  const pkgById = (id) => (report.packages || []).find((p) => p.id === id);

  function renderSummary() {
    const c = report.counts;
    const n = report.skills.length;
    $("#ov-line").innerHTML = t("overview", c.remove, n);
    $("#dist").innerHTML = ["remove", "consider", "keep"].filter((k) => c[k])
      .map((k) => "<span class='" + k + "' style='flex-grow:" + c[k] + "' title='" + esc(t(k) + " " + c[k]) + "'></span>").join("");
    const items = [
      ["all", n, t("all")],
      ["remove", c.remove, t("remove")],
      ["consider", c.consider, t("consider")],
      ["keep", c.keep, t("keep")],
    ];
    if (report.broken.length) items.push(["broken", report.broken.length, t("broken")]);
    $("#summary").innerHTML = items.map(([k, num, l]) =>
      "<button data-filter='" + k + "' aria-pressed='" + (filter === k) + "'>" +
      (k === "all" ? "" : "<span class='dot " + k + "'></span>") +
      "<span>" + esc(l) + "</span><span class='n'>" + num + "</span></button>").join("");
  }

  function renderRow(s) {
    const isOpen = open.has(s.id);
    const agentsList = [...new Set(s.installs.map((i) => i.agent))];
    const where = agentsList.map((a) => "<span class='atag" + (a === agentFilter ? " on" : "") + "'>" + esc(a) + "</span>").join("");
    const checked = selected.has(s.id) ? " checked" : "";

    let detail = "";
    if (isOpen) {
      const reasons = s.reasons.map((r) => {
        const pts = r.id === "known" ? "★" : r.points > 0 ? "+" + r.points : r.points < 0 ? String(r.points) : "·";
        return "<li class='" + r.kind + "'><span class='pts'>" + pts + "</span><span class='" + (r.id === "known" ? "known-reason" : "") + "'>" + esc(r[lang]) + "</span></li>";
      }).join("");
      const installs = s.installs.map((i) => {
        const isLink = i.kind === "link";
        const btn = isLink && !CFG.readonly
          ? "<button class='small' data-uninstall='" + esc(s.id) + "' data-path='" + esc(i.path) + "' aria-label='" + esc(t("uninstall") + " · " + i.agent) + "'>" + esc(t("uninstall")) + "</button>"
          : "";
        return "<div class='inst' title='" + esc(home(i.path)) + "'><span class='agent'>" + esc(i.agent) + "</span>" +
          "<span class='kind'>" + esc(isLink ? t("link") : t("folder")) + "</span>" + btn + "</div>";
      }).join("");
      detail =
        "<div class='row-detail'>" +
        "<div class='full'><div class='label'>" + esc(t("description")) + "</div><p class='fulldesc'>" + esc(s.description || "—") + "</p></div>" +
        "<div><div class='label'>" + esc(t("reasons")) + "</div><ul class='reasons'>" + reasons + "</ul></div>" +
        "<div><div class='label'>" + esc(t("installedIn")) + "</div><div class='installs'>" + installs + "</div>" +
        "<p class='meta mono'>" + esc(home(s.real_path)) + " · " + s.skill_md_lines + " " + esc(t("lines")) + " · " + size(s.stats.bytes) + "</p></div>" +
        "<div class='full detail-foot'>" +
        "<button class='small ghost' data-reveal='" + esc(s.id) + "'>" + esc(t("reveal")) + "</button>" +
        (CFG.readonly ? "" : "<button class='small danger' data-delete='" + esc(s.id) + "'>" + esc(t("delete")) + "</button>") +
        "</div></div>";
    }

    return (
      "<article class='row " + s.verdict + (isOpen ? " open" : "") + "' data-id='" + esc(s.id) + "'>" +
      "<div class='row-main' data-toggle='" + esc(s.id) + "' role='button' tabindex='0' aria-expanded='" + isOpen + "' aria-label='" + esc(s.name + " · " + t("expand")) + "'>" +
      (CFG.readonly ? "" : "<label class='check'><input type='checkbox' data-select='" + esc(s.id) + "'" + checked + " aria-label='" + esc(t("select") + " " + s.name) + "'></label>") +
      "<div class='who'><h3 class='name'><span class='nm'>" + esc(s.name) + "</span>" +
      (s.known ? "<span class='tag'>" + esc(t("known")) + "</span>" : "") +
      (s.package && view === "verdict" ? "<span class='tag pkg-tag'>" + esc(pkgById(s.package).name) + "</span>" : "") + "</h3>" +
      "<p class='desc'>" + esc(s.description || "—") + "</p></div>" +
      "<div class='where'>" + where + "</div>" +
      "<div class='gauge' title='" + esc(t("score")) + " " + s.score + "/100'><span class='num'>" + s.score + "</span><span class='track'><i style='width:" + s.score + "%'></i></span></div>" +
      "<span class='pill " + s.verdict + "'>" + esc(t(s.verdict)) + "</span>" +
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
      const group = skills.filter((s) => s.verdict === v);
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
      "<button data-agent-filter='" + esc(v) + "' aria-pressed='" + (agentFilter === v) + "'>" + esc(label) + "<span class='n'>" + n + "</span></button>").join("");
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
      report = await api("/api/scan");
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
      const steps = e.steps.map((s) => "<li>" + (s.op === "move" ? esc(home(s.src)) + " → " + esc(t("moveToTrash")) : esc(t("unlinkFrom")) + " " + esc(home(s.path))) + "</li>").join("");
      return "<div class='hist" + (e.restored ? " restored" : "") + "'><div class='hist-head'><span><b>" + esc(t("act_" + e.action) || e.action) + "</b> " + esc(e.name) +
        "<br><span class='muted'>" + esc(when) + "</span></span>" +
        (e.restored ? "<span class='muted'>" + esc(t("restored")) + "</span>" : CFG.readonly ? "" : "<button class='small' data-restore='" + esc(e.id) + "'>" + esc(t("restore")) + "</button>") +
        "</div><ul>" + steps + "</ul></div>";
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
    else if (d.agentFilter !== undefined) { agentFilter = d.agentFilter; renderAgents(); renderList(); }
    else if (d.pkgToggle) togglePkg(d.pkgToggle);
    else if (d.pkgDelete) doDeletePackage(d.pkgDelete);
    else if (d.pkgUninstall) doUninstallPackage(d.pkgUninstall, d.agent);
    else if (d.view) {
      view = d.view;
      try { localStorage.setItem("skillmolt-view", view); } catch (e) { /* storage blocked */ }
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
    try { localStorage.setItem("skillmolt-lang", lang); } catch (e) { /* storage blocked */ }
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
