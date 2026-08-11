// e2e-proof/make-bundle.mjs
// Construye el harness de "real behavior proof" para la PR #3453.
// 1) Extrae VERBATIM el bloque de conversión de color del fuente real
//    (src/components/SkillDiffCard.tsx, commit 650f0d5) — sin copiar a mano.
// 2) Lo transpila a JS plano (solo strip de tipos, esbuild).
// 3) Bundlea el monaco-editor REAL del repo (0.56.0).
// Genera: e2e-proof/generated/{fix-color-fns.js, monaco.bundle.js, proof.html}

import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const gen = path.join(here, "generated");
mkdirSync(gen, { recursive: true });

const src = readFileSync(path.join(root, "src/components/SkillDiffCard.tsx"), "utf8");
const lines = src.split("\n");

// El bloque de conversión va de `function normalizeHex` hasta el final del fichero.
const startIdx = lines.findIndex((l) => l.includes("function normalizeHex"));
if (startIdx < 0) throw new Error("normalizeHex not found");
const block = lines.slice(startIdx).join("\n");

const header = `// Generated por e2e-proof/make-bundle.mjs — bloque de conversión de color
// extraído VERBATIM de src/components/SkillDiffCard.tsx @ 650f0d5 (PR #3453).
// Solo se le quitó la sintaxis de tipos (esbuild). No es una re-implementación:
// es el código exacto en review, ejecutado en un navegador real contra Monaco real.
`;
writeFileSync(path.join(gen, "fix-color-fns.ts"), header + block + "\n\nexport { monacoColor };\n");

// Transpile (strip types) sin resolver imports — esbuild transform puro.
execSync(
  `node ${JSON.stringify(path.join(root, "node_modules/esbuild/bin/esbuild"))} ` +
    `${JSON.stringify(path.join(gen, "fix-color-fns.ts"))} ` +
    `--format=esm --outfile=${JSON.stringify(path.join(gen, "fix-color-fns.js"))} --log-level=warning`,
  { stdio: "inherit" },
);

// Bundle del monaco-editor REAL (IIFE -> globalThis.monaco) + su worker.
const monacoEntry = path.join(gen, "monaco-entry.mjs");
writeFileSync(
  monacoEntry,
  'import * as monaco from "monaco-editor";\nglobalThis.monaco = monaco;\n',
);
execSync(
  `node ${JSON.stringify(path.join(root, "node_modules/esbuild/bin/esbuild"))} ` +
    `${JSON.stringify(monacoEntry)} ` +
    `--bundle --format=iife --outfile=${JSON.stringify(path.join(gen, "monaco.bundle.js"))} ` +
    `--log-level=warning --loader:.ttf=dataurl --loader:.svg=dataurl 2>&1`,
  { stdio: "inherit" },
);
const workerEntry = path.join(gen, "monaco-worker-entry.mjs");
// Ruta relativa directa: el exports map del paquete remapea las importaciones
// por nombre y rompe la ruta del worker; la relativa lo bypasea.
writeFileSync(
  workerEntry,
  'import "../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js";\n',
);
execSync(
  `node ${JSON.stringify(path.join(root, "node_modules/esbuild/bin/esbuild"))} ` +
    `${JSON.stringify(workerEntry)} ` +
    `--bundle --format=iife --outfile=${JSON.stringify(path.join(gen, "monaco.worker.js"))} ` +
    `--log-level=warning 2>&1`,
  { stdio: "inherit" },
);

// Página de prueba.
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>clawhub #3440 fix — real browser proof</title>
<style>
  :root {
    /* Tokens dark REALES de @openclaw/carapace (styles/candidate, themes.css) */
    --oc-bg-page: oklch(0.18 0 0);
    --oc-bg-elevated: oklch(0.205 0 0);
    --oc-border-subtle: oklch(0.269 0 0);
    --oc-text-primary: oklch(0.985 0 0);
    --oc-text-secondary: oklch(0.87 0 0);
    --oc-accent-primary: oklch(0.72 0.19 25);
    --oc-accent-secondary: oklch(0.75 0.15 165);
    --oc-diff-added: #16a34a;
    --oc-diff-added-strong: #22c55e;
    --oc-diff-removed: #e57373;
    --oc-diff-removed-strong: #f87171;
  }
  body { margin: 0; background: var(--oc-bg-page); color: var(--oc-text-primary);
         font-family: ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 16px; margin: 12px 16px 4px; }
  .sub { font-size: 12px; margin: 0 16px 12px; color: var(--oc-text-secondary); }
  .panel { border: 1px solid var(--oc-border-subtle); border-radius: 8px; margin: 12px 16px;
           overflow: hidden; }
  .panel h2 { font-size: 13px; margin: 0; padding: 8px 12px; background: var(--oc-bg-elevated);
              border-bottom: 1px solid var(--oc-border-subtle); }
  .panel pre { margin: 0; padding: 8px 12px; font-size: 12px; white-space: pre-wrap; }
  .panel .err { color: #f87171; }
  .panel .ok { color: #22c55e; }
  .monaco-host { height: 340px; }
</style>
</head>
<body>
  <h1>clawhub #3440 — Diff tab crash on CSS Color 4 tokens: fix proof (real browser)</h1>
  <p class="sub">Real chromium + real monaco-editor 0.56.0 (repo dep) + real Carapace dark tokens
    (oklch) + fix code extracted verbatim from src/components/SkillDiffCard.tsx @ 650f0d5.</p>

  <div class="panel" id="panel-before">
    <h2>BEFORE — main behavior: raw oklch() tokens forwarded to monaco.editor.defineTheme()</h2>
    <pre id="before-out">loading…</pre>
  </div>

  <div class="panel" id="panel-after">
    <h2>AFTER — fix: monacoColor() converts the same tokens to #hex before defineTheme()</h2>
    <pre id="after-out">loading…</pre>
    <div class="monaco-host" id="diff-host"></div>
  </div>

  <script>
    self.MonacoEnvironment = {
      getWorker() {
        return new Worker("./monaco.worker.js");
      },
    };
  </script>
  <script src="./monaco.bundle.js"></script>
  <script type="module">
    import { monacoColor } from "./fix-color-fns.js";

    const $ = (id) => document.getElementById(id);

    function computedToken(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    // ---- BEFORE: replicate main (applyMonacoTheme reads raw tokens, only normalizeHex) ----
    const before = $("before-out");
    try {
      const rawBg = computedToken("--oc-bg-elevated");
      const rawInk = computedToken("--oc-text-primary");
      const stage = (label, fn) => {
        try {
          fn();
          return label + ": no throw";
        } catch (err) {
          return label + " threw -> " + String(err && err.message ? err.message : err);
        }
      };
      const theme = {
        base: "vs-dark",
        inherit: true,
        rules: [{ token: "", foreground: rawInk }],
        colors: { "editor.background": rawBg },
      };
      const r1 = stage("defineTheme", () => monaco.editor.defineTheme("clawhub-before", theme));
      const r2 = stage("setTheme", () => monaco.editor.setTheme("clawhub-before"));
      let r3 = "editor: n/a";
      if (!r2.includes("threw")) {
        const host = document.createElement("div");
        host.style.cssText = "height:180px;position:absolute;left:-9999px;top:0;width:400px";
        document.body.appendChild(host);
        r3 = stage("editor create", () => {
          const ed = monaco.editor.create(host, { theme: "clawhub-before", value: "x", language: "typescript" });
          ed.getModel() && ed.dispose();
        });
      }
      before.innerHTML =
        "main forwards the raw computed token <span class='err'>" + esc(rawInk) +
        "</span> into the theme (rule foreground), exactly like the pre-fix code:<br>" +
        r1.replace("no throw", "no throw") + "<br>" + r2 + "<br>" + r3;
    } catch (err) {
      before.innerHTML =
        "monaco.editor.<b>" + esc(String(err && err.message ? err.message : err)) + "</b>";
    }

    // ---- AFTER: fix behavior — same computed tokens through monacoColor ----
    const after = $("after-out");
    try {
      const raw = {
        bg: computedToken("--oc-bg-elevated"),
        ink: computedToken("--oc-text-primary"),
        inkSoft: computedToken("--oc-text-secondary"),
        border: computedToken("--oc-border-subtle"),
        accent: computedToken("--oc-accent-primary"),
        seafoam: computedToken("--oc-accent-secondary"),
        diffAdded: computedToken("--oc-diff-added"),
        diffAddedStrong: computedToken("--oc-diff-added-strong"),
        diffRemoved: computedToken("--oc-diff-removed"),
        diffRemovedStrong: computedToken("--oc-diff-removed-strong"),
      };
      const conv = (name, fb) => {
        const hex = monacoColor(raw[name], fb);
        if (!/^#[0-9a-f]{6,8}$/i.test(hex)) throw new Error(name + " -> " + hex + " (not hex)");
        return hex;
      };
      const bg = conv("bg", "#171717");
      const ink = conv("ink", "#fafafa");
      const inkSoft = conv("inkSoft", "#d4d4d4");
      const border = conv("border", "rgba(255,255,255,0.12)");
      const accent = conv("accent", "#e65c46");
      const seafoam = conv("seafoam", "#2bc6a4");
      const diffAdded = conv("diffAdded", "#9bb955");
      const diffAddedStrong = conv("diffAddedStrong", seafoam);
      const diffRemoved = conv("diffRemoved", "#e47866");
      const diffRemovedStrong = conv("diffRemovedStrong", accent);

      monaco.editor.defineTheme("clawhub-after", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "", foreground: ink },
          { token: "comment", foreground: inkSoft },
          { token: "diff-added", foreground: diffAdded },
          { token: "diff-added-strong", foreground: diffAddedStrong },
          { token: "diff-removed", foreground: diffRemoved },
          { token: "diff-removed-strong", foreground: diffRemovedStrong },
        ],
        colors: {
          "editor.background": bg,
          "editor.foreground": ink,
          "editor.lineHighlightBackground": monacoColor("color-mix(in oklch, " + raw.ink + " 6%, transparent)", "rgba(255,255,255,0.06)"),
          "diffEditor.insertedTextBackground": monacoColor("color-mix(in oklch, " + raw.diffAdded + " 18%, transparent)", "#16a34a2e"),
          "diffEditor.removedTextBackground": monacoColor("color-mix(in oklch, " + raw.diffRemoved + " 18%, transparent)", "#e573732e"),
          "diffEditor.insertedLineBackground": monacoColor("color-mix(in oklch, " + raw.diffAddedStrong + " 12%, transparent)", "#22c55e1f"),
          "diffEditor.removedLineBackground": monacoColor("color-mix(in oklch, " + raw.diffRemovedStrong + " 12%, transparent)", "#f871711f"),
          "editorLineNumber.foreground": inkSoft,
          "editorLineNumber.activeForeground": ink,
          "editorCursor.foreground": ink,
        },
      });
      monaco.editor.setTheme("clawhub-after");

      const original = [
        "function meaningOfLife() {",
        "  return 'nothing';",
        "}",
        "",
        "const answer = meaningOfLife();",
      ].join("\\n");
      const updated = [
        "function meaningOfLife() {",
        "  return 42; // was a string — theme crash showed a blank tab before",
        "}",
        "",
        "const answer = meaningOfLife();",
        "console.log('meaning of life:', answer);",
      ].join("\\n");

      const diffEditor = monaco.editor.createDiffEditor($("diff-host"), {
        theme: "clawhub-after",
        automaticLayout: true,
        readOnly: true,
        renderSideBySide: true,
      });
      diffEditor.setModel({
        original: monaco.editor.createModel(original, "typescript"),
        modified: monaco.editor.createModel(updated, "typescript"),
      });
      after.innerHTML =
        '<span class="ok">defineTheme(hex) accepted · DiffEditor rendered with ' +
        "theme clawhub-after (dark, converted tokens).</span>";
    } catch (err) {
      after.innerHTML = '<span class="err">' + esc(String(err && err.message ? err.message : err)) + "</span>";
    }

    function esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  </script>
</body>
</html>
`;
writeFileSync(path.join(gen, "proof.html"), html);
console.log("OK: e2e-proof/generated/{fix-color-fns.js, monaco.bundle.js, proof.html}");
