# Security — local Codex fork

## Threat model

This fork reduces accidental disclosure and browser attack surface when a coding agent creates local illustrations. It is not a sandbox for hostile Node.js code or a guarantee about future generated code.

The drawing kit is local. Automatic gallery publication, Git writes/auth configuration, and agent-session log collection have been removed. No publishing command remains, even behind a flag.

Browser tools accept only a selected local HTML/SVG file. An ephemeral loopback server reads that file into memory and serves only a random exact route; it rejects other routes, methods and Host headers. It does not serve neighbouring files or a filesystem directory. Response headers enforce CSP, no referrers and no caching. CDP request interception blocks every URL except the exact preview document; downloads are disabled. Standalone assets must be inline. Browser sandboxing remains enabled; browser startup/policy failures are failures, not permission to weaken isolation.

## Remaining trust boundaries

- Node build scripts and dynamically imported sheet/geometry modules can execute arbitrary code with the caller's privileges. Inspect them, constrain the agent's workspace, and use a separate OS sandbox for untrusted inputs.
- Driver action files and preload scripts intentionally execute JavaScript. Do not accept them from an untrusted party without review.
- Browser/OS vulnerabilities and browser background traffic are not eliminated by CSP/CDP. Use an OS-level no-egress environment when confidentiality requires it. A dedicated temporary profile prevents ordinary-profile reuse but is not OS isolation.
- Output paths are selected by the caller; scripts can overwrite those outputs. Use a dedicated output directory and review paths.
- Generated HTML opened outside the checker does not inherit its security policy.
- WebGL can fall back to SVG when safe graphics acceleration is unavailable. No unsafe GPU or sandbox switch is added automatically.
- Installation and upgrades are separate supply-chain decisions. Pin a reviewed commit and review updates. CI test dependencies do not become runtime dependencies.

## Reporting

Report suspected vulnerabilities privately to the fork maintainer via GitHub private vulnerability reporting if enabled. For flaws also affecting upstream, use the upstream security reporting channel at https://github.com/wheresryan22/anatomy/security/advisories/new. Do not include credentials or private session logs in public issues.
