import { readFileSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox allow-scripts allow-same-origin";

export function localFile(target) {
  if (typeof target !== "string" || !target) throw new Error("A local HTML or SVG file is required");
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) && !/^[a-z]:[\\/]/i.test(target)) {
    const url = new URL(target);
    if (url.protocol !== "file:" || url.hostname || url.search || url.hash) throw new Error("Only local HTML or SVG files are accepted; remote URLs are disabled");
    target = fileURLToPath(url);
  }
  const file = realpathSync(resolve(target));
  if (![".html", ".svg"].includes(extname(file).toLowerCase()) || !statSync(file).isFile()) throw new Error("A local HTML or SVG file is required");
  if (statSync(file).size > 64 * 1024 * 1024) throw new Error("Page exceeds the 64 MiB limit");
  return file;
}

export function chromeArgs(profile) {
  return ["--headless=new", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-background-networking", "--disable-sync", "--disable-extensions", "about:blank"];
}

export async function serveLocalPage(target) {
  const file = localFile(target);
  const body = readFileSync(file);
  const path = `/${randomBytes(24).toString("hex")}${extname(file)}`;
  let origin;
  const server = createServer((req, res) => {
    if (req.headers.host !== new URL(origin).host || req.url !== path || !["GET", "HEAD"].includes(req.method)) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { "Content-Type": extname(file).toLowerCase() === ".svg" ? "image/svg+xml" : "text/html; charset=utf-8", "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store", "Cross-Origin-Resource-Policy": "same-origin" });
    res.end(req.method === "HEAD" ? undefined : body);
  });
  await new Promise((done, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", done); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { url: origin + path, close() { server.closeAllConnections(); server.close(); } };
}

export async function restrictPage(send, onEvent, url) {
  onEvent(async (data) => {
    if (data.method !== "Fetch.requestPaused") return;
    const { requestId, request, resourceType } = data.params;
    await send(request.url === url && resourceType === "Document" ? "Fetch.continueRequest" : "Fetch.failRequest", request.url === url && resourceType === "Document" ? { requestId } : { requestId, errorReason: "BlockedByClient" });
  });
  for (const [method, params] of [["Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] }], ["Browser.setDownloadBehavior", { behavior: "deny" }]]) {
    const result = await send(method, params);
    if (result.error) throw new Error(`Cannot enforce browser policy: ${result.error.message}`);
  }
}
