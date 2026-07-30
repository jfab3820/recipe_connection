#!/usr/bin/env node
/**
 * Transforms an episode composition into a single self-contained HTML file
 * for HyperFrames' "Send to HyperFrames" import.
 *
 *   node tools/build-hyperframes-import.mjs episodes/001-the-gold-cure
 *
 * Why a build step rather than authoring the import file by hand: the two
 * targets disagree on a few points, and keeping two copies in sync by hand
 * guarantees they drift.
 *
 *   local render (tools/render.mjs)   import (HyperFrames cloud)
 *   ------------------------------    ---------------------------------
 *   vendored GSAP, no egress          GSAP + runtime from jsdelivr CDN
 *   <link> to sibling CSS files       every byte inlined in one file
 *   composition id per episode        id must literally be "main"
 *
 * The importer reads STATIC html — there is no file tree on the other side,
 * so relative paths simply do not arrive.
 *
 * Writes dist/hyperframes-import.html
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, "..");

const episodeDir = path.resolve(process.argv[2] ?? "episodes/001-the-gold-cure");
const src = path.join(episodeDir, "composition.html");
if (!fs.existsSync(src)) {
  console.error(`no composition at ${src}`);
  process.exit(1);
}

const html = fs.readFileSync(src, "utf8");

/* ---------- pull the three pieces out of the source ---------- */

const styleStart = html.indexOf("<style>");
const styleEnd = html.indexOf("</style>");
if (styleStart === -1 || styleEnd === -1) {
  console.error("composition has no <style> block");
  process.exit(1);
}
const css = html.slice(styleStart + "<style>".length, styleEnd);

const afterStyle = html.slice(styleEnd + "</style>".length);
const rootHtml = afterStyle.slice(0, afterStyle.indexOf("<script")).trim();

const inlineScript = [
  ...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g),
].map((m) => m[1]);
if (!inlineScript.length) {
  console.error("composition has no inline timeline script");
  process.exit(1);
}
let js = inlineScript.join("\n");

/* ---------- read the assets the <link> tags point at ---------- */

const fonts = fs.readFileSync(path.join(PROJECT, "vendor", "brand-fonts.css"), "utf8");
const poses = fs.readFileSync(path.join(PROJECT, "brand", "poses.css"), "utf8");

/* ---------- rewrite to the import contract ---------- */

// The importer requires the literal id "main" on the root and the timeline
// registered under that same key.
const idMatch = rootHtml.match(/data-composition-id="([^"]+)"/);
if (!idMatch) {
  console.error("root element has no data-composition-id");
  process.exit(1);
}
const sourceId = idMatch[1];

let root = rootHtml
  .replace(/id="stage"/, 'id="main"')
  .replace(/data-composition-id="[^"]+"/, 'data-composition-id="main"');

js = js
  .replace(/window\.__timelines\[["'][^"']+["']\]/g, 'window.__timelines["main"]')
  // Non-anchor scenes toggle with autoAlpha so a hidden scene is genuinely
  // hidden (opacity alone leaves it visible to hit-testing and to the
  // shader reset path if a transition is added during the enhance step).
  // Matches both a literal selector and the loop variable the source uses
  // to tile the scene shells.
  .replace(/tl\.set\(([^,]+),\s*\{\s*opacity:\s*([01])\s*\}/g,
    "tl.set($1, { autoAlpha: $2 }");

const width = root.match(/data-width="(\d+)"/)?.[1] ?? "1080";
const height = root.match(/data-height="(\d+)"/)?.[1] ?? "1920";
const duration = root.match(/data-duration="([\d.]+)"/)?.[1] ?? "0";

const out = `<!doctype html>
<html lang="en" style="overflow:hidden; margin:0">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <title>History Had No Common Sense — The Gold Cure</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@hyperframes/core/dist/hyperframe.runtime.iife.js"></script>
    <style>
/* ---- brand fonts, inlined base64 woff2 ---- */
${fonts}
    </style>
    <style>
/* ---- host poses, inlined base64 png ---- */
${poses}
    </style>
    <style>
      html, body {
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        margin: 0;
        background: #f4f1e6;
      }
${css}
    </style>
  </head>
  <body>
${root}
    <script>
${js}
    </script>
  </body>
</html>
`;

// The importer only accepts URLs on a Claude Design origin — a raw GitHub or
// Vercel URL is rejected with "not an allowed Claude Design origin" — so the
// composition also ships as an Artifact-shaped fragment. Artifacts are
// wrapped in their own doctype/head/body at publish time, so this variant
// must not carry its own.
//
// The Artifact CSP blocks the jsdelivr runtime, so the published page itself
// will not animate. That is fine and expected: the artifact exists purely as
// a fetchable URL for the importer, which reads static markup rather than
// executing it.
const fragment = `<title>History Had No Common Sense — The Gold Cure</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@hyperframes/core/dist/hyperframe.runtime.iife.js"></script>
<style>
/* ---- brand fonts, inlined base64 woff2 ---- */
${fonts}
</style>
<style>
/* ---- host poses, inlined base64 png ---- */
${poses}
</style>
<style>
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    margin: 0;
    background: #f4f1e6;
  }
${css}
</style>
${root}
<script>
${js}
</script>
`;

const distDir = path.join(PROJECT, "dist");
fs.mkdirSync(distDir, { recursive: true });
const outPath = path.join(distDir, "hyperframes-import.html");
fs.writeFileSync(outPath, out);
fs.writeFileSync(path.join(distDir, "hyperframes-artifact.html"), fragment);

console.log(`source id "${sourceId}" -> "main"`);
console.log(`canvas ${width}x${height}, duration ${duration}s`);
console.log(`wrote ${path.relative(PROJECT, outPath)} (${Math.round(out.length / 1024)}KB)`);
