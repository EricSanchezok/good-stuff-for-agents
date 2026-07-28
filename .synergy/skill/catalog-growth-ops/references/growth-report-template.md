# Growth Owner Report Template

Nightly Catalog v3 has one ledger-driven report. During a Nightly run, return structured owner output to the controller rather than creating a parallel report. Use this Markdown template only for an explicitly requested growth-only diagnostic, and bind it to the same immutable context.

```md
# Catalog Growth Owner Report — <date>

## Run Binding
- Run ID:
- Immutable context digest:
- Prepared intent count: 0 / 1 / 2
- Context or intent mutation detected: no

## Fixed Issue Stage
- Repository: EricSanchezok/good-stuff-for-agents
- Open-Issue list fully paginated: yes / no
- Total open Issues scanned:
- Complete comment pagination verified: yes / no
- Changed or unassessed Issues processed:

| Issue | Intake | Classification | Fulfillment | TOCTOU | Dedup | Response state | Comment ID | Assessment path | Response-ledger path |
|---:|---|---|---|---|---|---|---:|---|---|

- Held for review:
- Reply blocked:
- No action because already posted:
- Restricted comments posted:
- Other GitHub mutations: none

Do not copy Issue bodies, comments, attack payloads, secrets, attachment contents, or unnecessary personal data into this report. Record digests, criterion IDs, canonical evidence paths, and terminal reasons instead.

## Intent Outcomes

### Intent <id>
- Intent matches prepared object: yes / no
- Terminal: promoted / rejected / no_pack_clean / blocked / skipped_repeat
- Prior failure fingerprint checked:
- Failure fingerprint:
- Minimal evidence-bundle path or inventory:
- Missing evidence and owner:
- Preflight proof path and digest:
- Preflight repair used: yes / no
- Evaluation session isolated: yes / no
- Evaluation path:
- Post-evaluation repair used: yes / no
- Canonical Pack writer result:
- Canonical Evaluation writer result:

Repeat this section no more than twice.

## Bounded Evidence Work
| Owner phase | Exact target gap | Inputs | Outputs | Deferred reason |
|---|---|---|---|---|

- Unrelated discovery or backfill performed: no
- Repeated failure fingerprint retried: no

## Validation
- Commands:
- Results:
- Remaining structural blockers:

## Return To Controller
- Issue stage complete:
- Intent terminals complete:
- Zero-Pack result valid:
- Paths returned for sealing:
- Owner-classified blockers:
```
