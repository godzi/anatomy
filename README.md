# Anatomy — local Codex fork

A local-only fork of [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy), based on commit `1482e8469b0a9e0d8cc18ea2740a01423d29ae80`. Original drawing kit, examples and MIT attribution are retained.

Anatomy builds detailed interactive isometric SVG illustrations, with optional WebGL and 3D motion. This fork prioritizes local Codex use: it removes gallery publication and session-log reading, retains Chrome's sandbox, and restricts automated previews to one standalone local page.

## Install for one project

Review a specific commit before installing. From your project directory:

```sh
git clone https://github.com/godzi/anatomy.git .agents/skills/anatomy
# Optional but recommended: git -C .agents/skills/anatomy checkout --detach <reviewed-commit-sha>
```

Use `$anatomy` in Codex. This repository is a standard Agent Skill; it needs no Claude API or account. Do not run an unversioned npm installer or automatically pull upstream updates. Re-review each update, particularly `SKILL.md`, `scripts/` and dependencies.

Requirements: Node.js 20.10+ and Chrome/Chromium for browser checks. The standalone kit and scripts use Node built-ins. React examples require a separately managed React project. No installer, telemetry, GitHub login or session usage accounting runs as part of local drawing.

## Build and inspect

```sh
node examples/dial-indicator/build.mjs
node examples/dial-indicator/build.mjs --light
node scripts/capture.mjs examples/dial-indicator/dial-indicator-light.html --reduced --out shots/dial.png
node scripts/drive.mjs examples/dial-indicator/dial-indicator-light.html '[["eval","document.readyState"]]'
node scripts/print.mjs examples/push-button/sheet.mjs --format poster
```

Keep new figures in a dedicated project/output directory. Review build scripts, sheet modules, preload scripts and action files before executing them: these are programs, not passive data. Generated HTML must inline its JavaScript, styles, fonts and images. Remote URLs, development servers and linked assets are deliberately unsupported by the checkers; bundle React fixtures before checking them.

The preview server binds to `127.0.0.1` on an ephemeral port. A random route exposes only the selected page, not a directory. CSP blocks network connections, frames, workers, forms and external assets. CDP interception permits only that exact document URL and denies downloads. Chrome uses a temporary profile with sandboxing enabled. No unsafe sandbox/file/GPU switches are provided as a fallback.

If Chrome fails in a restricted environment, report the failed check and run it on a machine/CI runner that supports sandboxed Chrome. Do not disable Codex's or Chrome's sandbox to obtain a green check. WebGL may fall back to SVG where safe GPU support is unavailable.

## Security boundary and intentional removals

- No `scripts/publish.mjs` or `scripts/session.mjs`: no automatic upload, force-push, credential configuration, prompt publication or reading of Claude conversation logs.
- Sharing is a separate manual workflow: review and select only the intended generated outputs.
- These controls reduce accidental disclosure during preview. They do not sandbox Node builds, trusted driver `eval`/`--preload`, sheet imports, Chrome itself or an agent's other tools. They are not an OS-level network firewall and do not protect against a compromised browser binary or browser vulnerabilities.
- For untrusted code, use a disposable non-root VM/container with no credentials, no unrelated files and OS-enforced outbound network denial. The JavaScript policy is defense in depth, not a substitute.
- Opening generated HTML directly in your ordinary browser does not apply the checker's CSP or request filter.

See [SECURITY.md](SECURITY.md) for the threat model and [SKILL.md](SKILL.md) for the drawing workflow. Reference guides and examples retain the original geometry/rendering APIs.

## Validation

```sh
node --test scripts/local-browser.test.mjs scripts/chrome-startup.test.mjs
node --test scripts/*.test.mjs
```

The full suite needs sandboxed Chrome and the React/TypeScript/esbuild test dependencies listed in CI. CI rebuilds the shipped examples and requires their generated pages to remain byte-identical. Security regression tests must fail if unsafe launch flags, external page requests, directory exposure or publication/session capabilities return.

## License

[MIT](LICENSE). Original Anatomy copyright © 2026 Ryan. This fork adds local security restrictions; it does not claim that the upstream project is malicious or that all risks have been eliminated.
