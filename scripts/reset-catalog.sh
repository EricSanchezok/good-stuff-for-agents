#!/usr/bin/env bash
#
# reset-catalog.sh — 一键清理所有 nightly/catalog 运行产物，回到 pre-SOP 干净状态
#
# 用法：
#   bash scripts/reset-catalog.sh
#
# 会删除的内容：
#   - catalog/analyses/      所有 skill 分析
#   - catalog/skills/records/ 所有规范化 skill 记录
#   - catalog/skills/candidates/ 所有候选 skill
#   - catalog/relations/      所有关系边
#   - catalog/packs/published/ 已发布的 pack
#   - catalog/packs/index.jsonl
#   - catalog/sources/registry.yaml state.jsonl candidates.jsonl
#   - catalog/sources/snapshots/ blobs/
#   - catalog/indexes/       所有索引文件
#   - catalog/runs/
#   - reports/nightly-catalog-ops/ reports/catalog-growth-ops/ reports/source-discovery/
#   - docs/                  所有生成的公共页面
#   - README.md              重置为干净模板

set -euo pipefail

cd "$(dirname "$0")/.."

# ── 1. 检查工作区必须是干净的 ──
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "❌ 工作区有未提交的改动，请先 commit 或 stash 后再执行清理。"
  echo ""
  echo "   git status 输出："
  git status --short
  exit 1
fi

# ── 2. 列出将要删除的文件（dry preview） ──
echo "══════════════════════════════════════════════"
echo "  🔍 预览：将删除以下 Git 追踪的文件"
echo "══════════════════════════════════════════════"
echo ""

REMOVABLE_PATTERNS=(
  "catalog/analyses/"
  "catalog/skills/records/"
  "catalog/skills/candidates/"
  "catalog/relations/"
  "catalog/packs/published/pck_"
  "catalog/packs/index.jsonl"
  "catalog/sources/registry.yaml"
  "catalog/sources/state.jsonl"
  "catalog/sources/candidates.jsonl"
  "catalog/sources/snapshots/"
  "catalog/sources/blobs/"
  "catalog/indexes/domain-catalog.jsonl"
  "catalog/indexes/skill-catalog.jsonl"
  "catalog/indexes/manifest.json"
  "catalog/indexes/pack-catalog.jsonl"
  "catalog/indexes/source-catalog.jsonl"
  "catalog/indexes/shards/"
  "catalog/runs/"
  "reports/nightly-catalog-ops/"
  "reports/catalog-growth-ops/"
  "reports/source-discovery/"
  "docs/"
)

FILE_COUNT=0
ALL_FILES_TMP=$(mktemp)
trap 'rm -f "$ALL_FILES_TMP"' EXIT

for pat in "${REMOVABLE_PATTERNS[@]}"; do
  git ls-files "$pat" 2>/dev/null >> "$ALL_FILES_TMP" || true
done

FILE_COUNT=$(sort -u "$ALL_FILES_TMP" | wc -l | tr -d ' ')

if [ "$FILE_COUNT" -eq 0 ]; then
  echo "  ✨ 没有需要清理的文件，repo 已经是干净状态。"
  exit 0
fi

sort -u "$ALL_FILES_TMP" | while read -r f; do
  echo "  $f"
done

echo ""
echo "  共 $FILE_COUNT 个文件将被删除"
echo ""
echo "  README.md 将被重置为干净模板"
echo ""

# ── 3. 交互确认 ──
read -r -p "  确认执行清理？输入 yes 继续: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "  已取消。"
  exit 0
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  🧹 开始清理..."
echo "══════════════════════════════════════════════"
echo ""

# ── 4. 删除文件 ──
for pat in "${REMOVABLE_PATTERNS[@]}"; do
  git rm -r -q "$pat" 2>/dev/null || true
done

# ── 5. 重置 README.md ──
cat > README.md << 'READMEEOF'
<p align="center">
  <img src="assets/brand/synergy-logo-192.png" width="88" alt="Synergy logo" />
</p>

<h1 align="center">Good Stuff for Agents</h1>

<p align="center"><strong>A catalog of useful agent skills, trustworthy sources, and ready-to-run packs.</strong></p>

<p align="center">
  <img src="assets/readme/hero-ai.png" width="960" alt="A friendly agent collecting and organizing skill catalog evidence" />
</p>

## What this is

This repository is a Skill Intelligence Catalog: a collection of agent skills from public sources, organized so agents (and people) can discover what's available, where it came from, and how skills work together.

The catalog is built and maintained by automation — skills are discovered, extracted, analyzed, and packaged by agents, not by hand.

## How to browse

Once the catalog is populated, browse by:

- **Packs** — ready-to-run routes for complete agent tasks
- **Skills** — individual capabilities with scope and evidence
- **Sources** — the public projects behind the skills
- **Domains** — browse by problem space

## Status

The catalog is freshly initialized. No data has been collected yet. Run the nightly pipeline to start discovery.
READMEEOF

git add README.md

# ── 6. 提交 ──
DELETED=$(git diff --cached --name-only | wc -l | tr -d ' ')
git commit -q -m "reset: wipe all catalog data, reports, and generated docs to pre-SOP state

Remove all previous run output to restart with a clean catalog.

Co-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>"

echo "  ✅ 清理完成 — $DELETED 个文件已删除并提交"
echo ""
echo "  git log -1 --oneline:"
git log -1 --oneline
