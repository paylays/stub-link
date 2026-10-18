import { APP_NAME, copy } from "@/content/copy";
import { THEME_HEAD_SCRIPT } from "./theme-script";

export type StatusKind = "not-found" | "expired" | "disabled";

// Copy comes only from copy.ts; nothing from the request reaches this document.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Same hex values and theme selectors as src/app/globals.css.
const darkTokens =
  "color-scheme:dark;--bg:#1d1b17;--note:#322d25;--text:#ece6db;--control:#877e71;--accent:#b5c27a;--track:#ece6db;--knob:#1d1b17;--knob-x:.875rem;";

const css = `
:root{color-scheme:light;--bg:#f6f2ea;--surface:#fcfaf6;--note:#ede6d8;--text:#29251f;--control:#8a8073;--accent:#56662a;--track:var(--surface);--knob:#6a6157;--knob-x:0;--font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${darkTokens}}}
:root[data-theme="dark"]{${darkTokens}}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font);font-size:1rem;line-height:1.5}
.page{max-width:32rem;margin:0 auto;padding:0 1rem 2rem}
header{display:flex;align-items:center;justify-content:space-between;min-height:3.75rem;padding-top:1rem}
.mark{display:inline-flex;align-items:center;min-height:2.75rem;min-width:2.75rem;font-weight:600;color:var(--text);text-decoration:none}
.mark:hover{text-decoration:underline;text-decoration-thickness:2px}
main{padding-top:2rem}
@media (min-width:36rem){.page{padding-left:2rem;padding-right:2rem}}
@media (min-width:48rem){main{padding-top:6rem}}
h1{font-size:clamp(1.75rem,1.35rem + 1.6vw,2.25rem);line-height:1.2;font-weight:600;margin:0 0 1rem}
p{margin:0 0 1.5rem}
main a{color:var(--text);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:.2em;display:inline-block;padding:.75rem 0;overflow-wrap:anywhere}
main a:hover{text-decoration-thickness:2px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
[data-theme-toggle]{display:none;align-items:center;gap:.5rem;min-height:2.75rem;padding:0 .5rem;border:0;background:transparent;color:var(--text);border-radius:4px;font:inherit;font-size:.875rem;cursor:pointer}
:root[data-js] [data-theme-toggle]{display:inline-flex}
[data-theme-toggle]:hover,[data-theme-toggle]:active{background:var(--note)}
.track{display:flex;align-items:center;width:2rem;height:1.125rem;padding-left:.125rem;border:1px solid var(--control);border-radius:4px;background:var(--track)}
.knob{display:block;width:.75rem;height:.75rem;border-radius:2px;background:var(--knob);transform:translateX(var(--knob-x))}
`.replace(/\n/g, "");

// Mirrors ThemeToggle.tsx for a page without React.
const switchScript = `(function(){var b=document.querySelector("[data-theme-toggle]");if(!b)return;var m=matchMedia("(prefers-color-scheme: dark)");function cur(){var t=document.documentElement.getAttribute("data-theme");if(t==="light"||t==="dark")return t;return m.matches?"dark":"light"}function sync(){b.setAttribute("aria-checked",String(cur()==="dark"))}sync();m.addEventListener("change",sync);b.addEventListener("click",function(){var n=cur()==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",n);try{localStorage.setItem("stub-theme",n)}catch(e){}sync()})})();`;

export function renderStatusPage(kind: StatusKind): string {
  const page = copy.statusPages[kind];
  return `<!doctype html>
<html lang="en">
<head>
<script>${THEME_HEAD_SCRIPT}</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(page.documentTitle)}</title>
<style>${css}</style>
</head>
<body>
<div class="page">
<header>
<a class="mark" href="/">${escapeHtml(APP_NAME)}</a>
<button type="button" role="switch" aria-checked="false" data-theme-toggle><span>${escapeHtml(copy.theme.toggleLabel)}</span><span class="track" aria-hidden="true"><span class="knob"></span></span></button>
</header>
<main>
<h1>${escapeHtml(page.title)}</h1>
<p>${escapeHtml(page.body)}</p>
<a href="/">${escapeHtml(page.homeLink)}</a>
</main>
</div>
<script>${switchScript}</script>
</body>
</html>
`;
}
