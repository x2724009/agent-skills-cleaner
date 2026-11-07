<p align="center"><img src="skillmolt/web/icon.svg" width="120" alt="SkillMolt logo: a white crab under the outline of its old shell, on a blue tile"></p>

<h1 align="center">SkillMolt 蜕壳</h1>

<p align="center"><b>管理电脑上所有 AI 工具的 skills，找出模型已经用不上、反而拖累它的那些，一键清理，随时恢复。</b></p>

<p align="center"><a href="#english">English</a> · 中文</p>

螃蟹要长大，就得蜕掉旧壳。模型也一样：很多 skill 写于更早一代模型，教它"先想再做""写完要验证""不准偷懒截断"。当前一代的 Claude、GPT、DeepSeek 早就会了，这些 skill 却每次都被读进上下文，还把简单任务拖进固定流程。

SkillMolt 会：

1. **找全**：扫描 Claude Code、Codex、Cursor、Gemini CLI、Copilot 等工具的 skills 目录，以及各种软件安装时顺带写进来的 skills，标出它们来自哪个安装器、插件或仓库。
2. **判断**：给每个 skill 打一个**拖累指数**并写清理由。
3. **清理**：在本地网页里卸载或删除，删除只进废纸篓，每一步都能撤销。

**按模型评判**：给每个工具标上它用的模型和档位（前沿 / 中档 / 小模型），同一个 skill 对不同档位给出不同结论。

**规划中**：从本地会话记录统计每个 skill 的实际使用频率。

## 功能

- **一次看全**：Claude Code、Codex、Cursor、Gemini CLI、GitHub Copilot、OpenCode、Windsurf、Kiro、Qwen Code、Trae，以及共享的 `~/.agents/skills`。同一个 skill 被链接到多个工具时合并显示。
- **按技能包分组**：一起安装的一套技能（如飞书 lark-*、superpowers）会归成一个包，可以整包卸载或删除，整包算一次操作、一次撤销。识别依据依次是：安装器 lock 文件、插件清单、git 仓库、已知清单、同一文件夹、名称前缀（最后这条只是推测，界面上会标明）。
- **拖累指数 + 理由**：每个 skill 都列出加分、减分的具体原因，不是黑箱。
- **两种清理**：
  - **卸载**：只移除某个工具里的链接，原文件和其他工具不受影响。
  - **删除**：把 skill 文件夹移到废纸篓，并移除所有指向它的链接。
- **全部可撤销**：每次操作都记在 `~/.skillmolt/history.json`，在网页"操作记录"里一键恢复。
- **失效链接**：找出指向已不存在文件夹的链接。
- **中英双语**界面，跟随系统深浅色。
- **零依赖**：只用 Python 标准库（3.8+），不需要 `pip install` 任何东西。

## 快速开始

```bash
git clone https://github.com/x2724009/skillmolt.git
cd skillmolt
python3 -m skillmolt
```

浏览器会自动打开 `http://127.0.0.1:7457/`。

其他用法：

```bash
python3 -m skillmolt serve --readonly        # 只看分析，禁用卸载和删除
python3 -m skillmolt report                  # 在终端输出结果
python3 -m skillmolt report --json           # 输出 JSON
python3 -m skillmolt --root "MyAgent=~/my/skills" serve   # 扫描指定目录
```

也可以安装成命令：`pip install .`，之后直接运行 `skillmolt`。

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

### 按模型档位评分

同一个流程型 skill，对前沿模型是累赘，对小模型可能还有用。所以在网页的"设置模型"里给每个工具填上它用的模型和档位后：

- 纯提示词、强制指令、套娃调用、固定流程、通用建议这几项"模型自己会的"加分，中档模型只算 50%，小模型只算 20%。
- 已知清单的结论也随档位放宽：前沿"建议删除" → 中档"可以考虑" → 小模型"建议保留"。规则里可以用 `by_tier` 单独指定。
- 删除会让所有工具都失去这个 skill，所以**整体结论按能看到它的最弱模型**来定；每个工具自己的结论显示在安装位置旁边，只想让某个工具不用时用"卸载"。
- 没设置档位的工具按前沿模型算。设置保存在 `~/.skillmolt/config.json`。

社区维护的[已知过时清单](skillmolt/data/known.json)优先于自动规则。比如 superpowers 系列、`karpathy-guidelines`、`full-output-enforcement`。

分数只是参考，最终由你决定。一个 skill 对你有没有用，取决于你用什么模型、做什么事。

## 安全

- 只监听 `127.0.0.1`，并校验 Host 头，防止 DNS rebinding。
- 每次启动生成随机 token，其他网站无法调用接口。
- 只能操作本次扫描到的 skill，不接受任意路径。
- 永远不做永久删除：文件进废纸篓，操作有记录、可撤销。

## 贡献已知过时的 skill

编辑 [`skillmolt/data/known.json`](skillmolt/data/known.json)，加一条规则：

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

**Manage the skills of every AI agent on your machine, find the ones your models have outgrown, and clean them up with one click. Everything can be undone.**

A crab has to molt its old shell to grow. Models outgrow skills the same way.

Many skills were written for an older generation of models. They tell the model to "think first", "verify before claiming done" or "never truncate output". Current GPT, Claude and DeepSeek models already do all of that. Such skills still get loaded into context on every trigger, and they drag simple tasks through a fixed ceremony.

SkillMolt scans the skills folders of your AI tools and gives each skill a **drag index** with reasons. You can then uninstall or delete a skill with one click. Deleted skills go to the Trash and every action can be undone.

### Quick start

```bash
git clone https://github.com/x2724009/skillmolt.git
cd skillmolt
python3 -m skillmolt
```

There is nothing to install: the tool uses only the Python standard library and needs Python 3.8+.

### Features

- **Scans many agents**: Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, Windsurf, Kiro, Qwen Code, Trae and the shared `~/.agents/skills` folder. A skill linked into several agents is shown once.
- **Drag index with reasons**: every point added or removed is explained. See the table above.
- **Packages**: skills installed together (for example lark-* or superpowers) are grouped, and a whole package can be uninstalled or deleted as one undoable action. Packages are detected from installer lock files, plugin manifests, git repositories, the known list, a shared folder, and finally shared name prefixes (marked as a guess).
- **Uninstall** removes one agent's symlink. **Delete** moves the folder to the Trash and removes every link to it.
- **Model-aware scoring**: label each agent with the model it runs and its tier (frontier, mid-range, small). Points for things strong models already do count 50% for mid-range and 20% for small models, and known-list verdicts relax the same way. The overall verdict follows the weakest model that can see a skill.
- **Everything is undoable** from the History panel.
- **Finds broken symlinks.**
- **Safe by design**: the server listens on localhost only, uses a per-run token and Host checks, acts only on scanned skills and never deletes permanently.

Contributions to the [known list](skillmolt/data/known.json) are welcome.
