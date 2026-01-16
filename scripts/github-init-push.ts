// Initialize and push to GitHub using Contents API
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
  'scripts/',
  'attached_assets/',
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.startsWith(pattern) || filePath.includes('/' + pattern));
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (shouldIgnore(relativePath) || entry.name.startsWith('.')) continue;
    
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const owner = 'MaayonThayaparan';
  const repo = 'DebateTree';
  
  console.log('Getting GitHub client...');
  const octokit = await getGitHubClient();
  
  // First, create README to initialize the repo
  console.log('Initializing repository with README...');
  const readmeContent = `# DebateTree

A social, mobile-first discussion platform that structures debates into tree-like hierarchies with agree, disagree, and neutral nodes.

## Features

- **Structured Debates**: Organize discussions into clear agree/disagree/neutral response trees
- **Mobile-First Design**: Optimized for mobile with bottom sheet replies
- **Real-time Engagement**: Like/dislike topics and responses
- **User Authentication**: Secure login via Replit Auth
- **Dark/Light Themes**: Full theme support

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OIDC)

## Getting Started

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Set up environment variables (DATABASE_URL, SESSION_SECRET)
4. Push database schema: \`npm run db:push\`
5. Start the app: \`npm run dev\`

## License

MIT
`;

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Initial commit - Add README',
      content: Buffer.from(readmeContent).toString('base64'),
      branch: 'main',
    });
    console.log('README created!');
  } catch (e: any) {
    if (e.status === 422 && e.message.includes('sha')) {
      console.log('README already exists, continuing...');
    } else if (e.message.includes('Invalid request')) {
      // Need to create branch first
      console.log('Creating main branch...');
    } else {
      console.log('README error:', e.message);
    }
  }

  await sleep(1000);

  // Now get files and upload
  console.log('Getting file list...');
  const files = getAllFiles('.');
  console.log(`Found ${files.length} files to upload`);

  // Upload files in batches
  let uploaded = 0;
  let failed = 0;
  
  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath);
      const base64Content = content.toString('base64');
      
      // Check if file exists
      let sha: string | undefined;
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (e) {
        // File doesn't exist, that's fine
      }
      
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: `Add ${filePath}`,
        content: base64Content,
        branch: 'main',
        sha,
      });
      
      uploaded++;
      if (uploaded % 5 === 0) {
        console.log(`  Uploaded ${uploaded}/${files.length} files...`);
      }
      
      // Small delay to avoid rate limiting
      await sleep(100);
    } catch (e: any) {
      console.log(`  Failed ${filePath}: ${e.message}`);
      failed++;
    }
  }
  
  console.log(`\nUploaded ${uploaded} files, ${failed} failed`);
  
  // Create v1.0.0 release
  console.log('\nCreating v1.0.0 release...');
  try {
    // Get the latest commit SHA
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
    
    await octokit.repos.createRelease({
      owner,
      repo,
      tag_name: 'v1.0.0',
      target_commitish: ref.object.sha,
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
`,
      draft: false,
      prerelease: false,
    });
    console.log('Release created!');
  } catch (e: any) {
    console.log('Release error:', e.message);
  }
  
  console.log('\n✅ Done! Your code is on GitHub:');
  console.log(`   https://github.com/${owner}/${repo}`);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
