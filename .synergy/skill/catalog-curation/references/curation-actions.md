# Curation Actions

Curation has two lanes:

1. **Routine autonomous activation** — reversible activation or preview of public sources that pass `autonomous-source-activation.md`.
2. **Human-owned curation** — risky, ambiguous, irreversible, endorsement-like, license-sensitive, merge/delete, or policy-exception decisions.

Allowed routine autonomous actions:

- activate a high-confidence public GitHub source as `active`;
- mark a safe but lower-confidence public GitHub source as `preview`;
- leave a source candidate blocked, rejected, or candidate-only with reasons.

Human-owned actions:

- resolve unclear or restrictive license evidence;
- merge duplicate sources or skills;
- delete, remove, or irreversibly alter records;
- approve publication overrides;
- handle private, credentialed, sensitive, legal, or endorsement-risk sources.

All writes must flow through catalog-data scripts or approved narrow curation scripts. Curation must preserve provenance, aliases, analysis, relation evidence, and published pack references.
