---
schema_version: 1
skill_id: skl_bids-src-https-github-com-k-dense-ai-scientific-ag-40e9c532-ent-skills-5bdb6d39-skills-bids-skill-md_40e9c532
source_hash: git_sha1:cf375000dbdede92b789bc5935b0712c64981a2a
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:28:47.785Z"
---

# BIDS (Brain Imaging Data Structure) — Neuroimaging Data Organization Standard

# BIDS (Brain Imaging Data Structure)

This is a reference skill that encodes the BIDS standard — the dominant community convention for organizing and sharing neuroimaging datasets. It covers directory structure, naming rules, required metadata, modality-specific JSON sidecars, events files, the BIDS validator, DICOM-to-BIDS conversion tools, and programmatic access via pybids. If you need to organize, validate, or convert neuroimaging data in a way that any lab or toolchain will understand, this is the thing you want loaded.

## Why it matters

BIDS is the closest thing neuroimaging has to a universal data layout — journals, repositories like OpenNeuro, and analysis pipelines (fMRIPrep, MNE-BIDS) all expect it. The skill encodes a standard that is genuinely essential, not niche. But as a skill artifact, it is fundamentally a reference document: it recites a public specification plus tool names. There is no unique insight, no novel workflow synthesis, no judgment layer. This is competent domain documentation packaged as a skill. If a BIDS website page and the BIDS starter kit README already exist, loading this skill adds value primarily by keeping the agent from needing to fetch those resources live — useful, but not distinctive.

## Where it helps, where it hurts

**Best-case scenario:** An agent is handed a directory of raw DICOM files from an MRI scanner and told to organize them into a shareable BIDS dataset for an OpenNeuro submission. The subject visit structure is irregular (some subjects have multiple sessions, some have one), and the agent needs to map scanner series numbers to BIDS modality folders, generate correct sidecar JSONs, create participants.tsv from a clinical spreadsheet, and run the validator. Loading this skill prevents the agent from inventing a directory structure that breaks every downstream tool.

**Worst-case / failure scenario:** An agent loads this skill for a medical imaging task that has nothing to do with brain research — say, organizing chest CT scans for a radiology AI project. The skill teaches brain-specific hierarchies (anat, func, dwi, fmap) and modality conventions that are entirely wrong for non-neuroimaging. The agent will produce a BIDS-like structure that is neither valid BIDS nor useful for the actual task. Less dramatically: the skill assumes the agent already knows what fMRI, EEG, MEG, and PET data look like at the file level — if the agent lacks that domain knowledge, the naming and metadata conventions will be opaque rather than clarifying.

## What it quietly assumes

First, it assumes the user has neuroimaging domain knowledge — it teaches a standard for organizing data, not what the data is. If you don't know the difference between a T1w anatomical and a BOLD functional run, the naming rules won't save you.

Second, it assumes the BIDS specification version hasn't drifted. BIDS has a BEP (BIDS Extension Proposal) process that regularly adds new modalities and changes conventions. The skill is a snapshot; if the BIDS spec has evolved, the agent may follow outdated rules.

Third, it assumes the conversion tools (dcm2niix, bidscoin, heudiconv) are installed and functional. These tools have complex dependency chains, and the skill does not handle installation or troubleshooting.

Fourth, it assumes the input data is reasonably clean and complete. Real-world scanner DICOM often has missing series descriptions, inconsistent protocol names, or corrupted headers. The skill offers no guidance for data forensics.

These assumptions hold in well-resourced neuroimaging labs with experienced researchers and IT support — maybe 60% of real situations.

## What could go wrong

No tool execution risks in the traditional sense — this skill does not run shell commands, send emails, or access networks. The risks are all in the agent's actions guided by the skill's knowledge: DICOM conversion tools can produce superficially valid NIfTI files with incorrect voxel dimensions, swapped axes, or lost metadata. The BIDS validator checks file *naming* and JSON *structure*, not whether the image data itself is correct. A dataset could pass validation and still be scientifically worthless. File reorganization can destroy irreplaceable scan data if the agent applies naming conventions to original data instead of copies. User should verify output before deleting originals.

## Bottom line

This is an essential reference for a narrow, high-stakes domain. If your catalog serves neuroimaging researchers, this earns a spot because BIDS is the single standard that gatekeeps reproducibility, sharing, and toolchain compatibility in that field. If your catalog is general-purpose, this is too niche. The biggest benefit is preventing an agent from inventing its own directory layout that no tool can read; the biggest risk is the agent mechanically applying brain-imaging conventions to the wrong kind of data, or silently corrupting files during DICOM conversion.

## Confidence: medium

The artifact content is a summary description, not the full skill source. Cannot judge the actual quality of the instructional text or whether the skill includes critical safety warnings.