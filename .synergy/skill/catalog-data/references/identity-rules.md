# Identity Rules

IDs must be stable and deterministic.

```txt
source_id          = src_<slug>_<hash8>
source_skill_id    = uuidv5(source_id + relative_path + declared_name)
version_id         = sha256(normalized_content + normalized_metadata)
canonical_skill_id = skl_<slug>_<hash8>
pack_id            = pack_<slug>_<hash8>
run_id             = run_<YYYYMMDDHHmmss>_<hash8>
evaluation_id      = eval_<run-id>_<hash8>
```

Do not use random UUIDs for catalog identity. Random IDs are acceptable only for temporary run-local draft filenames.
