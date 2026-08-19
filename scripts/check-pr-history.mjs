import { execFileSync } from 'node:child_process';
import process from 'node:process';

const [baseSha, headSha] = process.argv.slice(2);

if (!baseSha || !headSha) {
  throw new Error(
    'Usage: node scripts/check-pr-history.mjs <base-sha> <head-sha>',
  );
}

const mergeCommits = git([
  'rev-list',
  '--merges',
  '--reverse',
  `${baseSha}..${headSha}`,
]);

if (!mergeCommits) {
  console.log('Pull request history is linear.');
  process.exit();
}

console.error(
  '::error title=Non-linear feature branch::' +
    'Pull requests must not introduce merge commits. Rebase the feature branch before merging.',
);
console.error(
  git(['log', '--format=%h %s', '--no-walk', ...mergeCommits.split('\n')]),
);
process.exit(1);

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
  }).trim();
}
