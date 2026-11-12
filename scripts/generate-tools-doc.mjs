// Generate docs/TOOLS.md from the built tool definitions (the source of truth), grouped as an agent sees them.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const build = path.resolve(process.argv[2] ?? 'build-e2e');
const t = await import(pathToFileURL(path.join(build, 'tools', 'index.js')).href);
const instance = new Set(t.INSTANCE_TOOL_NAMES ?? []);
const api = (t.createAPITools?.() ?? []);
const dev = (t.createDevelopmentTools?.() ?? []);
const all = [...api, ...dev.filter(d => !api.some(a => a.name === d.name))];
const first = (s) => String(s ?? '').split(/(?<=\.)\s/)[0].replace(/\|/g, '\\|').slice(0, 180);
const groups = [
  ['Changes (each one approved by the person; development and training servers only)', n => /^dhis2_(plan_|apply_|cancel_|approve_|run_analytics|prepare_transfer|verify_transfer)/.test(n)],
  ['Projects, requirements and handover (local files)', n => /^dhis2_(start_project|record_requirements|ask_clarifications|get_project|write_handover)$/.test(n)],
  ['Design and discovery (no changes)', n => /^dhis2_(check_design|get_schema|find_reusable|validate_expression|generate_uids|get_(plan|package|operation|job|transfer))$/.test(n)],
  ['Reading the connected DHIS2 server', n => instance.has(n) || /^dhis2_(list_|get_|configure)/.test(n)],
  ['App development helpers (no DHIS2 connection needed)', () => true],
];
const placed = new Set();
let md = `# Tools\n\nGenerated from the tool definitions in this release (${all.length} tools). The agent sees only the tools the connection allows: a production (read-only) or unsupported-version server gets no change tools.\n`;
for (const [title, test] of groups) {
  const rows = all.filter(x => !placed.has(x.name) && test(x.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (!rows.length) continue;
  rows.forEach(r => placed.add(r.name));
  md += `\n## ${title} (${rows.length})\n\n| Tool | What it does |\n|---|---|\n` + rows.map(r => `| \`${r.name}\` | ${first(r.description)} |`).join('\n') + '\n';
}
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/TOOLS.md', md);
console.log(`${all.length} tools; groups:`, md.match(/^## .*$/gm).join(' / '));
