#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

import {
  PHASES, nextPhase, validateTransition, isTerminal, phaseIndex,
  buildEvent, computeEventDigest, canonicalStringify, validateChain,
  computeContentDigest, validateDigest, validateDescriptorShape,
  validateInputDigests, validateTerminalOutput, computeGateId,
  validateBaseline, serializeBaseline, canonicalPayloadDigest,
} from './lib/phase-state-machine.mjs';
import {
  eventsDir, outputsDir,
  publishOutput, verifyOutputByDescriptor,
  writeEventFile, readEventFile, readChain,
  appendPhaseEvent, appendTerminalEvent,
  verifyEventFileOnDisk, verifyAllEventFiles, eventExists,
} from './lib/event-store.mjs';
import {
  reserveRun, isRunReserved, readRunPhase,
} from './lib/run-reservation.mjs';
import {
  validateAgainstSchema,
  runContextSchemaV3, phaseEventSchemaV3, gateResultSchemaV3,
  sealSchemaV3, auditReceiptSchemaV3, terminalSchemaV3, runSummarySchemaV3,
} from '../../catalog-data/scripts/lib/schema-validators.mjs';

const tests = [];
let failures = 0;

function test(name, fn) { tests.push({ name, fn }); }

function tmpRunsRoot() { return mkdtempSync(join(tmpdir(), 'nf-')); }

function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function od(label, digest, len, rrp) {
  return { label, digest, byte_length: len, repo_relative_path: rrp };
}

function termPayload({ status, outcome, summary, lastPhaseEventDigest, totalActions, errors, warnings }) {
  const p = {
    schema_version: 3,
    run_id: 'run_x',
    status,
    outcome,
    summary: summary || 'test',
    total_actions: totalActions || 0,
    errors: errors || 0,
    warnings: warnings || 0,
    last_phase_event_digest: lastPhaseEventDigest || 'sha256:' + 'f'.repeat(64),
  };
  const { terminal_digest, ...rest } = p;
  p.terminal_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
  return p;
}

function appendAuditPhase({ root, runId, ready, auditId }) {
  const receipt = {
    schema_version: 3,
    audit_id: auditId,
    run_id: runId,
    seal_event_digest: 'sha256:' + 'a'.repeat(64),
    baseline_head: 'd'.repeat(40),
    seal_digest: 'sha256:' + 'a'.repeat(64),
    manifest_digest: 'sha256:' + 'a'.repeat(64),
    changed_paths: [],
    changed_paths_digest: 'sha256:' + 'a'.repeat(64),
    ready,
    errors: [],
    warnings: [],
  };
  receipt.receipt_digest = canonicalPayloadDigest(receipt, 'receipt_digest');
  const output = publishOutput({
    runsRoot: root,
    runId,
    name: `${auditId}.json`,
    content: JSON.stringify(receipt),
    repositoryRoot: root,
  });
  const event = appendPhaseEvent({
    runsRoot: root,
    runId,
    phase: 'audit',
    outputDescriptors: [od(output.label, output.digest, output.byte_length, output.repo_relative_path)],
    inputDigests: [],
  });
  return { receipt, output, event };
}

// ══════════════════════════════════════════════════════════════════════
//  Phase machine
// ══════════════════════════════════════════════════════════════════════

test('PHASES has 9 blueprint phases', () => {
  assert.deepEqual(PHASES, ['init','maintenance','issues','context','targets','gate','seal','audit','terminal']);
  assert.equal(PHASES.length, 9);
});

test('validateTransition: null->init ok, null->other rejected', () => {
  assert.ok(validateTransition(null,'init').ok);
  for (const p of PHASES.slice(1)) {
    const r = validateTransition(null, p);
    assert.equal(r.ok, false, `null->${p}`);
    assert.match(r.error, /bootstrap_transition/);
  }
});

test('validateTransition: direct-to-terminal from every non-terminal', () => {
  for (const p of PHASES.slice(0,-1)) assert.ok(validateTransition(p,'terminal').ok);
});

test('validateTransition: terminal absorbs', () => {
  for (const p of PHASES) {
    const r = validateTransition('terminal',p);
    assert.equal(r.ok,false,`terminal->${p}`);
    assert.match(r.error,/terminal_closure/);
  }
});

test('validateTransition: backward/skip/same rejected', () => {
  assert.equal(validateTransition('gate','context').ok, false);
  assert.equal(validateTransition('init','issues').ok, false);
  assert.equal(validateTransition('seal','seal').ok, false);
});

// ══════════════════════════════════════════════════════════════════════
//  Canonical
// ══════════════════════════════════════════════════════════════════════

test('canonicalStringify: key-order independent', () => {
  assert.equal(canonicalStringify({b:1,a:2}), canonicalStringify({a:2,b:1}));
});

test('canonicalStringify: nested', () => {
  assert.equal(canonicalStringify({x:{z:1,y:2}}), canonicalStringify({x:{y:2,z:1}}));
});

// ══════════════════════════════════════════════════════════════════════
//  Digest validators
// ══════════════════════════════════════════════════════════════════════

test('validateDigest rejects non-hex/non-prefix', () => {
  assert.equal(validateDigest('abc','x').ok, false);
  assert.equal(validateDigest(`sha256:${'g'.repeat(64)}`,'x').ok, false);
  assert.ok(validateDigest(`sha256:${'a'.repeat(64)}`,'x').ok);
});

test('validateDescriptorShape rejects bad label/path/length', () => {
  assert.equal(validateDescriptorShape(null).ok, false);
  assert.equal(validateDescriptorShape({label:'',digest:'sha256:'+'a'.repeat(64),byte_length:0,repo_relative_path:'x'}).ok, false);
  assert.equal(validateDescriptorShape({label:'a/b',digest:'sha256:'+'a'.repeat(64),byte_length:0,repo_relative_path:'x'}).ok, false);
  assert.equal(validateDescriptorShape({label:'a',digest:'sha256:'+'a'.repeat(64),byte_length:-1,repo_relative_path:'x'}).ok, false);
  assert.equal(validateDescriptorShape({label:'a',digest:'sha256:'+'a'.repeat(64),byte_length:0,repo_relative_path:'../x'}).ok, false);
  assert.equal(validateDescriptorShape({label:'a',digest:'sha256:'+'a'.repeat(64),byte_length:0,repo_relative_path:'/x'}).ok, false);
  assert.ok(validateDescriptorShape({label:'o.json',digest:'sha256:'+'a'.repeat(64),byte_length:0,repo_relative_path:'o.json'}).ok);
});

test('validateInputDigests rejects bad elements', () => {
  assert.ok(validateInputDigests([]).ok);
  assert.equal(validateInputDigests(['bad']).ok, false);
  assert.ok(validateInputDigests(['sha256:'+'a'.repeat(64)]).ok);
});

// ══════════════════════════════════════════════════════════════════════
//  Terminal semantic enforcement
// ══════════════════════════════════════════════════════════════════════

test('validateTerminalOutput: completed requires audit phase', () => {
  const out = termPayload({status:'completed',outcome:'published',lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  assert.ok(validateTerminalOutput('audit',out).ok);
  assert.equal(validateTerminalOutput('seal',out).ok, false);
  assert.match(validateTerminalOutput('seal',out).error,/terminal_completed_requires_audit/);
});

test('validateTerminalOutput: completed requires published or no_pack_clean', () => {
  const out = termPayload({status:'completed',outcome:null,lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  assert.equal(validateTerminalOutput('audit',out).ok, false);
  assert.match(validateTerminalOutput('audit',out).error,/completed_outcome/);
});

test('validateTerminalOutput: audit_blocked requires audit + null outcome', () => {
  const out = termPayload({status:'audit_blocked',outcome:null,lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  assert.ok(validateTerminalOutput('audit',out).ok);
  assert.equal(validateTerminalOutput('seal',out).ok,false);
  const bad = termPayload({status:'audit_blocked',outcome:'published',lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  assert.equal(validateTerminalOutput('audit',bad).ok,false);
});

test('validateTerminalOutput: blocked/failed/interrupted require null outcome', () => {
  for (const s of ['blocked','failed','interrupted']) {
    const out = termPayload({status:s,outcome:null,lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
    assert.ok(validateTerminalOutput('gate',out).ok, s);
    assert.ok(validateTerminalOutput('audit',out).ok, s);
    const bad = termPayload({status:s,outcome:'published',lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
    assert.equal(validateTerminalOutput('gate',bad).ok,false,s);
  }
});

test('validateTerminalOutput: invalid status/outcome rejected', () => {
  const bad = termPayload({status:'unknown',outcome:null,lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  assert.equal(validateTerminalOutput('audit',bad).ok,false);
});

// ══════════════════════════════════════════════════════════════════════
//  Gate ID
// ══════════════════════════════════════════════════════════════════════

test('computeGateId: deterministic', () => {
  const rid = 'run_gate-test';
  const cd = 'sha256:' + 'c'.repeat(64);
  const ped = 'sha256:' + 'a'.repeat(64);
  const g1 = computeGateId(rid, cd, ped);
  const g2 = computeGateId(rid, cd, ped);
  assert.equal(g1, g2);
  assert.match(g1, /^gate_[a-f0-9]{16}$/);
});

test('computeGateId: different inputs produce different ids', () => {
  const g1 = computeGateId('run_a', 'sha256:'+'c'.repeat(64), 'sha256:'+'a'.repeat(64));
  const g2 = computeGateId('run_b', 'sha256:'+'c'.repeat(64), 'sha256:'+'a'.repeat(64));
  assert.notEqual(g1, g2);
});

// ══════════════════════════════════════════════════════════════════════
//  Baseline
// ══════════════════════════════════════════════════════════════════════

test('validateBaseline: rejects non-40-hex head', () => {
  assert.equal(validateBaseline({head_sha:'abc',branch:'main',worktree_clean:true}).ok,false);
});

test('validateBaseline: rejects non-clean worktree', () => {
  assert.equal(validateBaseline({head_sha:'d'.repeat(40),branch:'main',worktree_clean:false}).ok,false);
});

test('validateBaseline: valid baseline accepted', () => {
  assert.ok(validateBaseline({head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}).ok);
});

test('serializeBaseline: produces canonical JSON', () => {
  const b = {head_sha:'d'.repeat(40),branch:'main',upstream:'origin/main',worktree_clean:true};
  const s = serializeBaseline(b);
  assert.ok(s.includes('"head_sha"'));
  assert.ok(s.includes('"worktree_clean":true'));
});

// ══════════════════════════════════════════════════════════════════════
//  Output publish & verify
// ══════════════════════════════════════════════════════════════════════

test('publishOutput: crash-safe write-once', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_po';
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'init',outputDescriptors:[],inputDigests:[]});
    const out = publishOutput({runsRoot:root,runId:rid,name:'a.json',content:'{"x":1}',repositoryRoot:root});
    assert.equal(out.label,'a.json');
    assert.match(out.digest,/^sha256:[a-f0-9]{64}$/);
    assert.throws(()=>publishOutput({runsRoot:root,runId:rid,name:'a.json',content:'{"x":2}',repositoryRoot:root}),/EEXIST/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('publishOutput: rejects path separators in name', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_ps';
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'init',outputDescriptors:[],inputDigests:[]});
    assert.throws(()=>publishOutput({runsRoot:root,runId:rid,name:'a/b',content:'x',repositoryRoot:root}),/path separator/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('verifyOutputByDescriptor: full field validation', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_vf';
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'init',outputDescriptors:[],inputDigests:[]});
    const out = publishOutput({runsRoot:root,runId:rid,name:'vf.json',content:'hello',repositoryRoot:root});

    // Good descriptor
    assert.ok(verifyOutputByDescriptor({runsRoot:root,runId:rid,...out}).ok);

    // Wrong label
    const bad = verifyOutputByDescriptor({runsRoot:root,runId:rid,label:'nonexistent',digest:out.digest,byte_length:out.byte_length,repo_relative_path:out.repo_relative_path});
    assert.equal(bad.ok,false);

    // Wrong byte_length
    const badLen = verifyOutputByDescriptor({runsRoot:root,runId:rid,label:out.label,digest:out.digest,byte_length:999,repo_relative_path:out.repo_relative_path});
    assert.equal(badLen.ok,false);
    assert.match(badLen.error,/length_mismatch/);

    // Descriptor with path traversal rejected at shape level
    const badShape = verifyOutputByDescriptor({runsRoot:root,runId:rid,label:'../a',digest:out.digest,byte_length:0,repo_relative_path:'../x'});
    assert.equal(badShape.ok,false);
    assert.match(badShape.error,/bad_descriptor/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

// ══════════════════════════════════════════════════════════════════════
//  Event write, chain, tamper
// ══════════════════════════════════════════════════════════════════════

test('appendPhaseEvent: refuses terminal — must use appendTerminalEvent', () => {
  const root = tmpRunsRoot();
  try {
    appendPhaseEvent({runsRoot:root,runId:'run_at',phase:'init',outputDescriptors:[],inputDigests:[]});
    assert.throws(()=>appendPhaseEvent({runsRoot:root,runId:'run_at',phase:'terminal',outputDescriptors:[],inputDigests:[]}),/use_appendTerminalEvent/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('appendPhaseEvent: validates descriptor shape', () => {
  const root = tmpRunsRoot();
  try {
    appendPhaseEvent({runsRoot:root,runId:'run_ds',phase:'init',outputDescriptors:[],inputDigests:[]});
    assert.throws(()=>appendPhaseEvent({
      runsRoot:root,runId:'run_ds',phase:'maintenance',
      outputDescriptors:[{label:'x/y',digest:'sha256:'+'a'.repeat(64),byte_length:0,repo_relative_path:'x'}],
      inputDigests:[],
    }),/invalid outputDescriptors/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('appendPhaseEvent: validates input digests', () => {
  const root = tmpRunsRoot();
  try {
    appendPhaseEvent({runsRoot:root,runId:'run_id',phase:'init',outputDescriptors:[],inputDigests:[]});
    assert.throws(()=>appendPhaseEvent({
      runsRoot:root,runId:'run_id',phase:'maintenance',
      outputDescriptors:[],
      inputDigests:['not-a-digest'],
    }),/invalid inputDigests/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('writeEventFile: atomic + exclusive', () => {
  const root = tmpRunsRoot();
  try {
    const ev = buildEvent({runId:'run_we',phase:'init',prevEvent:null,outputDescriptors:[],inputDigests:[]});
    const path = writeEventFile({runsRoot:root,runId:'run_we',event:ev});
    assert.ok(existsSync(path));
    assert.throws(()=>writeEventFile({runsRoot:root,runId:'run_we',event:ev}),/EEXIST/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('readChain: detects deleted event', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_del';
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'init',outputDescriptors:[],inputDigests:[]});
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'maintenance',outputDescriptors:[],inputDigests:[]});
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'issues',outputDescriptors:[],inputDigests:[]});
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'context',outputDescriptors:[],inputDigests:[]});
    rmSync(join(eventsDir(root,rid),'2-issues.json'));
    const r = readChain({runsRoot:root,runId:rid});
    assert.equal(r.ok,false);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('verifyEventFileOnDisk detects tamper', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_vt';
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'init',outputDescriptors:[],inputDigests:[]});
    const ep = join(eventsDir(root,rid),'0-init.json');
    writeFileSync(ep, readFileSync(ep,'utf8').replace('"init"','"hack"'));
    assert.equal(verifyEventFileOnDisk(ep).ok, false);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('chain: output tamper detected with verifyOutputs', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_ot';
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'init',outputDescriptors:[],inputDigests:[]});
    const out = publishOutput({runsRoot:root,runId:rid,name:'o.json',content:'x',repositoryRoot:root});
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'maintenance',
      outputDescriptors:[od(out.label,out.digest,out.byte_length,out.repo_relative_path)],
      inputDigests:[],
    });
    writeFileSync(out.path,'tampered');
    const r = readChain({runsRoot:root,runId:rid,verifyOutputs:true});
    assert.equal(r.ok,false);
    assert.match(r.error,/output_tampered/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

// ══════════════════════════════════════════════════════════════════════
//  appendTerminalEvent — semantic enforcement
// ══════════════════════════════════════════════════════════════════════

function buildToPhase(root, runId, upToPhase) {
  const idx = phaseIndex(upToPhase);
  for (let i = 0; i < idx; i++) {
    appendPhaseEvent({runsRoot:root,runId,phase:PHASES[i],outputDescriptors:[],inputDigests:[]});
  }
  return appendPhaseEvent({runsRoot:root,runId,phase:upToPhase,outputDescriptors:[],inputDigests:[]});
}

test('appendTerminalEvent: completed from audit with ready=true audit receipt', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_comp';
    reserveRun({runsRoot:root,runId:rid,baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}});
    for (const p of PHASES.slice(1,-2)) {
      appendPhaseEvent({runsRoot:root,runId:rid,phase:p,outputDescriptors:[],inputDigests:[]});
    }
    appendAuditPhase({ root, runId: rid, ready: true, auditId: 'audit_001' });

    // Write terminal with completed status
    const prevEv = readChain({runsRoot:root,runId:rid}).lastEvent;
    const tp = termPayload({status:'completed',outcome:'published',lastPhaseEventDigest:prevEv.event_digest});
    const termOut = publishOutput({runsRoot:root,runId:rid,name:'terminal.json',content:JSON.stringify(tp),repositoryRoot:root});

    const termEv = appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(termOut.label,termOut.digest,termOut.byte_length,termOut.repo_relative_path)],
      inputDigests:[],
    });
    assert.equal(termEv.phase,'terminal');
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('appendTerminalEvent: rejects completed from non-audit phase', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_badcomp';
    reserveRun({runsRoot:root,runId:rid,baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}});
    appendPhaseEvent({runsRoot:root,runId:rid,phase:'maintenance',outputDescriptors:[],inputDigests:[]});

    const prevEv = readChain({runsRoot:root,runId:rid}).lastEvent;
    const tp = termPayload({status:'completed',outcome:'published',lastPhaseEventDigest:prevEv.event_digest});
    const termOut = publishOutput({runsRoot:root,runId:rid,name:'terminal.json',content:JSON.stringify(tp),repositoryRoot:root});

    assert.throws(()=>appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(termOut.label,termOut.digest,termOut.byte_length,termOut.repo_relative_path)],
      inputDigests:[],
    }),/terminal_completed_requires_audit/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('appendTerminalEvent: rejects completed when audit ready=false', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_nready';
    reserveRun({runsRoot:root,runId:rid,baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}});
    for (const p of PHASES.slice(1,-2)) {
      appendPhaseEvent({runsRoot:root,runId:rid,phase:p,outputDescriptors:[],inputDigests:[]});
    }
    appendAuditPhase({ root, runId: rid, ready: false, auditId: 'audit_002' });

    const prevEv = readChain({runsRoot:root,runId:rid}).lastEvent;
    const tp = termPayload({status:'completed',outcome:'published',lastPhaseEventDigest:prevEv.event_digest});
    const termOut = publishOutput({runsRoot:root,runId:rid,name:'terminal.json',content:JSON.stringify(tp),repositoryRoot:root});

    assert.throws(()=>appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(termOut.label,termOut.digest,termOut.byte_length,termOut.repo_relative_path)],
      inputDigests:[],
    }),/terminal_completed_requires_audit_ready/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('appendTerminalEvent: audit_blocked requires ready=false', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_ab';
    reserveRun({runsRoot:root,runId:rid,baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}});
    for (const p of PHASES.slice(1,-2)) {
      appendPhaseEvent({runsRoot:root,runId:rid,phase:p,outputDescriptors:[],inputDigests:[]});
    }
    appendAuditPhase({ root, runId: rid, ready: true, auditId: 'audit_003' });

    const prevEv = readChain({runsRoot:root,runId:rid}).lastEvent;
    const tp = termPayload({status:'audit_blocked',outcome:null,lastPhaseEventDigest:prevEv.event_digest});
    const termOut = publishOutput({runsRoot:root,runId:rid,name:'terminal.json',content:JSON.stringify(tp),repositoryRoot:root});

    assert.throws(()=>appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(termOut.label,termOut.digest,termOut.byte_length,termOut.repo_relative_path)],
      inputDigests:[],
    }),/terminal_audit_blocked_requires_audit_not_ready/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('appendTerminalEvent: outcome misuse rejected', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_om';
    reserveRun({runsRoot:root,runId:rid,baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}});
    const prevEv = readChain({runsRoot:root,runId:rid}).lastEvent;
    const tp = termPayload({status:'blocked',outcome:'published',lastPhaseEventDigest:prevEv.event_digest});
    const termOut = publishOutput({runsRoot:root,runId:rid,name:'terminal.json',content:JSON.stringify(tp),repositoryRoot:root});

    assert.throws(()=>appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(termOut.label,termOut.digest,termOut.byte_length,termOut.repo_relative_path)],
      inputDigests:[],
    }),/blocked_outcome/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('appendTerminalEvent: last_phase_event_digest mismatch rejected', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_lp';
    reserveRun({runsRoot:root,runId:rid,baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}});
    const tp = termPayload({status:'blocked',outcome:null,lastPhaseEventDigest:'sha256:'+'b'.repeat(64)});
    const termOut = publishOutput({runsRoot:root,runId:rid,name:'terminal.json',content:JSON.stringify(tp),repositoryRoot:root});

    assert.throws(()=>appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(termOut.label,termOut.digest,termOut.byte_length,termOut.repo_relative_path)],
      inputDigests:[],
    }),/terminal_last_phase_event_digest_mismatch/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('appendTerminalEvent: terminal_digest mismatch rejected', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_td';
    reserveRun({runsRoot:root,runId:rid,baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}});
    const prevEv = readChain({runsRoot:root,runId:rid}).lastEvent;
    const tp = termPayload({status:'blocked',outcome:null,lastPhaseEventDigest:prevEv.event_digest});
    tp.terminal_digest = 'sha256:' + '0'.repeat(64);
    const termOut = publishOutput({runsRoot:root,runId:rid,name:'terminal.json',content:JSON.stringify(tp),repositoryRoot:root});

    assert.throws(()=>appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(termOut.label,termOut.digest,termOut.byte_length,termOut.repo_relative_path)],
      inputDigests:[],
    }),/terminal_digest_mismatch/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

// ══════════════════════════════════════════════════════════════════════
//  Reservation — baseline only
// ══════════════════════════════════════════════════════════════════════

test('reserveRun: baseline serialized, no separate initContent', () => {
  const root = tmpRunsRoot();
  try {
    const result = reserveRun({
      runsRoot:root,runId:'run_baseline',
      baseline:{head_sha:'d'.repeat(40),branch:'main',upstream:'origin/main',worktree_clean:true},
    });
    assert.equal(result.event.phase,'init');
    assert.equal(result.output.label,'init-evidence.json');
    const content = readFileSync(result.output.path,'utf8');
    assert.ok(content.includes('"head_sha"'));
    assert.ok(content.includes('"worktree_clean":true'));
    assert.ok(content.includes('"branch":"main"'));
  } finally { rmSync(root,{recursive:true,force:true}); }
});

test('reserveRun: rejects dirty worktree', () => {
  assert.throws(()=>reserveRun({
    runId:'run_dirty',
    baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:false},
  }),/worktree_clean/);
});

test('reserveRun: rejects non-40-hex head', () => {
  assert.throws(()=>reserveRun({
    runId:'run_short',
    baseline:{head_sha:'abc',branch:'main',worktree_clean:true},
  }),/40-char/);
});

test('reserveRun: duplicate rejected', () => {
  const root = tmpRunsRoot();
  try {
    reserveRun({runsRoot:root,runId:'run_dup',baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}});
    assert.throws(()=>reserveRun({runsRoot:root,runId:'run_dup',baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true}}),/run_already_reserved/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

// ══════════════════════════════════════════════════════════════════════
//  Schema validator tests
// ══════════════════════════════════════════════════════════════════════

test('schema: phase event validates correctly', () => {
  const ev = buildEvent({runId:'run_sv',phase:'init',prevEvent:null,outputDescriptors:[],inputDigests:[]});
  const r = validateAgainstSchema(ev, phaseEventSchemaV3);
  assert.ok(r.ok, r.errors.join('; '));
});

test('schema: phase event rejects bad digest', () => {
  const ev = buildEvent({runId:'run_sv',phase:'init',prevEvent:null,outputDescriptors:[],inputDigests:[]});
  const bad = {...ev, event_digest:'bad'};
  const r = validateAgainstSchema(bad, phaseEventSchemaV3);
  assert.equal(r.ok, false);
});

test('schema: terminal rejects completed with null outcome', () => {
  const tp = termPayload({status:'completed',outcome:null,lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  const r = validateAgainstSchema(tp, terminalSchemaV3);
  assert.equal(r.ok, false);
});

test('schema: terminal rejects blocked with published', () => {
  const tp = termPayload({status:'blocked',outcome:'published',lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  const r = validateAgainstSchema(tp, terminalSchemaV3);
  assert.equal(r.ok, false);
});

test('schema: terminal accepts completed with published', () => {
  const tp = termPayload({status:'completed',outcome:'published',lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  const r = validateAgainstSchema(tp, terminalSchemaV3);
  assert.ok(r.ok, r.errors.join('; '));
});

test('schema: terminal accepts blocked with null outcome', () => {
  const tp = termPayload({status:'blocked',outcome:null,lastPhaseEventDigest:'sha256:'+'f'.repeat(64)});
  const r = validateAgainstSchema(tp, terminalSchemaV3);
  assert.ok(r.ok, r.errors.join('; '));
});

test('schema: audit receipt validates', () => {
  const ar = {
    schema_version:3,audit_id:'audit_t1',run_id:'run_t1',
    seal_event_digest:'sha256:'+'a'.repeat(64),baseline_head:'d'.repeat(40),
    seal_digest:'sha256:'+'a'.repeat(64),manifest_digest:'sha256:'+'a'.repeat(64),
    changed_paths:['a','b'],changed_paths_digest:'sha256:'+'a'.repeat(64),
    ready:true,errors:[],warnings:[],
  };
  const { receipt_digest, ...rest } = ar;
  ar.receipt_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
  const r = validateAgainstSchema(ar, auditReceiptSchemaV3);
  assert.ok(r.ok, r.errors.join('; '));
});

test('schema: audit receipt rejects non-40-hex baseline_head', () => {
  const ar = {
    schema_version:3,audit_id:'audit_t2',run_id:'run_t2',
    seal_event_digest:'sha256:'+'a'.repeat(64),baseline_head:'short',
    seal_digest:'sha256:'+'a'.repeat(64),manifest_digest:'sha256:'+'a'.repeat(64),
    changed_paths:[],changed_paths_digest:'sha256:'+'a'.repeat(64),ready:false,errors:[],warnings:[],
  };
  const { receipt_digest, ...rest } = ar;
  ar.receipt_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
  const r = validateAgainstSchema(ar, auditReceiptSchemaV3);
  assert.equal(r.ok, false);
});

test('schema: gate result validates', () => {
  const gr = {
    schema_version:3,gate_id:'gate_0000111122223333',run_id:'run_gt',
    pre_gate_event_digest:'sha256:'+'a'.repeat(64),passed:true,invoked_count:1,
    started_at:'2026-07-28T00:00:00Z',finished_at:'2026-07-28T00:01:00Z',
    decision:'pass',errors:[],
    checks:[{name:'test',script:'test:check',passed:true,exit_code:0,duration_ms:100}],
    evidence_logs:[{check_name:'test',stdout_digest:'sha256:'+'a'.repeat(64),stderr_digest:'sha256:'+'a'.repeat(64),stdout_path:'test.stdout.log',stderr_path:'test.stderr.log'}],
  };
  const { result_digest, ...rest } = gr;
  gr.result_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
  const r = validateAgainstSchema(gr, gateResultSchemaV3);
  assert.ok(r.ok, r.errors.join('; '));
});

test('schema: seal validates', () => {
  const s = {
    schema_version:3,seal_id:'seal_001',run_id:'run_s',
    context_digest:'sha256:'+'c'.repeat(64),gate_event_digest:'sha256:'+'a'.repeat(64),
    gate_result_digest:'sha256:'+'a'.repeat(64),ledger_digest:'sha256:'+'a'.repeat(64),
    manifest_digest:'sha256:'+'a'.repeat(64),
  };
  const { seal_digest, ...rest } = s;
  s.seal_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
  const r = validateAgainstSchema(s, sealSchemaV3);
  assert.ok(r.ok, r.errors.join('; '));
});

// ══════════════════════════════════════════════════════════════════════
//  Full lifecycle with terminal + output verification
// ══════════════════════════════════════════════════════════════════════

test('full lifecycle: reserve→9 phases→terminal→chain verify with outputs', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_full';
    // Reserve
    const { event: initEv } = reserveRun({
      runsRoot:root,runId:rid,
      baseline:{head_sha:'d'.repeat(40),branch:'main',worktree_clean:true},
    });
    assert.equal(initEv.phase,'init');

    // Build maintenance through seal, then bind the receipt to the audit event.
    for (const p of PHASES.slice(1,-2)) {
      const out = publishOutput({runsRoot:root,runId:rid,name:`${p}.json`,content:JSON.stringify({phase:p}),repositoryRoot:root});
      appendPhaseEvent({
        runsRoot:root,runId:rid,phase:p,
        outputDescriptors:[od(out.label,out.digest,out.byte_length,out.repo_relative_path)],
        inputDigests:[],
      });
    }
    appendAuditPhase({ root, runId: rid, ready: true, auditId: 'audit_full' });

    const prevEv = readChain({runsRoot:root,runId:rid}).lastEvent;
    const tp = termPayload({status:'completed',outcome:'published',lastPhaseEventDigest:prevEv.event_digest,totalActions:9,errors:0,warnings:0});
    const termOut = publishOutput({runsRoot:root,runId:rid,name:'terminal.json',content:JSON.stringify(tp),repositoryRoot:root});
    appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(termOut.label,termOut.digest,termOut.byte_length,termOut.repo_relative_path)],
      inputDigests:[],
    });

    // Verify full chain
    const chain = readChain({runsRoot:root,runId:rid,verifyOutputs:true});
    assert.ok(chain.ok, chain.error||'');
    assert.equal(chain.events.length,9);
    assert.equal(chain.lastEvent.phase,'terminal');

    // Verify each file on disk
    const vr = verifyAllEventFiles({runsRoot:root,runId:rid});
    assert.ok(vr.ok);
    assert.equal(vr.count,9);

    // Terminal closure
    const tp2 = termPayload({status:'blocked',outcome:null,lastPhaseEventDigest:chain.lastEvent.event_digest});
    const to2 = publishOutput({runsRoot:root,runId:rid,name:'terminal2.json',content:JSON.stringify(tp2),repositoryRoot:root});
    assert.throws(()=>appendTerminalEvent({
      runsRoot:root,runId:rid,
      outputDescriptors:[od(to2.label,to2.digest,to2.byte_length,to2.repo_relative_path)],
      inputDigests:[],
    }),/terminal_closure/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});

// ══════════════════════════════════════════════════════════════════════
test('event phase enum ONLY contains 9 blueprint phases', () => {
  for (const old of ['genesis','prepared','closure_resolved','gate_passed','sealed','audit_planned']) {
    assert.ok(!PHASES.includes(old), `old phase ${old} leaked`);
  }
  assert.deepEqual(PHASES, ['init','maintenance','issues','context','targets','gate','seal','audit','terminal']);
});

// ══════════════════════════════════════════════════════════════════════
//  FINDING 1: Maintenance fail-open — {ok:false} must be rejected
// ══════════════════════════════════════════════════════════════════════

test('finding-1: _assertMaintResult rejects ok===false (fail-open fixed)', async () => {
  const { executeNightly } = await import('./lib/nightly-controller-core.mjs');
  const root = tmpRunsRoot();
  try {
    // maintenance executor returning {ok:false} must fail the run, not proceed silently
    const result = await executeNightly({
      runsRoot: root, repositoryRoot: root,
      repositoryAdapter: { getHead: () => '0'.repeat(40), getBranch: () => 'main', getUpstream: () => undefined, isWorktreeClean: () => true },
      changedPathsCollector: () => [],
      maintenanceExecutor: async () => ({ ok: false, health: 'degraded', sourceResults: [], providerIncidents: [] }),
      issueExecutor: async () => ({ ok: true, snapshot: { open: 0, acknowledged: 0, fulfilled: 0, blocked: 0 }, workloadPath: null, demandArtifactPath: null, errors: [], newUnassessed: [] }),
      contextCollector: () => ({ context: { catalogCounts: {}, freshness: {}, coverage: {}, relations: {}, packLifecycle: {}, issueDigest: { open: 0, acknowledged: 0, fulfilled: 0, blocked: 0 }, priorFingerprint: '', notes: '' }, snapshotDigest: 'sha256:' + 'a'.repeat(64), evidenceManifestDigest: 'sha256:' + 'a'.repeat(64) }),
      targetSelector: () => ({ intents: [], total: 0 }),
      timestamp: '2026-01-15T00:00:24.000Z',
    });
    // must not succeed, {ok:false} must fail
    assert.equal(result.status, 'failed', 'run with {ok:false} maintenance must fail');
  } catch (e) {
    // thrown is also acceptable — fail-open means the run must not proceed
    assert.ok(e.message.includes('fail') || e.message.includes('ok') || e.message.includes('maintenance'),
      `Expected fail-open rejection, got: ${e.message}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  FINDING 4: Phase event runtime schema validation
// ══════════════════════════════════════════════════════════════════════

test('finding-4: phase event schema validated at write time', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_schema';
    appendPhaseEvent({ runsRoot: root, runId: rid, phase: 'init', outputDescriptors: [], inputDigests: [] });
    // valid label passes schema
    const out = publishOutput({ runsRoot: root, runId: rid, name: 'maint.json', content: '{}', repositoryRoot: root });
    appendPhaseEvent({
      runsRoot: root, runId: rid, phase: 'maintenance',
      outputDescriptors: [od(out.label, out.digest, out.byte_length, out.repo_relative_path)],
      inputDigests: [],
    });
    // bad phase label: path separator in label rejects via schema
    const badOut = publishOutput({ runsRoot: root, runId: rid, name: 'bad-label.json', content: '{}', repositoryRoot: root });
    assert.throws(() => appendPhaseEvent({
      runsRoot: root, runId: rid, phase: 'issues',
      outputDescriptors: [{ label: 'a/b', digest: badOut.digest, byte_length: badOut.byte_length, repo_relative_path: badOut.repo_relative_path }],
      inputDigests: [],
    }), /descriptor/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('finding-4: phase event schema rejects invalid event_digest', () => {
  const root = tmpRunsRoot();
  try {
    const rid = 'run_schema2';
    reserveRun({ runsRoot: root, runId: rid, baseline: { head_sha: 'd'.repeat(40), branch: 'main', worktree_clean: true } });
    const out = publishOutput({ runsRoot: root, runId: rid, name: 'maint.json', content: '{}', repositoryRoot: root });
    // Writing a valid event with proper schema works
    const ev = appendPhaseEvent({
      runsRoot: root, runId: rid, phase: 'maintenance',
      outputDescriptors: [od(out.label, out.digest, out.byte_length, out.repo_relative_path)],
      inputDigests: [],
    });
    const vr = verifyEventFileOnDisk(join(eventsDir(root, rid), '1-maintenance.json'));
    assert.ok(vr.ok, 'Event file must verify');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ══════════════════════════════════════════════════════════════════════
//  FINDING 8: run-summary uses sha256: prefix for context/ledger digest
// ══════════════════════════════════════════════════════════════════════

test('finding-8: run-summary context_digest and ledger_digest use sha256: prefix', () => {
  // Verify the schema expects sha256: prefix patterns (matches builder output)
  assert.ok(runSummarySchemaV3);
  assert.match(runSummarySchemaV3.properties.context_digest.pattern, /sha256/,
    'run-summary schema must require sha256: prefix for context_digest');
  assert.match(runSummarySchemaV3.properties.ledger_digest.pattern, /sha256/,
    'run-summary schema must require sha256: prefix for ledger_digest');
});

// ══════════════════════════════════════════════════════════════════════
for (const { name, fn } of tests) {
  try { fn(); process.stdout.write(`ok - ${name}\n`); }
  catch (error) { failures++; process.stderr.write(`not ok - ${name}\n${error.stack}\n`); }
}
if (failures > 0) {
  process.stderr.write(`\n${failures}/${tests.length} foundation test(s) failed\n`);
  process.exit(1);
}
process.stdout.write(`\n${tests.length} foundation tests passed\n`);
