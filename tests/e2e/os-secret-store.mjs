// Real OS secret store round trip (no fakes): save, read back, confirm the password is not in the
// store files, log out, confirm it is gone. Run on each OS in CI. Usage: node os-secret-store.mjs <build dir>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const build = path.resolve(process.argv[2] ?? 'build-e2e');
const store = await import(pathToFileURL(path.join(build, 'security', 'credential-store.js')).href);
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dhis2-os-store-'));
const env = { ...process.env, DHIS2_MCP_HOME: home };
delete env.DHIS2_MCP_PLAIN_SECRETS;
const PW = `ci-${Date.now()}-"q"\\b$ ünï`;
const expectWhere = process.env.EXPECT_SECRET_LOCATION; // set per OS in CI
let fails = 0, n = 0;
const check = (name, ok, detail = '') => { n++; if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  — ${detail}`}`); };
try {
  const where = store.saveStoredProfile('ci', { baseUrl: 'https://dev.example.org', username: 'ci', environment: 'development', verifiedAt: new Date().toISOString() }, PW, env);
  console.log(`platform ${process.platform}: password stored in "${where}"`);
  if (expectWhere) check(`S1 stored in the ${expectWhere}`, where === expectWhere, where);
  check('S2 reads back exactly', store.readStoredSecret('ci', env) === PW);
  const files = fs.readdirSync(home).map(f => fs.readFileSync(path.join(home, f), 'utf8')).join('\n');
  if (where !== 'private file') check('S3 the password is not in the store files', !files.includes(PW));
  check('S4 logout removes it', store.deleteStoredProfile('ci', env) === true && store.readStoredSecret('ci', env) === undefined);
} catch (e) { check('no exception', false, String(e?.message ?? e)); }
finally { fs.rmSync(home, { recursive: true, force: true }); }
console.log(`${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
