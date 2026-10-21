import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
assert.ok(repository && token, 'GITHUB_REPOSITORY and GITHUB_TOKEN are required');
const [owner, repo] = repository.split('/');
assert.ok(owner && repo, 'Invalid repository name');
const branch = 'player-data-batch';
const api = async (path) => {
  const response = await fetch('https://api.github.com/repos/' + repository + path, {
    headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!response.ok) throw new Error('GitHub API ' + path + ' returned ' + response.status + ': ' + (await response.text()).slice(0, 500));
  return response.json();
};
execFileSync('git', ['fetch', '--quiet', 'origin', '+refs/heads/main:refs/remotes/origin/main', '+refs/heads/' + branch + ':refs/remotes/origin/' + branch]);
const branchInfo = await api('/branches/' + branch);
const mainContainsBranch = (() => {
  try { execFileSync('git', ['merge-base', '--is-ancestor', 'origin/' + branch, 'origin/main']); return true; }
  catch { return false; }
})();
const branchOnlyFiles = execFileSync('git', ['diff', '--name-status', 'origin/main', 'origin/' + branch], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean).filter((line) => line.startsWith('A\t'));
const openPulls = await api('/pulls?state=open&head=' + encodeURIComponent(owner + ':' + branch) + '&per_page=100');
const runs = await api('/actions/runs?branch=' + encodeURIComponent(branch) + '&status=in_progress&per_page=100');
const activeRuns = (runs.workflow_runs || []).map((run) => ({ id: run.id, name: run.name, url: run.html_url }));
const safe = mainContainsBranch && branchOnlyFiles.length === 0 && openPulls.length === 0 && activeRuns.length === 0;
const report = {
  checkedAt: new Date().toISOString(),
  branch,
  branchHead: branchInfo.commit.sha,
  mainContainsBranch,
  branchOnlyFiles,
  openPullRequests: openPulls.map((pr) => ({ number: pr.number, url: pr.html_url })),
  activeWorkflows: activeRuns,
  safeToDelete: safe,
  deleted: false,
  note: 'This check never deletes the branch. Separate explicit user approval is required for deletion.',
};
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/branch-deletion-safety.json', JSON.stringify(report, null, 2) + '\n');
assert.ok(safe, 'Branch is not yet safe to delete; report written to artifacts/branch-deletion-safety.json');
console.log('PASS: branch ' + branch + ' is safe to delete after separate approval. No branch was deleted.');
