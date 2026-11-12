/**
 * Every command we tell a person or agent to run must name the package we actually publish.
 * Found before the 2.0.0 release: instructions said "npx -y dhis2-mcp", a name nobody owned on npm;
 * whoever registered it would have received people's DHIS2 passwords at login.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(ts|md|mjs)$/.test(e.name) ? [p] : [];
  });
}

test('the published name runs the CLI through npx', () => {
  expect(pkg.name).toBe('dhis2-mcp-server');
  expect(pkg.bin[pkg.name]).toBe('dist/cli.js');
});

test('every npx instruction and host config names the published package', () => {
  const sources = [...files(path.join(root, 'src')), path.join(root, 'README.md'), path.join(root, 'SECURITY-MODEL.md')];
  const bad: string[] = [];
  for (const f of sources) {
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/npx -y ([a-z0-9@/_.-]+)/g)) if (m[1] !== pkg.name && !m[1]!.startsWith('@modelcontextprotocol/') && m[1] !== 'mcprush@latest') bad.push(`${path.relative(root, f)}: npx -y ${m[1]}`);
    for (const m of text.matchAll(/\[\s*['"]-y['"],\s*['"]([^'"]+)['"]/g)) if (m[1] !== pkg.name) bad.push(`${path.relative(root, f)}: args -y ${m[1]}`);
  }
  expect(bad).toEqual([]);
});

test('package metadata points at the real repository', () => {
  expect(JSON.stringify([pkg.repository, pkg.homepage, pkg.bugs])).not.toMatch(/yourusername/);
  expect(pkg.repository.url).toMatch(/github\.com\/Dradebo\/dhis2-mcp/);
});
