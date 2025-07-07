import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { glob } from 'glob';
import NodeCache from 'node-cache';
import Fuse from 'fuse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DocMetadata {
  title?: string;
  description?: string;
  section?: string;
  version?: string;
  [key: string]: any;
}

interface SearchResult {
  path: string;
  title: string;
  excerpt: string;
  section?: string;
  version?: string;
  score: number;
}

interface IndexedDocument {
  path: string;
  title: string;
  content: string;
  metadata: DocMetadata;
  section?: string;
  version?: string;
}

export class OfflineDocsFetcher {
  private cache: NodeCache;
  private docsDir: string;
  private docsIndex: Map<string, DocMetadata> = new Map();
  private documentsIndex: IndexedDocument[] = [];
  private fuseIndex: Fuse<IndexedDocument> | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void>;

  constructor() {
    // Cache for 1 week (7 days * 24 hours * 60 minutes * 60 seconds)
    this.cache = new NodeCache({ stdTTL: 604800 });
    this.docsDir = path.join(__dirname, '..', 'docs-cache');
    this.initializationPromise = this.initializeIndex();
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializationPromise;
    }
  }

  private async initializeIndex() {
    try {
      // Check if docs cache exists
      const docsCacheExists = await fs.pathExists(this.docsDir);
      
      if (!docsCacheExists) {
        console.log('Documentation cache not found. Initiating download...');
        await this.downloadDocs();
      }
      
      const files = await glob('**/*.{md,mdx}', { cwd: this.docsDir });
      
      if (files.length === 0) {
        console.log('No documentation files found. Initiating download...');
        await this.downloadDocs();
        // Re-scan after download
        const newFiles = await glob('**/*.{md,mdx}', { cwd: this.docsDir });
        files.push(...newFiles);
      }
      
      for (const file of files) {
        const filePath = path.join(this.docsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data, content: mdxContent } = matter(content);
        
        // Extract section and version from path
        const pathParts = file.split(path.sep);
        const section = this.extractSection(pathParts);
        const version = this.extractVersion(pathParts, data);
        
        const metadata = {
          ...data,
          section: section || data.section,
          version: version || data.version
        };
        
        this.docsIndex.set(file, metadata);
        
        // Add to documents index for fuzzy searching
        this.documentsIndex.push({
          path: file,
          title: data.title || path.basename(file, path.extname(file)),
          content: mdxContent,
          metadata,
          section,
          version
        });
      }
      
      // Create Fuse index for fuzzy searching
      this.fuseIndex = new Fuse(this.documentsIndex, {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'content', weight: 0.3 },
          { name: 'metadata.description', weight: 0.2 },
          { name: 'path', weight: 0.1 }
        ],
        includeScore: true,
        threshold: 0.6,
        ignoreLocation: true,
        useExtendedSearch: true,
        minMatchCharLength: 2
      });
      
      console.log(`Indexed ${this.docsIndex.size} Expo documentation files`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize docs index:', error);
    }
  }

  private extractSection(pathParts: string[]): string | undefined {
    // Common Expo doc sections
    const sections = ['guides', 'reference', 'eas', 'versions', 'home', 'learn', 'tutorial', 'get-started'];
    return pathParts.find(part => sections.includes(part.toLowerCase()));
  }

  private extractVersion(pathParts: string[], metadata: any): string | undefined {
    // Look for version in path (e.g., v51.0.0, v50.0.0)
    const versionMatch = pathParts.find(part => /^v?\d+\.\d+\.\d+/.test(part));
    if (versionMatch) return versionMatch;
    
    // Look for 'latest' or 'unversioned'
    const specialVersions = pathParts.find(part => ['latest', 'unversioned'].includes(part));
    if (specialVersions) return specialVersions;
    
    return metadata.version;
  }

  private async downloadDocs() {
    // Dynamic import to avoid circular dependencies
    const { downloadAllDocs } = await import('./download-docs.js');
    await downloadAllDocs();
  }

  async searchDocs(query: string, section?: string, version?: string) {
    await this.ensureInitialized();
    
    const cacheKey = `search_${query}_${section || 'all'}_${version || 'latest'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      if (!this.fuseIndex) {
        throw new Error('Search index not initialized');
      }

      // Prepare search query with fuzzy and partial matching
      const searchQuery = this.prepareSearchQuery(query);
      
      // Filter documents by section and version if specified
      let searchableDocuments = this.documentsIndex;
      if (section || version) {
        searchableDocuments = this.documentsIndex.filter(doc => {
          const sectionMatch = !section || doc.section === section;
          const versionMatch = !version || doc.version === version || version === 'latest';
          return sectionMatch && versionMatch;
        });
      }
      
      // Create a temporary Fuse index if we need to filter
      const fuseOptions = {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'content', weight: 0.3 },
          { name: 'metadata.description', weight: 0.2 },
          { name: 'path', weight: 0.1 }
        ],
        includeScore: true,
        threshold: 0.6,
        ignoreLocation: true,
        useExtendedSearch: true,
        minMatchCharLength: 2
      };
      
      const searchIndex = (section || version) 
        ? new Fuse(searchableDocuments, fuseOptions)
        : this.fuseIndex;
      
      // Perform fuzzy search
      const fuseResults = searchIndex.search(searchQuery);
      
      // Also perform exact and partial matching for better results
      const exactAndPartialResults = this.performExactAndPartialMatching(query, searchableDocuments);
      
      // Combine and deduplicate results
      const combinedResults = this.combineSearchResults(fuseResults, exactAndPartialResults, query);
      
      // Sort by relevance score
      combinedResults.sort((a, b) => b.score - a.score);
      
      const topResults = combinedResults.slice(0, 10);
      let resultText = `# Search Results for "${query}"\\n\\n`;
      
      if (topResults.length === 0) {
        resultText += `No results found in ${section || 'all sections'}${version ? ` (version: ${version})` : ''}.`;
      } else {
        for (const result of topResults) {
          resultText += `## ${result.title}\\n`;
          if (result.section) resultText += `**Section:** ${result.section}\\n`;
          if (result.version) resultText += `**Version:** ${result.version}\\n`;
          resultText += `**Match Score:** ${result.score.toFixed(2)}\\n`;
          resultText += `\\n${result.excerpt}\\n\\n---\\n\\n`;
        }
      }
      
      this.cache.set(cacheKey, resultText);
      return { content: [{ type: 'text', text: resultText }] };
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private prepareSearchQuery(query: string): string {
    const words = query.split(/\s+/).filter(word => word.length > 1);
    
    if (words.length > 1) {
      return words.map(word => `'${word}`).join(' ');
    } else {
      return `'${query}`;
    }
  }

  private performExactAndPartialMatching(query: string, documents: IndexedDocument[]): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
    
    for (const doc of documents) {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      
      // Exact match in title (highest score)
      if (titleLower === queryLower) {
        score += 20;
      } else if (titleLower.includes(queryLower)) {
        score += 15;
      }
      
      // Partial word matching in title
      for (const word of queryWords) {
        if (titleLower.includes(word)) {
          score += 5;
        }
      }
      
      // Exact phrase match in content
      const exactMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
      score += Math.min(exactMatches * 3, 15);
      
      // Partial word matching in content
      for (const word of queryWords) {
        const wordMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
        score += Math.min(wordMatches, 3);
      }
      
      // Code block matches
      const codeBlockRegex = /```[\\s\\S]*?```/g;
      const codeBlocks = doc.content.match(codeBlockRegex) || [];
      for (const block of codeBlocks) {
        const blockLower = block.toLowerCase();
        if (blockLower.includes(queryLower)) {
          score += 4;
        } else {
          for (const word of queryWords) {
            if (blockLower.includes(word)) {
              score += 2;
            }
          }
        }
      }
      
      if (score > 0) {
        results.push({
          path: doc.path,
          title: doc.title,
          excerpt: this.extractExcerpt(doc.content, query, 200),
          section: doc.section,
          version: doc.version,
          score
        });
      }
    }
    
    return results;
  }

  private combineSearchResults(
    fuseResults: Array<{ item: IndexedDocument; score?: number }>,
    exactResults: SearchResult[],
    query: string
  ): SearchResult[] {
    const resultsMap = new Map<string, SearchResult>();
    
    // Add exact and partial results first
    for (const result of exactResults) {
      resultsMap.set(result.path, result);
    }
    
    // Add fuzzy results, combining scores if already exists
    for (const fuseResult of fuseResults) {
      const doc = fuseResult.item;
      const fuzzyScore = (1 - (fuseResult.score || 0)) * 10;
      
      if (resultsMap.has(doc.path)) {
        const existing = resultsMap.get(doc.path)!;
        existing.score = Math.max(existing.score, existing.score * 0.7 + fuzzyScore * 0.3);
      } else {
        resultsMap.set(doc.path, {
          path: doc.path,
          title: doc.title,
          excerpt: this.extractExcerpt(doc.content, query, 200),
          section: doc.section,
          version: doc.version,
          score: fuzzyScore
        });
      }
    }
    
    return Array.from(resultsMap.values());
  }

  private extractExcerpt(content: string, query: string, maxLength: number = 200): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
    
    // Try to find exact match first
    let index = contentLower.indexOf(queryLower);
    
    // If no exact match, look for partial word matches
    if (index === -1 && queryWords.length > 0) {
      for (const word of queryWords) {
        index = contentLower.indexOf(word);
        if (index !== -1) break;
      }
    }
    
    if (index === -1) {
      // If still no match, return beginning of content
      const cleanContent = content.replace(/```[\\s\\S]*?```/g, '').trim();
      return cleanContent.substring(0, maxLength) + '...';
    }
    
    // Find sentence boundaries
    let start = Math.max(0, index - 100);
    let end = Math.min(content.length, index + queryLower.length + 100);
    
    // Adjust to sentence boundaries
    const sentenceStart = content.lastIndexOf('.', start);
    if (sentenceStart !== -1 && sentenceStart > start - 50) {
      start = sentenceStart + 1;
    }
    
    const sentenceEnd = content.indexOf('.', end);
    if (sentenceEnd !== -1 && sentenceEnd < end + 50) {
      end = sentenceEnd + 1;
    }
    
    let excerpt = content.substring(start, end).trim();
    
    // Highlight matching terms
    const highlightTerms = [queryLower, ...queryWords];
    for (const term of highlightTerms) {
      const regex = new RegExp(`(${term})`, 'gi');
      excerpt = excerpt.replace(regex, '**$1**');
    }
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return excerpt;
  }

  async getDocContent(filePath: string) {
    await this.ensureInitialized();
    
    const cacheKey = `content_${filePath}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      const fullPath = path.join(this.docsDir, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const { data, content: mdxContent } = matter(content);
      
      let resultText = '';
      if (data.title) {
        resultText += `# ${data.title}\\n\\n`;
      }
      if (data.description) {
        resultText += `> ${data.description}\\n\\n`;
      }
      
      resultText += mdxContent;
      
      this.cache.set(cacheKey, resultText);
      return { content: [{ type: 'text', text: resultText }] };
    } catch (error) {
      throw new Error(`Failed to fetch content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocByPath(path?: string, version?: string) {
    await this.ensureInitialized();
    
    let searchPath = '';
    if (version && version !== 'latest') searchPath += `**/${version}`;
    if (path) searchPath += `/**/*${path}*`;
    searchPath += '.{md,mdx}';
    
    try {
      const files = await glob(searchPath, { cwd: this.docsDir });
      if (files.length === 0) {
        throw new Error('Document not found');
      }
      
      return await this.getDocContent(files[0]);
    } catch (error) {
      throw new Error(`Failed to find document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listSections(section?: string, version?: string) {
    await this.ensureInitialized();
    
    const cacheKey = `sections_${section || 'all'}_${version || 'latest'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      let pattern = '**/*.{md,mdx}';
      if (section) pattern = `**/${section}/**/*.{md,mdx}`;
      if (version && version !== 'latest') pattern = `**/${version}/**/*.{md,mdx}`;
      
      const files = await glob(pattern, { cwd: this.docsDir });
      const sections = new Map<string, string[]>();
      
      for (const file of files) {
        const pathParts = file.split(path.sep);
        const fileSection = this.extractSection(pathParts) || 'general';
        const metadata = this.docsIndex.get(file);
        const title = metadata?.title || path.basename(file, path.extname(file));
        
        if (!sections.has(fileSection)) {
          sections.set(fileSection, []);
        }
        sections.get(fileSection)!.push(title);
      }
      
      let resultText = `# Available sections${section ? ` in ${section}` : ''}${version ? ` (version: ${version})` : ''}\\n\\n`;
      
      for (const [sectionName, topics] of sections) {
        resultText += `## ${sectionName}\\n`;
        for (const topic of topics.slice(0, 15)) {
          resultText += `- ${topic}\\n`;
        }
        if (topics.length > 15) {
          resultText += `- ... and ${topics.length - 15} more\\n`;
        }
        resultText += '\\n';
      }
      
      this.cache.set(cacheKey, resultText);
      return { content: [{ type: 'text', text: resultText }] };
    } catch (error) {
      throw new Error(`Failed to list sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getApiReference(module: string, version?: string) {
    await this.ensureInitialized();
    
    const cacheKey = `api_${module}_${version || 'latest'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      // Look for API reference files
      let searchPatterns = [
        `**/*${module}*.{md,mdx}`,
        `**/reference/**/*${module}*.{md,mdx}`,
        `**/sdk/**/*${module}*.{md,mdx}`
      ];
      
      if (version && version !== 'latest') {
        searchPatterns = searchPatterns.map(pattern => `**/${version}/${pattern}`);
      }
      
      let files: string[] = [];
      for (const pattern of searchPatterns) {
        const foundFiles = await glob(pattern, { cwd: this.docsDir });
        files.push(...foundFiles);
      }
      
      if (files.length === 0) {
        throw new Error(`API reference for ${module} not found`);
      }
      
      // Return the first match (most relevant)
      return await this.getDocContent(files[0]);
    } catch (error) {
      throw new Error(`Failed to fetch API reference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQuickStart(platform?: string) {
    await this.ensureInitialized();
    
    const cacheKey = `quickstart_${platform || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      // Look for quick start files
      const possiblePaths = [
        'get-started/**/*.{md,mdx}',
        'tutorial/**/*.{md,mdx}',
        '**/introduction*.{md,mdx}',
        '**/getting-started*.{md,mdx}',
        '**/quickstart*.{md,mdx}'
      ];
      
      let files: string[] = [];
      for (const pattern of possiblePaths) {
        const foundFiles = await glob(pattern, { cwd: this.docsDir });
        files.push(...foundFiles);
      }
      
      if (files.length > 0) {
        return await this.getDocContent(files[0]);
      }
      
      // Fallback to searching for quickstart content
      return await this.searchDocs('getting started introduction', undefined, 'latest');
    } catch (error) {
      throw new Error(`Failed to get quick start: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}