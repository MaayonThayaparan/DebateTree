// GitHub integration script to push code to repository
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
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
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

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    if (item === 'node_modules' || item === '.git' || item === 'dist' || item === '.cache') continue;
    
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  
  return files;
}

async function main() {
  const owner = 'MaayonThayaparan';
  const repo = 'DebateTree';
  const branch = 'main';
  const commitMessage = process.argv[2] || 'v1.0.1: Add promote node to discussion feature and soft delete policy';
  
  console.log('Getting GitHub client...');
  const octokit = await getGitHubClient();
  
  console.log('Getting authenticated user...');
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);

  console.log('Getting current branch ref...');
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const currentCommitSha = refData.object.sha;
  console.log(`Current commit: ${currentCommitSha}`);

  console.log('Getting current commit tree...');
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: currentCommitSha,
  });
  const baseTreeSha = commitData.tree.sha;

  console.log('Collecting files...');
  const projectDir = process.cwd();
  const files = getAllFiles(projectDir);
  console.log(`Found ${files.length} files to upload`);

  console.log('Creating blobs and tree entries...');
  const treeEntries: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    sha: string;
  }> = [];

  let uploaded = 0;
  for (const file of files) {
    const filePath = path.join(projectDir, file);
    const content = fs.readFileSync(filePath);
    const isText = !content.includes(0);
    
    try {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: isText ? content.toString('utf-8') : content.toString('base64'),
        encoding: isText ? 'utf-8' : 'base64',
      });

      treeEntries.push({
        path: file,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
      uploaded++;
      if (uploaded % 20 === 0) {
        console.log(`  Uploaded ${uploaded}/${files.length} files...`);
      }
    } catch (e: any) {
      console.error(`  Failed to upload ${file}: ${e.message}`);
    }
  }
  console.log(`Uploaded ${uploaded} files`);

  console.log('Creating tree...');
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: treeEntries,
  });
  console.log(`New tree: ${newTree.sha}`);

  console.log('Creating commit...');
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.sha,
    parents: [currentCommitSha],
  });
  console.log(`New commit: ${newCommit.sha}`);

  console.log('Updating branch ref...');
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommit.sha,
  });

  console.log(`\nSuccessfully pushed to GitHub!`);
  console.log(`Commit: ${newCommit.sha}`);
  console.log(`URL: https://github.com/${owner}/${repo}/commit/${newCommit.sha}`);
}

main().catch(console.error);
