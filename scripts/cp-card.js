#!/usr/bin/env node
/*
 * Builds assets/cp-card-{light,dark}.svg: competitive-programming totals across
 * online judges plus the Codeforces rating history. Run daily by
 * .github/workflows/cp-card.yml; needs Node 18+ (global fetch).
 * Judges that block scripts fall back to the last known value below.
 */
const fs = require("fs");
const path = require("path");

const UA = "Mozilla/5.0 (Nipun4338 profile card)";
const JUDGES = [
  // key, fallback (last known solved count)
  ["codeforces", 567], ["uva", 184], ["toph", 158], ["atcoder", 113], ["lightoj", 50],
  ["codechef", 44], ["leetcode", 40], ["spoj", 32], ["hackerearth", 21], ["timus", 15],
  ["aizu", 9], ["hdu", 5], ["kattis", 5], ["eolymp", 1], ["zoj", 1],
];
const FALLBACK = { tophContests: 29, tophRating: 1735, atcoderContests: 17 };

const get = async (url, type = "json", opts = {}) => {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...(opts.headers || {}) }, ...opts });
  if (!res.ok) throw new Error(url + " " + res.status);
  return type === "json" ? res.json() : res.text();
};
const text = (h) => h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

const fetchers = {
  async uva() {
    const uid = await get("https://uhunt.onlinejudge.org/api/uname2uid/Nipun4338");
    const subs = await get("https://uhunt.onlinejudge.org/api/subs-user/" + uid);
    return new Set(subs.subs.filter((s) => s[2] === 90).map((s) => s[1])).size;
  },
  async toph(x) {
    const t = text(await get("https://toph.co/u/NX4338", "text"));
    const c = t.match(/(\d+) Contests/), r = t.match(/(\d+) [A-Z]? ?Current Rating/), s = t.match(/(\d+) \/ \d+ Problems Solved/);
    if (c) x.tophContests = +c[1];
    if (r) x.tophRating = +r[1];
    if (!s) throw new Error("toph");
    return +s[1];
  },
  async atcoder(x) {
    const h = await get("https://atcoder.jp/users/Nipun4338/history/json").catch(() => null);
    if (Array.isArray(h)) x.atcoderContests = h.filter((e) => e.IsRated).length;
    return (await get("https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=Nipun4338")).count;
  },
  async codechef() {
    const m = text(await get("https://www.codechef.com/users/nhacker", "text")).match(/Total Problems Solved: ?(\d+)/);
    if (!m) throw new Error("codechef");
    return +m[1];
  },
  async leetcode() {
    const j = await get("https://leetcode.com/graphql", "json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "query($u:String!){matchedUser(username:$u){submitStatsGlobal{acSubmissionNum{difficulty count}}}}",
        variables: { u: "nipun4338" },
      }),
    });
    return j.data.matchedUser.submitStatsGlobal.acSubmissionNum.find((x) => x.difficulty === "All").count;
  },
  async timus() {
    const m = text(await get("https://acm.timus.ru/author.aspx?id=260243", "text")).match(/Problems solved (\d+) out of/);
    if (!m) throw new Error("timus");
    return +m[1];
  },
};

const THEMES = {
  light: { card: "#ffffff", border: "#d0d7de", text: "#1f2328", muted: "#59636e", faint: "#818b98", grid: "#eaeef2", chart: "#00897b" },
  dark: { card: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#9198a1", faint: "#6e7681", grid: "#21262d", chart: "#28a99b" },
};

function card(t, d) {
  const W = 900, H = 278;
  // rating chart area (right side)
  const cx = 470, cy = 60, cw = 400, ch = 150;
  const pts = d.history;
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
  const rMin = Math.floor((Math.min(...pts.map((p) => p[1])) - 50) / 200) * 200;
  const rMax = Math.ceil((Math.max(...pts.map((p) => p[1])) + 50) / 200) * 200;
  const X = (v) => cx + ((v - t0) / (t1 - t0)) * cw;
  const Y = (r) => cy + (1 - (r - rMin) / (rMax - rMin)) * ch;
  const line = pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
  const area = line + ` L${X(t1).toFixed(1)} ${cy + ch} L${cx} ${cy + ch} Z`;
  const peak = pts.reduce((a, p) => (p[1] > a[1] ? p : a), pts[0]);
  const grid = [];
  for (let r = rMin; r <= rMax; r += 400) {
    grid.push(`<line x1="${cx}" x2="${cx + cw}" y1="${Y(r).toFixed(1)}" y2="${Y(r).toFixed(1)}" stroke="${t.grid}"/><text x="${cx - 8}" y="${(Y(r) + 4).toFixed(1)}" text-anchor="end" class="tick">${r}</text>`);
  }
  const y0 = new Date(t0 * 1000).getFullYear(), y1 = new Date(t1 * 1000).getFullYear();

  const stat = (x, y, value, label) =>
    `<text x="${x}" y="${y}" class="value">${value}</text><text x="${x}" y="${y + 22}" class="label">${label}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Competitive programming: ${d.totalLabel} problems solved across ${d.judges} online judges, ${d.contests} rated contests, peak Codeforces rating ${d.peak}">
  <title>Competitive programming: ${d.totalLabel} problems solved across ${d.judges} judges; ${d.contests} rated contests; peak Codeforces rating ${d.peak}</title>
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; fill: ${t.text}; }
    .h { font-size: 15px; font-weight: 600; }
    .sub { font-size: 12px; fill: ${t.faint}; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .value { font-size: 30px; font-weight: 700; font-family: Georgia, "Times New Roman", serif; }
    .label { font-size: 12.5px; fill: ${t.muted}; }
    .tick { font-size: 11px; fill: ${t.faint}; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .peak { font-size: 12px; font-weight: 600; }
    .draw { stroke-dasharray: 2400; stroke-dashoffset: 2400; animation: draw 2.2s 0.3s ease-out forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .draw { animation: none; stroke-dashoffset: 0; } }
  </style>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="${t.card}" stroke="${t.border}"/>
  <text x="28" y="38" class="h">Competitive programming</text>
  <text x="${cx}" y="38" class="h">Codeforces rating</text>
  <text x="${cx + cw}" y="38" text-anchor="end" class="sub">${pts.length} contests · ${y0}–${y1}</text>
  ${stat(28, 92, d.totalLabel, `problems · ${d.judges} online judges`)}
  ${stat(230, 92, String(d.contests), "rated contests")}
  ${stat(28, 172, String(d.peak), "peak Codeforces · " + d.rank)}
  ${stat(230, 172, String(d.toph), "Toph rating")}
  ${grid.join("\n  ")}
  <path d="${area}" fill="${t.chart}" opacity="0.1"/>
  <path class="draw" d="${line}" fill="none" stroke="${t.chart}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${X(peak[0]).toFixed(1)}" cy="${Y(peak[1]).toFixed(1)}" r="4.5" fill="${t.chart}" stroke="${t.card}" stroke-width="2"/>
  <text x="${(X(peak[0]) + 9).toFixed(1)}" y="${(Y(peak[1]) - 7).toFixed(1)}" class="peak">Peak ${peak[1]}</text>
  <text x="${cx}" y="${cy + ch + 20}" class="tick">${y0}</text><text x="${cx + cw}" y="${cy + ch + 20}" text-anchor="end" class="tick">${y1}</text>
  <text x="28" y="${H - 18}" class="sub">Updated ${d.asOf} · Codeforces, AtCoder, UVa, Toph, CodeChef, LeetCode and more</text>
</svg>
`;
}

function rankName(r) {
  if (r >= 1900) return "Candidate Master";
  if (r >= 1600) return "Expert";
  if (r >= 1400) return "Specialist";
  if (r >= 1200) return "Pupil";
  return "Newbie";
}

async function main() {
  const extra = { ...FALLBACK };
  const [info, rating, status] = await Promise.all([
    get("https://codeforces.com/api/user.info?handles=NX_4338"),
    get("https://codeforces.com/api/user.rating?handle=NX_4338"),
    get("https://codeforces.com/api/user.status?handle=NX_4338"),
  ]);
  const cfSolved = new Set(status.result.filter((s) => s.verdict === "OK").map((s) => s.problem.contestId + s.problem.index)).size;

  let total = 0;
  const fellBack = [];
  for (const [key, fallback] of JUDGES) {
    let n = fallback;
    try {
      if (key === "codeforces") n = cfSolved;
      else if (fetchers[key]) n = await fetchers[key](extra);
      else throw new Error("no source");
      if (!(n > 0)) throw new Error("zero");
    } catch (e) {
      n = fallback;
      if (fetchers[key]) fellBack.push(key);
    }
    total += n;
  }

  const history = rating.result.map((h) => [h.ratingUpdateTimeSeconds, h.newRating]);
  const peak = info.result[0].maxRating;
  const data = {
    totalLabel: (Math.floor(total / 100) * 100).toLocaleString("en-US") + "+",
    judges: JUDGES.length,
    contests: history.length + extra.atcoderContests + extra.tophContests,
    peak,
    rank: rankName(peak),
    toph: extra.tophRating,
    history,
    asOf: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
  };

  const out = path.join(__dirname, "..", "assets");
  fs.mkdirSync(out, { recursive: true });
  for (const [name, t] of Object.entries(THEMES)) fs.writeFileSync(path.join(out, `cp-card-${name}.svg`), card(t, data));
  console.log(`cp card: ${total} solved (${data.totalLabel}), ${data.contests} contests, peak ${peak}` + (fellBack.length ? `; fallback for ${fellBack.join(", ")}` : ""));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
