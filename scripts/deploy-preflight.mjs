import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'apps/observer-server/Dockerfile',
  'apps/mcp-server/package.json',
  'package-lock.json',
];

const fail = (message) => {
  console.error(`deploy preflight failed: ${message}`);
  process.exit(1);
};

const ref = process.env.GITHUB_REF ?? '';
const event = process.env.GITHUB_EVENT_NAME ?? '';
const isMain = ref === 'refs/heads/main';
const isVersionTag = /^refs\/tags\/v\d+\.\d+\.\d+/.test(ref);

if (event !== 'push') fail(`expected push event, got ${event || '<empty>'}`);
if (!isMain && !isVersionTag) fail(`expected main or v* tag ref, got ${ref || '<empty>'}`);

for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`missing ${file}`);
}

const pkg = JSON.parse(readFileSync('apps/mcp-server/package.json', 'utf8'));
if (pkg.name !== 'raveneye-mcp-server') fail(`unexpected npm package name ${pkg.name}`);
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(pkg.version)) {
  fail(`invalid npm package version ${pkg.version}`);
}

for (const name of ['HAS_DOCKERHUB_USERNAME', 'HAS_DOCKERHUB_TOKEN', 'HAS_NPM_TOKEN']) {
  if (process.env[name] !== 'true') fail(`missing GitHub secret for ${name}`);
}

console.log(`deploy preflight ok: ${ref}, raveneye-mcp-server@${pkg.version}`);
