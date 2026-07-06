# Docs Structure

Public catalog pages live under `docs/`:

```txt
docs/
├── packs/
│   ├── README.md
│   ├── by-domain/
│   └── <domain>/<pack-id>.md
├── skills/
│   ├── README.md
│   ├── by-domain/
│   ├── by-source/
│   └── <2-char-prefix>/<skill-id>.md
├── sources/
│   ├── README.md
│   └── <source-id>.md
├── domains/
│   ├── README.md
│   └── <domain-id>.md
└── reports/
    └── README.md
```

`README.md` is the public entry point. The renderer owns these pages; you should not hand-edit rendered catalog sections. If copy or structure is wrong, update the renderer or the source catalog data, render again, and run checks.

Public pages should be clean Markdown for visitors. Keep internal maintenance details in project skills, catalog records, and internal reports.
