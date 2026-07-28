#!/usr/bin/env python3
"""
reset-catalog.py — deterministic Blueprint-conformant catalog reset helper.

Modes:
  --dry-run     Read-only: list allowlisted derived paths and counts.
  --apply       Requires explicit preflight evidence. Fails closed without it.
                Preserves only stable source seed fields from trusted registry,
                deletes only allowlisted derived paths.

Options:
  --source-ref REF              Git ref for trusted registry seed (default: HEAD).
  --preflight-sync-ok           External evidence: source sync is non-blocking.
  --preflight-rate-limit-ok     External evidence: GitHub rate limit is non-blocking.

Stable source seed fields (preserved when rewriting):
  schema_version, source_id, name, url, type, status,
  license (spdx, verified, evidence),
  sync (default_ref, include, exclude)

Derived data allowlist (paths that are deleted):
  catalog/analyses/   catalog/skills/records/   catalog/skills/candidates/
  catalog/relations/  catalog/packs/            catalog/indexes/
  catalog/evaluations/  catalog/domains/        catalog/coverage.json
  catalog/runs/       catalog/sources/state.jsonl
  catalog/sources/candidates.jsonl
  catalog/sources/snapshots/  catalog/sources/blobs/
  reports/            docs/                      README.md
"""

import argparse
import os
import shutil
import subprocess
import sys

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STABLE_SOURCE_FIELDS = (
    "schema_version",
    "source_id",
    "name",
    "url",
    "type",
    "status",
)
STABLE_LICENSE_FIELDS = ("spdx", "verified", "evidence")
STABLE_SYNC_FIELDS = ("default_ref", "include", "exclude")

DERIVED_DIRS = [
    "catalog/analyses",
    "catalog/skills/records",
    "catalog/skills/candidates",
    "catalog/relations",
    "catalog/packs",
    "catalog/indexes",
    "catalog/evaluations",
    "catalog/domains",
    "catalog/runs",
    "catalog/sources/snapshots",
    "catalog/sources/blobs",
    "reports",
    "docs",
]

DERIVED_FILES = [
    "catalog/coverage.json",
    "catalog/sources/state.jsonl",
    "catalog/sources/candidates.jsonl",
    "README.md",
]


def main():
    parser = argparse.ArgumentParser(description="Catalog reset helper")
    parser.add_argument(
        "--dry-run", action="store_true", help="Read-only: list what would be deleted"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Execute reset (requires preflight evidence)",
    )
    parser.add_argument(
        "--source-ref",
        default="HEAD",
        help="Git ref for trusted registry seed (default: HEAD)",
    )
    parser.add_argument(
        "--preflight-sync-ok",
        action="store_true",
        help="Evidence that source sync is non-blocking",
    )
    parser.add_argument(
        "--preflight-rate-limit-ok",
        action="store_true",
        help="Evidence that GitHub rate limit is non-blocking",
    )
    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        print("error: must specify --dry-run or --apply", file=sys.stderr)
        sys.exit(2)

    if args.apply:
        if not args.preflight_sync_ok:
            print(
                "error: --apply requires --preflight-sync-ok "
                "(evidence that source sync is non-blocking)",
                file=sys.stderr,
            )
            sys.exit(1)
        if not args.preflight_rate_limit_ok:
            print(
                "error: --apply requires --preflight-rate-limit-ok "
                "(evidence that GitHub rate limit is non-blocking)",
                file=sys.stderr,
            )
            sys.exit(1)

    os.chdir(ROOT)

    # Extract stable seed from trusted git ref.
    seed_sources = _extract_seed(args.source_ref)
    if not seed_sources:
        print(
            "error: no active or preview source definitions found in registry at "
            f"ref {args.source_ref}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Enumerate derived files.
    derived_files = _compute_derived_files()

    if args.dry_run:
        print("reset-catalog mode: dry-run")
        print(f"stable sources: {len(seed_sources)}")
        for f in derived_files:
            print(f"  {f}")
        print(f"derived files: {len(derived_files)} (would be deleted)")
        print("dry-run only — no files were modified")
        return

    # --apply: delete derived data and rewrite registry.
    removed = _delete_derived_paths()
    _rewrite_registry(seed_sources)
    print(
        f"reset complete: removed {removed} derived files, "
        f"restored {len(seed_sources)} source definitions"
    )


def _extract_seed(ref):
    """Extract stable source definitions from registry at *ref*.

    Only active/preview sources are included.  Only stable fields are kept.
    """
    try:
        raw = subprocess.check_output(
            ["git", "show", f"{ref}:catalog/sources/registry.yaml"],
            stderr=subprocess.PIPE,
            encoding="utf-8",
        )
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"error: failed to read registry from ref {ref}: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        registry = yaml.safe_load(raw)
    except yaml.YAMLError as exc:
        print(f"error: failed to parse registry from ref {ref}: {exc}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(registry, dict) or not isinstance(registry.get("sources"), list):
        print('error: registry must contain a "sources" list', file=sys.stderr)
        sys.exit(1)

    stable_sources = []
    for src in registry["sources"]:
        if not isinstance(src, dict):
            continue
        status = src.get("status", "")
        if status not in ("active", "preview"):
            continue

        kept = _stable_source(src)
        if "source_id" in kept:
            stable_sources.append(kept)

    stable_sources.sort(key=lambda s: s.get("source_id", ""))
    return stable_sources


def _stable_source(src):
    """Return a copy of *src* containing only stable seed fields."""
    kept = {}
    for field in STABLE_SOURCE_FIELDS:
        if field in src:
            kept[field] = src[field]

    license_raw = src.get("license")
    if isinstance(license_raw, dict):
        kept["license"] = {
            field: license_raw[field]
            for field in STABLE_LICENSE_FIELDS
            if field in license_raw
        }

    sync_raw = src.get("sync")
    if isinstance(sync_raw, dict):
        kept["sync"] = {
            field: sync_raw[field] for field in STABLE_SYNC_FIELDS if field in sync_raw
        }

    return kept


def _compute_derived_files():
    """Walk allowlisted directories and collect all derived file paths.

    Symlinks are skipped with a warning.  Returns a sorted list of
    paths relative to ROOT.
    """
    found = []

    for dir_rel in DERIVED_DIRS:
        dir_path = os.path.join(ROOT, dir_rel)
        if not os.path.isdir(dir_path) or os.path.islink(dir_path):
            continue
        for dirpath, dirnames, filenames in os.walk(dir_path):
            # Filter out symlinked subdirectories.
            dirnames[:] = [
                d for d in dirnames if not os.path.islink(os.path.join(dirpath, d))
            ]
            for fn in sorted(filenames):
                full = os.path.join(dirpath, fn)
                if os.path.islink(full):
                    print(
                        f"warning: skipping symlink {os.path.relpath(full, ROOT)}",
                        file=sys.stderr,
                    )
                    continue
                found.append(os.path.relpath(full, ROOT))

    for file_rel in DERIVED_FILES:
        full = os.path.join(ROOT, file_rel)
        if os.path.isfile(full) and not os.path.islink(full):
            found.append(file_rel)

    found.sort()
    return found


def _delete_derived_paths():
    """Remove all allowlisted derived directories and files.

    Returns the number of top-level removals (not individual files).
    """
    removed = 0

    for dir_rel in DERIVED_DIRS:
        dir_path = os.path.join(ROOT, dir_rel)
        if os.path.isdir(dir_path) and not os.path.islink(dir_path):
            shutil.rmtree(dir_path)
            removed += 1

    for file_rel in DERIVED_FILES:
        file_path = os.path.join(ROOT, file_rel)
        if os.path.islink(file_path):
            continue
        try:
            if os.path.isfile(file_path) or os.path.isdir(file_path):
                if os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                else:
                    os.remove(file_path)
                removed += 1
        except FileNotFoundError:
            pass

    return removed


def _rewrite_registry(sources):
    """Write ``catalog/sources/registry.yaml`` with only stable seed fields."""
    registry_path = os.path.join(
        ROOT,
        "catalog",
        "sources",
        "registry.yaml",
    )
    os.makedirs(os.path.dirname(registry_path), exist_ok=True)
    registry = {"schema_version": 1, "sources": sources}
    with open(registry_path, "w", encoding="utf-8") as fh:
        yaml.dump(
            registry,
            fh,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
        )


if __name__ == "__main__":
    main()
