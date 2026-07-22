# arbor

> Ready to use

## Summary

# Arbor Computational Neuroscience Skill

This is a usage guide for Arbor, a specialized C++/Python library for morphologically detailed neuronal network simulation. The skill teaches an agent how to build multi-compartment neuron models — soma, dendrites, axons with Cable cells — define Hodgkin-Huxley and passive ion channel kinetics, construct network recipes, inject current clamps, record membrane potentials, detect spikes, and run simulations with MPI/GPU support. It is essentially a well-structured tutorial wrapped as a skill: installation, morphology builder, mechanism catalog, simulation recipe, execution, visualization. If you already know computational neuroscience and need an agent to scaffold Arbor code, this skill provides that scaffold. If you don't know what a dendrite is, the skill will not save you.

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

This is a solid, accurate Arbor tutorial for computational neuroscientists who already know what they're doing. Compared to NEURON tutorials or the official Arbor documentation, it covers the standard workflow competently but adds no unique insight — it's a reference, not an innovation. I would pick this skill for an agent that needs to scaffold Arbor code for a domain expert, but I would not load it for any user who can't independently judge whether the resulting simulation is biologically plausible. The single biggest risk is silent garbage output from misconfigured parameters; the single biggest benefit is cutting the Arbor API-learning curve from hours to minutes. If it were dropped, a domain expert could get by with Arbor's own documentation, but an agent without this skill would produce noticeably slower and more error-prone code for this specific library.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
