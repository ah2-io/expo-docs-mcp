import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_API_BASE = 'https://api.github.com/repos/expo/expo';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/expo/expo';
const COMMIT_SHA = 'main'; // Use main branch for latest docs
const DOCS_DIR = path.join(__dirname, '..', 'docs-cache');

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url?: string;
}

async function ensureDirectory(dir: string) {
  await fs.ensureDir(dir);
}

async function downloadFile(url: string, filePath: string) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    await fs.writeFile(filePath, response.data);
    console.log(`Downloaded: ${filePath}`);
  } catch (error) {
    console.error(`Failed to download ${url}: ${error}`);
  }
}

async function fetchDirectoryContents(path: string): Promise<GitHubFile[]> {
  try {
    const url = `${GITHUB_API_BASE}/contents/${path}?ref=${COMMIT_SHA}`;
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // Add GitHub token if you have one to avoid rate limits
        // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch directory ${path}: ${error}`);
    return [];
  }
}

async function downloadMDXFiles(githubPath: string, localPath: string, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return;
  }
  
  await ensureDirectory(localPath);
  
  const files = await fetchDirectoryContents(githubPath);
  
  for (const file of files) {
    if (file.type === 'file' && (file.name.endsWith('.mdx') || file.name.endsWith('.md'))) {
      const localFilePath = path.join(localPath, file.name);
      const rawUrl = `${GITHUB_RAW_BASE}/${COMMIT_SHA}/${file.path}`;
      await downloadFile(rawUrl, localFilePath);
    } else if (file.type === 'dir' && currentDepth < maxDepth - 1) {
      // Skip certain directories that are not documentation
      const skipDirs = ['node_modules', '.git', 'build', 'dist', 'coverage', 'tests', '__tests__', 'test'];
      if (!skipDirs.includes(file.name)) {
        const newLocalPath = path.join(localPath, file.name);
        await downloadMDXFiles(file.path, newLocalPath, maxDepth, currentDepth + 1);
      }
    }
  }
}

export async function downloadAllDocs() {
  console.log('Starting Expo documentation download...');
  console.log(`Downloading to: ${DOCS_DIR}`);
  
  // Clean existing cache
  await fs.remove(DOCS_DIR);
  await ensureDirectory(DOCS_DIR);
  
  try {
    // Download docs from the main docs directory
    await downloadMDXFiles('docs', DOCS_DIR);
    
    // Also download pages directory which contains additional documentation
    await downloadMDXFiles('docs/pages', path.join(DOCS_DIR, 'pages'));
    
    // Create metadata file
    const metadata = {
      downloadDate: new Date().toISOString(),
      commitSha: COMMIT_SHA,
      baseUrl: 'https://docs.expo.dev',
      source: 'https://github.com/expo/expo/tree/main/docs'
    };
    
    await fs.writeJSON(path.join(DOCS_DIR, 'metadata.json'), metadata, { spaces: 2 });
    
    console.log('Expo documentation download complete!');
    
    // Count downloaded files
    const files = await fs.readdir(DOCS_DIR, { recursive: true });
    const mdxFiles = files.filter(file => 
      typeof file === 'string' && (file.endsWith('.mdx') || file.endsWith('.md'))
    );
    console.log(`Downloaded ${mdxFiles.length} documentation files`);
    
  } catch (error) {
    console.error('Error downloading documentation:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllDocs().catch(console.error);
}