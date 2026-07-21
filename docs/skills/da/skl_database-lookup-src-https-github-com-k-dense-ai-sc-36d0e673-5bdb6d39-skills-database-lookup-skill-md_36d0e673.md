# database-lookup

> Ready to use

## Summary

This skill is a retrieval methodology disguised as a database directory. It catalogs 78 public scientific APIs — from PubChem to FRED to SIMBAD — but the real payload is the disciplined workflow it imposes: define the query contract, select the authoritative source, plan filter semantics, make bounded API calls, treat responses as untrusted data, and return results with auditable provenance. This is not "look up X on the web." This is "retrieve X from the canonical database under conditions another researcher could reproduce."

## Source

- Source: K-Dense Scientific Agent Skills
- License: MIT (verified)

## Capabilities

- Domains: —
- Task types: —
- Best stage: —
- Capabilities: —

## Best Used For / Not For

Use when the trigger semantics and task stage match the job. Do not use when required tools, permissions, license, or confidence do not fit the current run.

## Inputs / Outputs

- Inputs: —
- Outputs: —
- Handoff outputs: —

## Related Packs

No published packs use this skill yet.

## Related Skills

No related skills are public yet.

## Public Analysis Summary

This is the best database-lookup skill I've analyzed for scientific and regulatory domains. Its reproducibility contract — explicit provenance, count reconciliation, filter transparency — is genuinely distinctive and raises the bar for what agent-assisted research retrieval should look like. The biggest risk is that its quality depends on 78 separate reference files maintained outside the skill itself; a stale or thin reference file for a specific database silently degrades the entire retrieval pipeline. The biggest benefit is that it transforms the agent from a search engine into a research instrument. If the reference files are well-maintained, there is no real competitor.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
