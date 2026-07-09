---
schema_version: 1
skill_id: skl_webapp-testing-src-https-github-com-anthropics-ski-3c43994c-04f79b56-skills-webapp-testing-skill-md_3c43994c
source_hash: sha256:34c4c1b4cd6a28223f6c5f205afb5b8c1cb57a4d
analysis_version: 1
confidence: high
updated_at: "2026-07-10T02:14:42+08:00"
---

# Web App Testing

A thin Playwright wrapper for testing local web applications. It provides a decision tree for choosing between static and dynamic page strategies, a server lifecycle helper script (`with_server.py`), and a reconnaissance-then-action pattern for dynamic apps where you inspect the rendered DOM before interacting. That's the whole value proposition, and it's genuinely small — the core content fits on a single screen.

## Why it matters

This isn't a comprehensive testing framework or a sophisticated QA methodology. It's a decision tree and a server helper, and that combination solves a real, narrow problem: "I need to write a Playwright script against my local dev server, but I don't want to figure out server lifecycle management or how Playwright works in Python." The bundled `with_server.py` script handles starting, waiting-for-ready, and tearing down one or more servers — which is exactly the kind of friction that causes agents to write brittle shell scripts instead of clean Playwright automation.

The reconnaissance-then-action pattern (take screenshot → inspect DOM → identify selectors → act) is the other piece of genuine insight. It's a pragmatic workflow for dynamic apps where the agent can't read source HTML to find selectors. This is the kind of pattern an experienced Playwright developer internalizes, but it's not obvious to an agent encountering an unfamiliar React app at runtime.

However, the skill is aggressively minimal. It delegates all real capability to Playwright's own API and the bundled helper scripts. If you already know Playwright, you'll learn nothing new. If you don't know Playwright, this skill teaches you almost nothing about it — just enough to write a `sync_playwright()` block with `page.goto()` and `page.wait_for_load_state()`.

## Where it helps, where it hurts

**Best case**: You've built a local web application (Vite, Next.js, Flask, Express) and want an agent to verify it works. The server isn't running yet. The agent loads this skill, uses `with_server.py` to spin up the dev server, navigates to the page, waits for network idle, takes a screenshot to identify DOM elements, and writes a focused Playwright script that verifies a form submission or a button click. The server gets cleaned up when the script exits. Everything takes a few minutes and actually works because the skill prevents the most common Playwright newbie mistake — interacting with the DOM before JavaScript has rendered it.

**Worst case**: Your application requires authentication, cookies, local storage state, or complex session management. The skill has zero coverage of these patterns — no mention of `page.context()`, `storageState`, authentication flows, or how to seed state before testing. The agent will write a Playwright script that hits a login wall and fails silently or loops on a redirect. Similarly, the skill has no answer for WebSocket-heavy apps, file uploads, drag-and-drop, iframes, or shadow DOM. It handles the simplest 60% of web testing scenarios and is useless for the rest.

## What it quietly assumes

- **The app runs on localhost and serves standard HTML/CSS/JS.** No mention of CORS issues, HTTPS requirements, WebSocket endpoints, or non-HTTP protocols. If your dev server uses self-signed certs or a non-standard protocol, you're on your own.
- **The app's UI is reachable by standard Playwright selectors.** The skill recommends `text=`, `role=`, CSS selectors, and IDs. It doesn't mention what to do when an app uses generated class names (CSS modules, styled-components), Canvas-rendered UIs, or WebGL content.
- **Playwright is installed and working.** The skill assumes `playwright` is importable and `chromium` browser binaries exist. If `playwright install chromium` hasn't been run, all scripts fail at `p.chromium.launch()`. The skill provides no setup instructions.
- **The server starts fast enough for `with_server.py`'s timeout.** The helper script polls a port until it responds. If your dev server takes 30+ seconds to compile (large Next.js project, for instance), the helper may time out before the server is ready. The skill doesn't mention configurable timeouts.
- **One script, one test.** The examples show a single automation script run once. There's no pattern for test suites, parameterized tests, or running multiple scenarios. The approach works for spot-checking, not for regression testing.

These assumptions are reasonable for the "I just built this and want to see if the button works" use case, which is what the skill targets. They'd be unreasonable for a serious testing infrastructure.

## What could go wrong

The `with_server.py` helper is the highest-risk component. It runs user-provided shell commands as subprocesses. The skill's own example — `--server "cd backend && python server.py"` — shows arbitrary shell execution. An agent that misinterprets a user's request or a user who provides a malicious server command could get the helper to execute anything. The skill provides no sandboxing, no command validation, and no warning about this.

On the testing side, the biggest risk is quiet failure. The skill teaches the agent to write a script, run it, and... there's no assertion pattern. No mention of `expect()`, `page.wait_for_selector()` as an assertion, or any pass/fail signal. An agent following this skill literally could write a script that clicks a button, sees no error, and reports success — even if the button did nothing. The skill mentions "verifying frontend functionality" in its description but teaches nothing about verification.

The headless-only recommendation (`headless=True`) is sensible for automation but means the agent can never show the user what's happening. If a test fails, the user gets a stack trace, not a visual recording. The skill mentions screenshots as a reconnaissance tool, not as a debugging artifact.

User presence is not needed — this is an automation skill that runs headlessly by design.

## Bottom line

Pick this skill when an agent needs to do a quick smoke test of a local web app and you want to avoid the "how do I start the server / wait for it to be ready / clean up after" friction. Skip it for anything involving authentication, complex state, test suites, or non-trivial assertions. It's a competent but minimal skill — you could replace it with a 20-line shell script wrapping `playwright` and get roughly the same result. The decision tree and the server helper are the only things you'd lose. In a tight 100-skill catalog, this only earns a spot if "local web app smoke testing for agents" is a catalog priority; it's too thin to compete with general-purpose testing or browser-automation skills.

## Confidence: high

The source is very short (~70 lines of substantive content) and I read every word. The skill delegates to Playwright's API and bundled scripts that I could not inspect, but the delegation is so explicit that the boundaries of the skill's own contribution are crystal clear.
