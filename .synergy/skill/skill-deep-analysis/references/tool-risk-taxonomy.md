# Tool and Risk Taxonomy

## Side Effect Levels

- `none` — reads and reasoning only.
- `local_write` — writes repository-local files.
- `external_read` — reads public or configured external sources.
- `external_write` — sends, posts, mutates remote systems, or acts on user identity.
- `credentialed` — requires secrets or authenticated APIs.

## Risk Surfaces

Use stable labels in skill records and analyses:

- `filesystem-write`
- `shell-execution`
- `network-read`
- `network-write`
- `credential-access`
- `git-history`
- `license-compliance`
- `privacy`
- `security-review`
- `publishing`
- `destructive-action`

## Analysis Requirements

For every required or optional tool, record:

1. why the tool is needed;
2. whether it reads or writes;
3. what permission boundary applies;
4. what safe fallback exists;
5. whether user approval is required for external identity actions.
