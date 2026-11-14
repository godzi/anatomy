# Local hardening review — 2026-11-14

Base: upstream `1482e8469b0a9e0d8cc18ea2740a01423d29ae80`.

## Changes reviewed

- Deleted publisher and Claude session reader (and their now-inapplicable tests). No replacement upload or Git mutation facility was introduced.
- Centralized sandbox-preserving Chrome arguments for capture, drive and 3D checks.
- Replaced direct file/remote navigation with one in-memory HTML/SVG document served on an ephemeral 127.0.0.1 port and an unpredictable path. No directory/static-file fallback. Host/method/path validation, size/type checks, CSP, no-referrer and no-store headers.
- Installed CDP request interception before navigation; only the exact document URL is permitted, downloads are denied, unsupported policy commands fail closed.
- Routed PDF printing through the restricted driver. Inline React test fixtures to preserve the intended local-only boundary.
- Updated installation and threat-model documentation; removed recommendations to weaken agent/browser sandboxing.

## Executed validation

- 82 tests across 15 Node-only test files passed, covering geometry, rendering helpers, PDF layout and the new policy tests.
- 3 Chrome startup-failure tests passed, including profile cleanup.
- Dial-indicator builds in both themes remained byte-identical to the committed upstream pages.
- `git diff --check` and JavaScript syntax checks passed.
- An attempted full test run reported 129 passes and 107 failures. Browser checks cannot run in this executor because Chromium fails to create a process socket (`Operation not permitted`, SIGABRT); React test dependencies are also absent. This is NOT a passing full suite and does not establish browser compatibility.
- Added real-browser regression tests for blocked resource loads, popup refusal, inline JavaScript and PDF output. These still need execution in sandbox-capable CI.

## Merge gate

Do not treat this review as approval to merge before the full CI job is green at the latest PR head. No Actions run was registered when the PR was created. Enable Actions for the fork if needed, then run CI and address failures without weakening the policy. After merging, verify the merge SHA and run the checks on main.

## Limits

This is defense in depth for trusted local figure generation. It does not confine Node code, sheet imports, output paths, driver inputs, a compromised browser or the rest of an agent's tools. For untrusted code use an independent disposable OS sandbox with no secrets and no egress. There has been no exhaustive vulnerability audit, and no guarantee is made about future upstream or generated code.
