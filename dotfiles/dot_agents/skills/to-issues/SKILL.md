---
name: to-issues
description: 使用 tracer-bullet 垂直切片，把计划、规格或 PRD 拆成项目 issue tracker 上可独立领取的 issues。适用于用户想把计划转成 issues、创建实现议题，或把工作拆成 issues 时。
---

# To Issues

使用 vertical slices（tracer bullets）把计划拆成可独立领取的 issue tracker issues。

Issue tracker 和 triage label vocabulary 应该已经提供给你；如果没有，运行 `/setup-matt-pocock-skills`。

## Process

### 1. Gather context

基于 conversation context 中已有内容工作。如果用户传入 issue reference（issue number、URL 或 path）作为参数，从 issue tracker 获取它，并读取完整 body 和 comments。

### 2. Explore the codebase (optional)

如果还没探索 codebase，就先探索，以理解代码当前状态。Issue titles 和 descriptions 应使用项目 domain glossary vocabulary，并遵守相关 ADRs。

### 3. Draft vertical slices

把计划拆成 **tracer bullet** issues。每个 issue 都是一个薄 vertical slice，end-to-end 穿过所有 integration layers，而不是某一层的 horizontal slice。

Slices 可以是 `HITL` 或 `AFK`。HITL slices 需要人类交互，例如 architecture decision 或 design review。AFK slices 可以无人交互地实现并合并。尽可能优先 AFK。

<vertical-slice-rules>
- 每个 slice 都交付一条窄但 COMPLETE 的路径，穿过每一层（schema, API, UI, tests）
- 完成后的 slice 自身可 demo 或验证
- 偏好多而薄的 slices，而不是少而厚的 slices
</vertical-slice-rules>

### 4. Quiz the user

把 proposed breakdown 作为编号列表展示。每个 slice 显示：

- **Title**：短描述名
- **Type**：HITL / AFK
- **Blocked by**：哪些其他 slices 必须先完成（如果有）
- **User stories covered**：覆盖哪些 user stories（如果 source material 中有）

询问用户：

- Granularity 是否合适？（too coarse / too fine）
- Dependency relationships 是否正确？
- 是否需要 merge 或继续 split 某些 slices？
- HITL 和 AFK 标记是否正确？

迭代直到用户批准 breakdown。

### 5. Publish the issues to the issue tracker

对每个批准的 slice，把新 issue 发布到 issue tracker。使用下面的 issue body template。这些 issues 被视为已准备好给 AFK agents 接手；除非另有指示，发布时应用正确的 triage label。

按 dependency order 发布 issues（blockers first），这样可以在 "Blocked by" 字段引用真实 issue identifiers。

<issue-template>
## Parent

对 issue tracker 中 parent issue 的引用（如果 source 是现有 issue；否则省略本 section）。

## What to build

这个 vertical slice 的简洁描述。描述 end-to-end behavior，不要按 layer-by-layer implementation 描述。

避免具体 file paths 或 code snippets；它们很快会过时。例外：如果 prototype 产出的 snippet 比 prose 更精确地编码了某个决策（state machine、reducer、schema、type shape），可以内联在这里，并简短说明它来自 prototype。保留决策密集部分，不要放完整 working demo。

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- 对 blocking issue 的引用（如果有）

如果没有 blocker，写 "None - can start immediately"。

</issue-template>

不要 close 或 modify 任何 parent issue。
