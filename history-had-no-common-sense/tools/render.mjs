#!/usr/bin/env node
/**
 * Local preview renderer for HyperFrames compositions.
 *
 * Mirrors what the HyperFrames cloud renderer does: seek a paused GSAP
 * timeline frame by frame in headless Chromium, screenshot each frame, and
 * pipe the stream into FFmpeg.
 *
 * This exists so episodes can be previewed without the HyperFrames
 * connector authorized. The connector remains the path for final delivery.
 *
 *   node tools/render.mjs <composition.html> [options]
 *
 *   --out <path>      output file            (default renders/preview.mp4)
 *   --fps <n>         frame rate             (default from data-fps, else 30)
 *   --from <sec>      start time             (default 0)
 *   --to <sec>        end time               (default data-duration)
 *   --scale <n>       resolution multiplier  (default 1)
 *   --contact <path>  write a contact sheet of key frames instead of video
 *   --jpeg            capture frames as JPEG rather than PNG
 *   --quality <n>     JPEG quality, 1-100        (default 96)
 *
 * Use --jpeg for anything full length. Chromium's PNG encoder costs roughly
 * 0.77s/frame at 1080x1920 versus 0.067s for JPEG — an 11x difference, or
 * 35 minutes versus 3 for a 94-second episode. The frames are re-encoded to
 * H.264 regardless, so a high-quality JPEG intermediate is not the thing
 * that limits output quality.
 *
 * Env:
 *   FFMPEG_BIN   path to an ffmpeg with libx264 (required for mp4 output)
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import fs from "node:fs";

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith("--"));
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const compPath = path.resolve(positional[0] ?? "composition.html");
if (!fs.existsSync(compPath)) {
  console.error(`composition not found: ${compPath}`);
  process.exit(1);
}

const FFMPEG = process.env.FFMPEG_BIN ?? "ffmpeg";
const imgType = has("jpeg") ? "jpeg" : "png";
const scale = Number(flag("scale", 1));

// Prefer a preinstalled Chromium when present. The pinned playwright build
// often disagrees with the image's browser revision, and re-downloading is
// both slow and blocked in sandboxed environments.
const chromeCandidates = [
  process.env.CHROMIUM_BIN,
  "/opt/pw-browsers/chromium",
].filter(Boolean);
const executablePath = chromeCandidates.find((p) => fs.existsSync(p));

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
});
const page = await browser.newPage({ viewport: { width: 100, height: 100 } });

await page.goto(`file://${compPath}`, { waitUntil: "networkidle" });

// Read the composition contract off the DOM.
const meta = await page.evaluate(() => {
  const s = document.getElementById("stage");
  if (!s) throw new Error("no #stage element found");
  return {
    id: s.dataset.compositionId,
    width: Number(s.dataset.width || 1920),
    height: Number(s.dataset.height || 1080),
    fps: Number(s.dataset.fps || 30),
    duration: Number(s.dataset.duration || 0),
  };
});

const fps = Number(flag("fps", meta.fps));
const from = Number(flag("from", 0));
const to = Number(flag("to", meta.duration));

if (!meta.duration && !flag("to")) {
  console.error("composition has no data-duration; pass --to <seconds>");
  process.exit(1);
}

await page.setViewportSize({
  width: Math.round(meta.width * scale),
  height: Math.round(meta.height * scale),
});
if (scale !== 1) {
  await page.evaluate(
    (s) => (document.getElementById("stage").style.zoom = String(s)),
    scale
  );
}

// Fonts must be settled before the first frame or early frames render in
// the fallback face and the video visibly "pops" when the webfont lands.
await page.evaluate(() => document.fonts.ready);

const ready = await page.evaluate((id) => {
  return Boolean(window.__timelines && window.__timelines[id]);
}, meta.id);
if (!ready) {
  console.error(`no paused timeline registered at window.__timelines["${meta.id}"]`);
  process.exit(1);
}

const seek = async (t) => {
  await page.evaluate(
    ([id, time]) => {
      const tl = window.__timelines[id];
      tl.pause();
      tl.seek(time, false);
    },
    [meta.id, t]
  );
};

console.log(
  `${meta.id} — ${meta.width}x${meta.height} @ ${fps}fps, ${from}s→${to}s`
);

/* ---------------- contact sheet mode ---------------- */
if (has("contact")) {
  const outDir = path.resolve(flag("contact"));
  fs.mkdirSync(outDir, { recursive: true });
  // Sample the middle of each scene plus a few motion beats.
  const marks = (flag("marks") ?? "3,14,20,32,38,48,53,61,64,70,75,86,92")
    .split(",")
    .map(Number);
  for (const t of marks) {
    await seek(t);
    const f = path.join(outDir, `t${String(t).padStart(3, "0")}s.png`);
    await page.screenshot({ path: f });
    console.log(`  ${f}`);
  }
  await browser.close();
  process.exit(0);
}

/* ---------------- video mode ---------------- */
const outPath = path.resolve(flag("out", "renders/preview.mp4"));
fs.mkdirSync(path.dirname(outPath), { recursive: true });

const ff = spawn(
  FFMPEG,
  [
    "-y",
    "-f", "image2pipe",
    "-framerate", String(fps),
    "-i", "-",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outPath,
  ],
  { stdio: ["pipe", "ignore", "pipe"] }
);

let ffErr = "";
ff.stderr.on("data", (d) => (ffErr += d.toString()));

const total = Math.round((to - from) * fps);
const t0 = Date.now();

for (let i = 0; i < total; i++) {
  const t = from + i / fps;
  await seek(t);
  const buf = await page.screenshot(
    imgType === "jpeg"
      ? { type: "jpeg", quality: Number(flag("quality", 96)) }
      : { type: "png" }
  );
  if (!ff.stdin.write(buf)) await once(ff.stdin, "drain");

  if (i % 60 === 0 || i === total - 1) {
    const pct = (((i + 1) / total) * 100).toFixed(1);
    const el = (Date.now() - t0) / 1000;
    process.stdout.write(
      `\r  frame ${i + 1}/${total} (${pct}%)  ${el.toFixed(0)}s elapsed   `
    );
  }
}

ff.stdin.end();
const [code] = await once(ff, "close");
await browser.close();

process.stdout.write("\n");
if (code !== 0) {
  console.error(ffErr.split("\n").slice(-25).join("\n"));
  process.exit(code);
}
console.log(`wrote ${outPath}`);
