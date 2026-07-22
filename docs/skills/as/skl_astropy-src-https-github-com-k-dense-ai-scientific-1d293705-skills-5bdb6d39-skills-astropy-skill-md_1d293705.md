# astropy

> Ready to use

## Summary

# Astropy

This skill is a reference card for Astropy, the foundational Python astronomy library. It walks through six common workflows — coordinate transforms, FITS I/O, units, time, WCS, and cosmology — each illustrated with a short code snippet. If you already know astronomy and Python and just forgot whether it's `SkyCoord(ra=..., dec=..., frame='icrs')` or `SkyCoord(..., frame=ICRS())`, this will save you a documentation search. If you need anything deeper, you will land straight back in the Astropy docs.

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

This is a library cheat sheet that covers common ground competently but without depth, pedagogy, or safety rails. Compared to alternatives, I would pick it only if I needed an offline, loadable Astropy reference and had no other option. For most use cases, directing the agent to the actual Astropy documentation (or loading a more comprehensive astronomy-workflow skill) would produce better results with less risk. The single biggest benefit is convenience — it answers six common "how do I do X in Astropy?" questions without a web search. The single biggest risk is its silence on the hard parts: WCS distortions, memory management, coordinate frame physics, and cosmology model selection — the places where real astronomical data reduction fails. It is too narrow for a general audience, too shallow for a specialist audience, and too quiet about its own failure modes to trust with autonomous work.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
