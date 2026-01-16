// Push code to GitHub using the API
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.cache',
  '.config',
  '.upm',
  'dist',
  '.replit',
  'replit.nix',
  '.breakpoints',
  'generated-icon.png',
  'package-lock.json',
  '.local',
  'scripts/github-api-push.ts',
  'scripts/push-to-github.ts',
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (shouldIgnore(relativePath)) continue;
    
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function main() {
  const owner = 'MaayonThayaparan';
  const repo = 'DebateTree';
  
  console.log('Getting GitHub client...');
  const octokit = await getGitHubClient();
  
  console.log('Getting file list...');
  const files = getAllFiles('.');
  console.log(`Found ${files.length} files to upload`);
  
  // Check if repo is empty or has a main branch
  let baseSha: string | null = null;
  let baseTreeSha: string | null = null;
  
  try {
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    baseSha = ref.object.sha;
    const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: baseSha });
    baseTreeSha = commit.tree.sha;
    console.log('Found existing main branch');
  } catch (e: any) {
    if (e.status === 404 || e.status === 409) {
      console.log('Empty or new repository, will create initial commit');
    } else {
      throw e;
    }
  }
  
  // Create blobs for all files
  console.log('Creating file blobs...');
  const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const content = fs.readFileSync(filePath);
    const isText = !filePath.match(/\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/i);
    
    try {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: isText ? content.toString('utf-8') : content.toString('base64'),
        encoding: isText ? 'utf-8' : 'base64',
      });
      
      treeItems.push({
        path: filePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
      
      if ((i + 1) % 10 === 0) {
        console.log(`  Uploaded ${i + 1}/${files.length} files...`);
      }
    } catch (e: any) {
      console.log(`  Skipping ${filePath}: ${e.message}`);
    }
  }
  
  console.log(`Created ${treeItems.length} blobs`);
  
  // Create tree
  console.log('Creating tree...');
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: treeItems,
    base_tree: baseTreeSha || undefined,
  });
  
  // Create commit
  console.log('Creating commit...');
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message: 'Initial commit - DebateTree v1.0.0',
    tree: tree.sha,
    parents: baseSha ? [baseSha] : [],
  });
  
  // Create or update the main branch
  console.log('Updating main branch...');
  try {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: commit.sha,
      force: true,
    });
  } catch (e: any) {
    if (e.status === 422) {
      await octokit.git.createRef({
        owner,
        repo,
        ref: 'refs/heads/main',
        sha: commit.sha,
      });
    } else {
      throw e;
    }
  }
  
  // Create v1.0.0 tag
  console.log('Creating v1.0.0 tag...');
  try {
    const { data: tagObject } = await octokit.git.createTag({
      owner,
      repo,
      tag: 'v1.0.0',
      message: 'Version 1.0.0 - Initial release of DebateTree',
      object: commit.sha,
      type: 'commit',
    });
    
    await octokit.git.createRef({
      owner,
      repo,
      ref: 'refs/tags/v1.0.0',
      sha: tagObject.sha,
    });
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('Tag v1.0.0 already exists');
    } else {
      throw e;
    }
  }
  
  // Create GitHub release
  console.log('Creating GitHub release...');
  try {
    await octokit.repos.createRelease({
      owner,
      repo,
      tag_name: 'v1.0.0',
      name: 'v1.0.0 - Initial Release',
      body: `# DebateTree v1.0.0

A social, mobile-first discussion platform that structures debates into tree-like hierarchies.

## Features
- Create discussion topics
- Respond with Agree, Disagree, or Neutral nodes
- Like/dislike topics and responses
- Reddit-style reply sheet for mobile
- User authentication via Replit Auth
- Light/dark theme support

## Tech Stack
- React + TypeScript frontend
- Express backend
- PostgreSQL database
- Tailwind CSS styling
`,
      draft: false,
      prerelease: false,
    });
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('Release already exists');
    } else {
      throw e;
    }
  }
  
  console.log('\n✅ Success! Your code is now on GitHub:');
  console.log(`   https://github.com/${owner}/${repo}`);
  console.log(`   Release: https://github.com/${owner}/${repo}/releases/tag/v1.0.0`);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
