import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_URL = 'https://github.com/expo/expo.git';
const DOCS_DIR = path.join(__dirname, '..', 'docs-cache');
const TEMP_DIR = path.join(__dirname, '..', 'temp-expo-repo');

async function ensureDirectory(dir: string) {
  await fs.ensureDir(dir);
}

async function cloneAndExtractDocs() {
  console.log('Cloning Expo repository...');
  
  // Remove temp directory if it exists
  await fs.remove(TEMP_DIR);
  
  try {
    // Clone the repository with sparse checkout to only get docs
    await execAsync(`git clone --depth 1 --filter=blob:none --sparse ${REPO_URL} ${TEMP_DIR}`);
    
    // Configure sparse checkout to include docs directory
    await execAsync(`cd ${TEMP_DIR} && git sparse-checkout set docs`);
    
    // Check if docs directory exists
    const docsSourcePath = path.join(TEMP_DIR, 'docs');
    if (await fs.pathExists(docsSourcePath)) {
      console.log('Copying documentation files...');
      
      // Copy docs directory to cache
      await fs.copy(docsSourcePath, DOCS_DIR, {
        filter: (src) => {
          // Only copy .mdx and .md files, and directories
          const ext = path.extname(src);
          return ext === '' || ext === '.mdx' || ext === '.md' || ext === '.json';
        }
      });
      
      console.log('Documentation files copied successfully!');
    } else {
      console.warn('docs directory not found in repository');
    }
    
  } catch (error) {
    console.error('Error cloning repository:', error);
    throw error;
  } finally {
    // Clean up temp directory
    await fs.remove(TEMP_DIR);
  }
}

export async function downloadAllDocs() {
  console.log('Starting Expo documentation download...');
  console.log(`Downloading to: ${DOCS_DIR}`);
  
  // Clean existing cache
  await fs.remove(DOCS_DIR);
  await ensureDirectory(DOCS_DIR);
  
  try {
    // Clone repository and extract docs
    await cloneAndExtractDocs();
    
    // Create metadata file
    const metadata = {
      downloadDate: new Date().toISOString(),
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