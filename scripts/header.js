#!/usr/bin/env node
// Generates the animated terminal header (light + dark) for the profile README.
//   node scripts/header.js
const fs = require("fs");
const path = require("path");

const THEMES = {
  light: { card: "#ffffff", border: "#d0d7de", bar: "#f6f8fa", text: "#1f2328", muted: "#59636e", accent: "#00897b", accent2: "#0969da" },
  dark: { card: "#161b22", border: "#30363d", bar: "#1c2128", text: "#e6edf3", muted: "#9198a1", accent: "#3cc2b3", accent2: "#58a6ff" },
};

// Each line types out, then the next starts. [kind, text]
const LINES = [
  ["cmd", "whoami"],
  ["name", "Nipun Paul"],
  ["cmd", "cat role.txt"],
  ["out", "Senior Software Engineer @ Enosis Solutions · B.Sc. CSE, AUST"],
  ["out", "Research: Bengali NLP · blockchain systems  ·  1,200+ problems solved"],
  ["cmd", "ls ~/now"],
  ["dirs", "strider/   seatlagbe/   pdf2kindle/"],
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function svg(t) {
  const W = 900, top = 44, lh = 30;
  let y = top + 34, delay = 0.3;
  const rows = [];
  for (const [kind, text] of LINES) {
    if (kind === "name") y += 12;
    const chars = text.length;
    const dur = kind === "cmd" ? Math.max(0.35, chars * 0.05) : Math.max(0.3, chars * 0.012);
    const prompt = kind === "cmd" ? `<tspan class="prompt">nipun@github</tspan><tspan class="muted"> ~ </tspan><tspan class="prompt">$ </tspan>` : "";
    const cls = kind === "name" ? "name" : kind === "dirs" ? "dirs" : kind === "cmd" ? "cmd" : "out";
    const steps = Math.max(1, kind === "cmd" ? chars : Math.ceil(chars / 3));
    rows.push(
      `<text x="28" y="${y}" class="${cls} line" style="animation-delay:${delay.toFixed(2)}s;animation-duration:${dur.toFixed(2)}s;animation-timing-function:steps(${steps},end)">${prompt}${esc(text)}</text>`
    );
    delay += dur + (kind === "cmd" ? 0.25 : 0.12);
    y += kind === "name" ? lh + 8 : lh;
  }
  const H = y + 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Nipun Paul — Senior Software Engineer and researcher">
  <title>Nipun Paul — Senior Software Engineer @ Enosis Solutions; research in Bengali NLP and blockchain</title>
  <style>
    text { font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace; font-size: 17px; fill: ${t.text}; }
    .prompt { fill: ${t.accent}; font-weight: 600; }
    .muted { fill: ${t.muted}; }
    .out { fill: ${t.muted}; }
    .name { font-family: Georgia, "Times New Roman", serif; font-size: 34px; font-weight: 700; fill: ${t.text}; }
    .dirs { fill: ${t.accent2}; font-weight: 600; }
    .title { font-size: 13px; fill: ${t.muted}; }
    .line { clip-path: inset(0 100% 0 0); animation-name: type; animation-fill-mode: forwards; }
    @keyframes type { to { clip-path: inset(0 0 0 0); } }
    .final { opacity: 0; animation: show 0s ${delay.toFixed(2)}s forwards; }
    .cursor { fill: ${t.accent}; opacity: 0; animation: show 0s ${delay.toFixed(2)}s forwards, blink 1.1s ${delay.toFixed(2)}s step-end infinite; }
    @keyframes show { to { opacity: 1; } }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .line { animation: none; clip-path: none; } .cursor { animation: none; opacity: 1; } }
  </style>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="${t.card}" stroke="${t.border}"/>
  <path d="M1 13a12 12 0 0 1 12-12h${W - 26}a12 12 0 0 1 12 12v19H1z" fill="${t.bar}"/>
  <line x1="1" x2="${W - 1}" y1="32" y2="32" stroke="${t.border}"/>
  <circle cx="22" cy="17" r="6" fill="#ff5f57"/><circle cx="42" cy="17" r="6" fill="#febc2e"/><circle cx="62" cy="17" r="6" fill="#28c840"/>
  <text x="${W / 2}" y="21" text-anchor="middle" class="title">nipun@github: ~ — zsh</text>
  ${rows.join("\n  ")}
  <text x="28" y="${y}" class="final"><tspan class="prompt">nipun@github</tspan><tspan class="muted"> ~ </tspan><tspan class="prompt">$ </tspan></text>
  <rect class="cursor" x="202" y="${y - 15}" width="10" height="19"/>
</svg>
`;
}

const out = path.join(__dirname, "..", "assets");
fs.mkdirSync(out, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  fs.writeFileSync(path.join(out, `header-${name}.svg`), svg(t));
}
console.log("wrote assets/header-light.svg, assets/header-dark.svg");
