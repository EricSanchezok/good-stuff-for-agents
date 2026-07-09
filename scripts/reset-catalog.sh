#!/usr/bin/env bash
#
# reset-catalog.sh — 一键清理所有 nightly/catalog 运行产物，回到干净状态
#
# 用法：
#   bash scripts/reset-catalog.sh                     # 全量重置（默认）
#   bash scripts/reset-catalog.sh --keep growth       # 保留 growth 产物，仅重置 reports/docs
#   bash scripts/reset-catalog.sh --keep growth,reports # 保留 growth + 报告
#   bash scripts/reset-catalog.sh --keep all           # 不清除任何目录内容
#
# --keep 可选值：
#   growth   — 保留 sources / skills / analyses / relations / packs / candidates（pipeline 产出）
#   reports  — 保留所有 reports/ 内容
#   docs     — 保留 docs/ 内容 + 不重置 README.md
#   indexes  — 保留 catalog/indexes/
#   all      — 等价于 growth,reports,docs,indexes（不删除任何内容）
#
# 删除的目标分为两个文件清单：
#   GROWTH_DEL   = 所有 growth pipeline 产出（sources / skills / analyses / relations / packs / candidates / indexes）
#   REPORT_DEL   = 所有报告 + 文档 + README.md
#
# "--keep growth" 时：GROWTH_DEL 全部跳过，仍然删除 REPORT_DEL

set -euo pipefail

cd "$(dirname "$0")/.."

# ── 0. 解析参数 ──
KEEP_GROWTH=false
KEEP_REPORTS=false
KEEP_DOCS=false
KEEP_INDEXES=false

for arg in "$@"; do
  case "$arg" in
    --keep=*)
      IFS=',' read -ra KEEPS <<< "${arg#--keep=}"
      for k in "${KEEPS[@]}"; do
        case "$k" in
          growth)  KEEP_GROWTH=true ;;
          reports) KEEP_REPORTS=true ;;
          docs)    KEEP_DOCS=true ;;
          indexes) KEEP_INDEXES=true ;;
          all)     KEEP_GROWTH=true; KEEP_REPORTS=true; KEEP_DOCS=true; KEEP_INDEXES=true ;;
          *)       echo "❌ 未知 --keep 值: $k"; echo "   可选值: growth, reports, docs, indexes, all"; exit 1 ;;
        esac
      done
      ;;
    *) echo "❌ 未知参数: $arg"; exit 1 ;;
  esac
done

# ── 1. 检查工作区必须干净 ──
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "❌ 工作区有未提交的追踪文件改动，请先 commit 或 stash 后再执行清理。"
  echo ""
  echo "   git status 输出："
  git status --short
  exit 1
fi

# ── 2. 构建删除清单 ──

# GROWTH_DEL — pipeline 产出
if $KEEP_GROWTH; then
  GROWTH_PATTERNS=()
else
  GROWTH_PATTERNS=(
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
    "catalog/runs/"
  )
fi

# INDEX_DEL — indexes（独立粒度）
if $KEEP_INDEXES; then
  INDEX_PATTERNS=()
else
  INDEX_PATTERNS=(
    "catalog/indexes/domain-catalog.jsonl"
    "catalog/indexes/skill-catalog.jsonl"
    "catalog/indexes/manifest.json"
    "catalog/indexes/pack-catalog.jsonl"
    "catalog/indexes/source-catalog.jsonl"
    "catalog/indexes/shards/"
  )
fi

# REPORT_DEL — 报告 + 文档
REPORT_PATTERNS=()
if ! $KEEP_REPORTS; then
  REPORT_PATTERNS+=(
    "reports/nightly-catalog-ops/"
    "reports/catalog-growth-ops/"
    "reports/source-discovery/"
    "reports/nightly/"
  )
fi
if ! $KEEP_DOCS; then
  REPORT_PATTERNS+=("docs/")
fi

ALL_PATTERNS=("${GROWTH_PATTERNS[@]}" "${INDEX_PATTERNS[@]}" "${REPORT_PATTERNS[@]}")

# ── 3. 预览 ──
ALL_FILES_TMP=$(mktemp)
trap 'rm -f "$ALL_FILES_TMP"' EXIT

for pat in "${ALL_PATTERNS[@]}"; do
  [ -z "$pat" ] && continue
  git ls-files "$pat" 2>/dev/null >> "$ALL_FILES_TMP" || true
  git ls-files --others --exclude-standard "$pat" 2>/dev/null >> "$ALL_FILES_TMP" || true
done

sort -u -o "$ALL_FILES_TMP" "$ALL_FILES_TMP"
FILE_COUNT=$(wc -l < "$ALL_FILES_TMP" | tr -d ' ')

READMEEOF_RESET=$([ "$KEEP_DOCS" = false ] && echo "true" || echo "false")

echo "══════════════════════════════════════════════"
echo "  🔍 预览：将删除以下运行产物"
echo "══════════════════════════════════════════════"
if $KEEP_GROWTH;  then echo "  🟢 跳过 growth 产物（sources / skills / analyses / relations / packs）"; fi
if $KEEP_INDEXES; then echo "  🟢 跳过 indexes 文件"; fi
if $KEEP_REPORTS; then echo "  🟢 跳过 reports/ 目录"; fi
if $KEEP_DOCS;    then echo "  🟢 跳过 docs/ 目录和 README.md"; fi
echo ""

if [ "$FILE_COUNT" -eq 0 ] && [ "$READMEEOF_RESET" = "false" ]; then
  echo "  ✨ 没有需要清理的文件，repo 已经是干净状态。"
  exit 0
fi

if [ "$FILE_COUNT" -gt 0 ]; then
  sort -u "$ALL_FILES_TMP" | while read -r f; do
    echo "  $f"
  done
  echo ""
  echo "  共 $FILE_COUNT 个文件将被删除"
fi
if [ "$READMEEOF_RESET" = "true" ]; then
  echo "  README.md 将被重置为干净模板"
fi
echo ""

# ── 4. 交互确认 ──
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

# ── 5. 删除文件 ──
while IFS= read -r f; do
  [ -n "$f" ] && rm -f -- "$f"
done < "$ALL_FILES_TMP"

for pat in "${ALL_PATTERNS[@]}"; do
  [ -n "$pat" ] && git add -u -- "$pat" 2>/dev/null || true
done

# ── 6. 重置 README.md ──
if [ "$READMEEOF_RESET" = "true" ]; then
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
fi

# ── 7. 提交 ──
DELETED=$(git diff --cached --name-only | wc -l | tr -d ' ')
RESET_LABEL="docs/reports"
if $KEEP_GROWTH; then
  RESET_LABEL="reports/docs only (growth data preserved)"
fi
if [ "$FILE_COUNT" -eq 0 ] && [ "$READMEEOF_RESET" = "false" ]; then
  RESET_LABEL="nothing (already clean)"
fi

git commit -q -m "reset: wipe ${RESET_LABEL} to clean state

Co-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>"

echo "  ✅ 清理完成 — $DELETED 个文件已删除并提交"
echo ""
echo "  git log -1 --oneline:"
git log -1 --oneline
