# Day Five GitHub Ready Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the pixel alchemy demo understandable and publishable as a GitHub project.

**Architecture:** Add project-level documentation in `README.md`, add a static intro block in `App`, and style it with the existing paper UI language. Do not change simulation rules, sharing payloads, or material behavior.

**Tech Stack:** React 19, TypeScript 6, Vite, Vitest, Testing Library, GitHub CLI

---

## File Map

- Create `README.md`: GitHub-facing project overview, setup, material table, sharing notes, and roadmap.
- Modify `src/App.tsx`: update label to “试验 05” and add a short intro section above the canvas.
- Modify `src/App.test.tsx`: assert the fifth-day label and intro text.
- Modify `src/styles.css`: style the intro block responsively.

### Task 1: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

Create `README.md` with:

```md
# 像素炼金术

一个受 [Sandspiel](https://sandspiel.club/) 启发的轻量像素物理沙盒。当前版本是纯前端 demo：选择材料，在画布上绘制，然后观察沙子、水、火、植物、蒸汽、熔岩和酸液互相影响。

## 当前功能

- 11 种材料：沙子、水、墙、石头、木头、油、火、植物、蒸汽、熔岩、酸液
- 橡皮工具
- 鼠标或触控绘制
- 暂停、继续、单步和清空
- URL 分享当前画布、随机状态和下一步扫描方向
- 桌面和手机窄屏布局

## 快速开始

需要 Node.js `20.19+` 或 `22.13+`。

```bash
npm ci
npm run dev
```

常用检查：

```bash
npm test
npm run build
```

开发服务器默认运行在 `http://127.0.0.1:5173/`。

## 材料

| 材料 | 行为 |
| --- | --- |
| 沙子 | 下落，受阻后斜滑 |
| 水 | 下落并横向流动，可穿过油 |
| 墙 | 固定不动，可被酸液腐蚀 |
| 石头 | 只垂直下落，可被酸液腐蚀 |
| 木头 | 固定可燃，可被火或熔岩点燃 |
| 油 | 可燃液体，浮在水上 |
| 火 | 上漂、点燃可燃物并随机熄灭 |
| 植物 | 接触水时生长，可燃 |
| 蒸汽 | 向上漂浮，随机冷凝成水 |
| 熔岩 | 遇水变石头并产蒸汽，可点燃可燃物 |
| 酸液 | 腐蚀墙、石头、木头和植物，随后一起消失 |

## 分享链接

点击“分享”会把当前画布编码到 `#share=` 链接里，并保存随机状态和下一步扫描方向。复制剪贴板通常需要 HTTPS 或 localhost 权限。

当前分享格式是 `v2`。旧版 `v1` 链接会被视为无效链接，并安全回退为空白画布。

## 项目来源

这个项目参考了 Sandspiel 的核心体验，但实现是为 3-7 天学习周期抽取的轻量独立版本。目标是先做出能玩、能解释、能继续扩展的 demo。

## 后续方向

- 笔刷大小
- 更多材料和反应
- 移动端手势优化
- 作品截图或导出
- 部署到静态站点
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add github readme"
```

### Task 2: App Intro

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing App tests**

In `src/App.test.tsx`, update the first test to expect `试验 05`:

```ts
expect(screen.getByText("试验 05")).toBeInTheDocument();
```

Add these expectations to the same test:

```ts
expect(
  screen.getByText("选择材料，在画布上绘制；暂停后可单步观察。"),
).toBeInTheDocument();
expect(
  screen.getByText("熔岩遇水成石并产蒸汽，酸液会腐蚀墙、石头、木头和植物。"),
).toBeInTheDocument();
expect(
  screen.getByText("分享会复制当前画布和随机状态；需要 HTTPS 或 localhost 剪贴板权限。"),
).toBeInTheDocument();
```

- [ ] **Step 2: Run focused test and verify RED**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because the app still shows “试验 04” and has no intro block.

- [ ] **Step 3: Implement App intro**

In `src/App.tsx`, change:

```tsx
<span className="experiment-label">试验 05</span>
```

Add this section after `</header>` and before the canvas section:

```tsx
<section className="intro-card" aria-label="玩法说明">
  <p>选择材料，在画布上绘制；暂停后可单步观察。</p>
  <p>熔岩遇水成石并产蒸汽，酸液会腐蚀墙、石头、木头和植物。</p>
  <p>分享会复制当前画布和随机状态；需要 HTTPS 或 localhost 剪贴板权限。</p>
</section>
```

- [ ] **Step 4: Style intro block**

In `src/styles.css`, add:

```css
.intro-card {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid #897a68;
  color: #514538;
  background: #f7f0e5;
  box-shadow: 3px 3px 0 #cdbba3;
  font: 600 0.9rem/1.45 system-ui, sans-serif;
}

.intro-card p {
  margin: 0;
}
```

Inside the existing mobile media query, add:

```css
.intro-card {
  margin-bottom: 10px;
  padding: 10px;
  font-size: 0.84rem;
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: add day five intro"
```

### Task 3: Verification And GitHub Publish Attempt

**Files:**
- No planned code changes.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Browser smoke test**

Start the local server:

```bash
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/` and verify:

```text
The page shows 像素炼金术, 试验 05, the intro copy, material buttons, and operation buttons.
The browser console has no app errors.
At 390 x 844, there is no whole-page horizontal overflow.
```

- [ ] **Step 4: Check GitHub publishing prerequisites**

Run:

```bash
gh auth status
git remote -v
```

Expected in the current environment: GitHub auth reports an invalid token and no remote is configured. Stop before push if either remains true.

- [ ] **Step 5: If GitHub auth and remote are fixed, publish**

Only when `gh auth status` succeeds and `origin` exists:

```bash
git push -u origin codex/day-five-github-ready
```

Then create a draft PR using GitHub CLI or connector:

```bash
gh pr create --draft --title "[codex] prepare pixel alchemy for GitHub" --body-file /tmp/pixel-alchemy-day-five-pr.md
```

