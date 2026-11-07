# Skill Sweep

**找出跟不上模型能力、反而拖累模型的 agent skills，在网页里一键卸载或删除。**

[English](#english) · 中文

很多 skill 写于更早一代模型：教模型"先想再做""写完要验证""不准偷懒截断"。对 GPT、Claude、DeepSeek 的当前一代模型，这些它们早就会了。这类 skill 每次都要被读进上下文，还会把简单任务拖进固定流程，反而成了累赘。

Skill Sweep 会扫描你电脑上各个 AI 工具的 skills 目录，给每个 skill 打一个**拖累指数**，写清理由，然后让你在本地网页里点一下就卸载或删除。删除只会挪进废纸篓，随时能撤销。

## 功能

- **一次看全**：Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode、Windsurf、Kiro、Qwen Code、Trae，以及共享的 `~/.agents/skills`。同一个 skill 被链接到多个工具时合并显示。
- **按技能包分组**：一起安装的一套技能（如飞书 lark-*、superpowers）会归成一个包，可以整包卸载或删除，整包算一次操作、一次撤销。识别依据依次是：安装器 lock 文件、插件清单、git 仓库、已知清单、同一文件夹、名称前缀（最后这条只是推测，界面上会标明）。
- **拖累指数 + 理由**：每个 skill 都列出加分、减分的具体原因，不是黑箱。
- **两种清理**：
  - **卸载**：只移除某个工具里的链接，原文件和其他工具不受影响。
  - **删除**：把 skill 文件夹移到废纸篓，并移除所有指向它的链接。
- **全部可撤销**：每次操作都记在 `~/.skill-sweep/history.json`，在网页"操作记录"里一键恢复。
- **失效链接**：找出指向已不存在文件夹的链接。
- **中英双语**界面，跟随系统深浅色。
- **零依赖**：只用 Python 标准库（3.8+），不需要 `pip install` 任何东西。

## 快速开始

```bash
git clone https://github.com/x2724009/skill-sweep.git
cd skill-sweep
python3 -m skillsweep
```

浏览器会自动打开 `http://127.0.0.1:7457/`。

其他用法：

```bash
python3 -m skillsweep serve --readonly        # 只看分析，禁用卸载和删除
python3 -m skillsweep report                  # 在终端输出结果
python3 -m skillsweep report --json           # 输出 JSON
python3 -m skillsweep --root "MyAgent=~/my/skills" serve   # 扫描指定目录
```

也可以安装成命令：`pip install .`，之后直接运行 `skill-sweep`。

## 拖累指数怎么算

| 信号 | 分数 | 含义 |
|---|---|---|
| 纯提示词 | +25 | 没有脚本、没有命令行工具，只是告诉模型怎么想 |
| 强制指令密集 | +10 / +20 | 大量 MUST / ALWAYS / 每次 / 必须，压过模型自己的判断 |
| 要求先调用其他 skill | +10 | 层层套娃，每个任务都多一道流程 |
| 规定固定流程 | +10 | 计划、清单、子任务……简单任务也被拖长 |
| 通用建议 | +10 | "最佳实践""行为准则"一类，前沿模型已内化 |
| 说明过长 | +10 | 超过 400 行且没有工具，每次触发都占上下文 |
| 触发范围过宽 | +10 | 不需要时也会被调用 |
| 一年以上未更新 | +5 | 写于更早一代模型 |
| 带脚本或工具 | −35 | 模型凭空做不到的事 |
| 教模型用具体 CLI | −30 | 例如 `lark-cli`，这是模型不知道的接口细节 |
| 附带参考资料 | −10 | 可能包含模型不知道的规范 |

**≥60 建议删除，35–59 可以考虑，<35 建议保留。**

社区维护的[已知过时清单](skillsweep/data/known.json)优先于自动规则。比如 superpowers 系列、`karpathy-guidelines`、`full-output-enforcement`。

分数只是参考，最终由你决定。一个 skill 对你有没有用，取决于你用什么模型、做什么事。

## 安全

- 只监听 `127.0.0.1`，并校验 Host 头，防止 DNS rebinding。
- 每次启动生成随机 token，其他网站无法调用接口。
- 只能操作本次扫描到的 skill，不接受任意路径。
- 永远不做永久删除：文件进废纸篓，操作有记录、可撤销。

## 贡献已知过时的 skill

编辑 [`skillsweep/data/known.json`](skillsweep/data/known.json)，加一条规则：

```json
{
  "names": ["skill-name"],
  "verdict": "remove",
  "reason": {
    "zh": "它做什么，为什么现在的模型不再需要",
    "en": "What it does and why current models no longer need it"
  }
}
```

`verdict` 可选 `remove`（建议删除）、`consider`（可以考虑）、`keep`（保留，用来纠正误判）。请在 PR 里说明你在哪个模型上验证过。

## 开发

```bash
python3 -m unittest discover -s tests -t .
```

## License

MIT

---

<a id="english"></a>

## English

**Find agent skills that hold modern models back, and uninstall or delete them from a local web page.**

Many skills were written for an older generation of models. They tell the model to "think first", "verify before claiming done" or "never truncate output". Current GPT, Claude and DeepSeek models already do all of that. Such skills still get loaded into context on every trigger, and they drag simple tasks through a fixed ceremony.

Skill Sweep scans the skills folders of your AI tools and gives each skill a **drag index** with reasons. You can then uninstall or delete a skill with one click. Deleted skills go to the Trash and every action can be undone.

### Quick start

```bash
git clone https://github.com/x2724009/skill-sweep.git
cd skill-sweep
python3 -m skillsweep
```

There is nothing to install: the tool uses only the Python standard library and needs Python 3.8+.

### Features

- **Scans many agents**: Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, Windsurf, Kiro, Qwen Code, Trae and the shared `~/.agents/skills` folder. A skill linked into several agents is shown once.
- **Drag index with reasons**: every point added or removed is explained. See the table above.
- **Packages**: skills installed together (for example lark-* or superpowers) are grouped, and a whole package can be uninstalled or deleted as one undoable action. Packages are detected from installer lock files, plugin manifests, git repositories, the known list, a shared folder, and finally shared name prefixes (marked as a guess).
- **Uninstall** removes one agent's symlink. **Delete** moves the folder to the Trash and removes every link to it.
- **Everything is undoable** from the History panel.
- **Finds broken symlinks.**
- **Safe by design**: the server listens on localhost only, uses a per-run token and Host checks, acts only on scanned skills and never deletes permanently.

Contributions to the [known list](skillsweep/data/known.json) are welcome.
