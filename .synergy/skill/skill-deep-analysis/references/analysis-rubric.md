# Analysis Rubric

Score skill analysis quality before updating the canonical skill record.

## Dimensions

| Dimension | Question |
| --- | --- |
| Purpose clarity | Is the skill's primary job obvious? |
| Trigger precision | Are use and non-use cases clear? |
| Capability granularity | Are capabilities specific and reusable? |
| Evidence traceability | Can claims be traced to source content or explicit inference? |
| Risk identification | Are tools, permissions, and side effects documented? |
| Pack utility | Does the analysis help include/exclude the skill in packs? |
| Dedupe utility | Does it expose overlaps, aliases, and conflicts? |

## Confidence

- `high` — source is clear, license known, behavior and risks are well evidenced.
- `medium` — usable, with some inferred boundaries or minor gaps.
- `low` — important ambiguity remains; use cautiously.
- `unknown` — insufficient source evidence.

Do not inflate confidence to make a pack pass evaluation. Unknown license, unclear side effects, or missing trigger semantics lowers confidence.
