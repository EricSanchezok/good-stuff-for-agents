# Pack v3 Output Contract

A candidate is written only through `.synergy/skill/catalog-data/scripts/write-pack-record.mjs`. The canonical output is `catalog/packs/candidates/<pack-id>/pack.yaml`; the same write also creates `catalog/packs/candidates/<pack-id>/preflight-proof.json`.

## Semantic Draft Shape

The draft supplies reviewed design data. The writer supplies `schema_version: 3`, `status: candidate`, the controlled destination, and the candidate proof.

```json
{
  "pack_id": "pack_example_1234abcd",
  "name": "Example Pack",
  "intent": "Turn a validated brief into a reviewed deliverable",
  "domain": "example-domain",
  "version": "0.1.0",
  "description": "A claim-backed workflow with parallel review and final integration.",
  "members": [
    {
      "skill_id": "skl_prepare",
      "version_id": "sha256:current-a",
      "role": "prepare the working artifact",
      "inclusion_reason": "Produces the artifact required by both reviews"
    },
    {
      "skill_id": "skl_review_a",
      "version_id": "sha256:current-b",
      "role": "review one concern",
      "inclusion_reason": "Provides the first independent review artifact"
    },
    {
      "skill_id": "skl_review_b",
      "version_id": "sha256:current-c",
      "role": "review another concern",
      "inclusion_reason": "Provides the second independent review artifact"
    },
    {
      "skill_id": "skl_integrate",
      "version_id": "sha256:current-d",
      "role": "integrate review results",
      "inclusion_reason": "Consumes both review artifacts and produces the terminal result"
    }
  ],
  "excluded": [
    {
      "skill_id": "skl_other_reviewer",
      "reason": "Relation evidence prefers the included reviewer for this intent"
    }
  ],
  "workflow": {
    "nodes": [
      {
        "node_id": "prepare",
        "type": "fan_out",
        "member_ids": ["skl_prepare"],
        "label": "Prepare",
        "entry_contract": "A validated brief",
        "output_contract": "A working artifact ready for review",
        "fan_config": { "strategy": "parallel", "max_concurrency": 2 }
      },
      {
        "node_id": "review-a",
        "type": "task",
        "member_ids": ["skl_review_a"],
        "entry_contract": "The working artifact",
        "output_contract": "Review A findings"
      },
      {
        "node_id": "review-b",
        "type": "task",
        "member_ids": ["skl_review_b"],
        "entry_contract": "The working artifact",
        "output_contract": "Review B findings"
      },
      {
        "node_id": "integrate",
        "type": "fan_in",
        "member_ids": ["skl_integrate"],
        "entry_contract": "Review A findings and Review B findings",
        "output_contract": "A reviewed deliverable",
        "fan_config": { "strategy": "merge" }
      }
    ],
    "edges": [
      {
        "edge_id": "prepare-to-a",
        "from_node": "prepare",
        "to_node": "review-a",
        "direction": "fan_out",
        "artifact_handoff": {
          "produced": "Working artifact for review A",
          "consumed_as": "Review A input"
        }
      },
      {
        "edge_id": "prepare-to-b",
        "from_node": "prepare",
        "to_node": "review-b",
        "direction": "fan_out",
        "artifact_handoff": {
          "produced": "Working artifact for review B",
          "consumed_as": "Review B input"
        }
      },
      {
        "edge_id": "a-to-integrate",
        "from_node": "review-a",
        "to_node": "integrate",
        "direction": "fan_in",
        "artifact_handoff": {
          "produced": "Review A findings",
          "consumed_as": "First merge input"
        }
      },
      {
        "edge_id": "b-to-integrate",
        "from_node": "review-b",
        "to_node": "integrate",
        "direction": "fan_in",
        "artifact_handoff": {
          "produced": "Review B findings",
          "consumed_as": "Second merge input"
        }
      }
    ],
    "entry_roots": ["prepare"],
    "terminal_sinks": ["integrate"]
  },
  "compatibility": {
    "notes": "Required transfers use claim-bound chains; quality-only relations remain optional.",
    "chains": [
      {
        "relation_id": "rel_exact_pair_a",
        "disposition": "Required artifact handoff from producer claim to consumer required-input claim",
        "note": "Supports one named graph edge or branch"
      }
    ],
    "strengthens": [
      {
        "relation_id": "rel_quality_check",
        "disposition": "Optional cross-check; not needed to close a route"
      }
    ],
    "alternatives": [
      {
        "relation_id": "rel_alternative_choice",
        "disposition": "Prefer included reviewer for this intent"
      }
    ],
    "conflicts": [
      {
        "relation_id": "rel_conflict_pair",
        "disposition": "Conflicting skill excluded"
      }
    ]
  },
  "evidence": {
    "analysis_ids": ["anl_prepare", "anl_review_a", "anl_review_b", "anl_integrate"],
    "relation_ids": ["rel_exact_pair_a", "rel_quality_check", "rel_alternative_choice", "rel_conflict_pair"]
  },
  "mitigation": [
    {
      "risk": "A known analysis warning may affect review completeness",
      "strategy": "Carry the warning claim into independent evaluation",
      "contingency": "Reject the route if the precondition cannot be met"
    }
  ],
  "artifact_mapping": [
    {
      "node_id": "integrate",
      "artifact": "reviewed-deliverable",
      "description": "Terminal artifact assembled from both review branches"
    }
  ],
  "created_by_run": "run_..."
}
```

## Graph Fields

`workflow.nodes` defines the units of execution. Each node has a stable ID, a supported node type, and a `member_ids` array. Every Pack member is assigned to exactly one node; every assigned ID exists in `members`.

`workflow.edges` defines topology rather than relying on array order. Each edge names its source, target, and one of `sequential`, `fan_in`, `fan_out`, or `conditional`. Conditional edges carry a condition. Artifact transfers state what is produced and how it is consumed.

`workflow.entry_roots` names all valid starting nodes. `workflow.terminal_sinks` names all valid completion nodes. The graph is acyclic; every node is reachable from a root, and every intended route closes at a sink.

## Compatibility And Claim Binding

Each compatibility entry contains a canonical `relation_id` and a Pack-specific `disposition`.

- `chains` records required artifact handoffs. Each underlying `chains_with` relation binds an exact producer skill and `produces` claim to an exact consumer skill and `requires.required` claim. The relation direction must match the graph topology it supports.
- `strengthens` records optional quality improvements. It cannot satisfy a required edge or repair a missing consumer input.
- `alternatives` records why one candidate was selected, excluded, or made conditional.
- `conflicts` records exclusion, conditional separation, Pack split, or an unresolved block.

Fan-out and fan-in require branch-specific evidence. A fan-out must explain why each branch can consume the upstream artifact. A fan-in must identify each incoming artifact and show that the receiving node can combine them. One broad relation note is not a substitute for the exact pair supporting each required transfer.

## Preconditions, Warnings, And Mitigation

Analysis preconditions belong in node entry contracts, conditional routing, upstream preparation, or an explicit block. Tool constraints and refusal claims must remain visible when they affect feasibility or authorization. Material `failure_warnings` claims are handed to evaluation for a recorded disposition; synthesis may add mitigation but may not declare the warning cleared.

## Controlled Fields

The semantic draft must not set evaluation content, record buckets, output or expected paths, destinations, publication timestamps or status, or promotion controls. Those are outside synthesis ownership.

## Candidate Proof

After Pack v3 preflight succeeds, the canonical writer writes the candidate and generates `preflight-proof.json` beside it. The proof contains a digest and proof-rules version. The digest is content-addressed over the proof-bound Pack design and its cited Analysis v2 and Relation v2 evidence.

Do not author or edit this file. If proof-bound Pack content or evidence changes, invoke the canonical Pack writer again so a new proof is generated. Evaluation and promotion verify the existing proof's freshness and digest binding; they do not replace candidate-time proof generation.
