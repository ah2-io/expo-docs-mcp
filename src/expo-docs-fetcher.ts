import axios from 'axios';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';
import TurndownService from 'turndown';

export class ExpoDocsFetcher {
  private cache: NodeCache;
  private turndownService: TurndownService;
  private readonly baseUrl = 'https://docs.expo.dev';
  
  constructor() {
    // Cache for 1 week (7 days * 24 hours * 60 minutes * 60 seconds)
    this.cache = new NodeCache({ stdTTL: 604800 });
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
  }

  async searchDocs(query: string, section?: string, version?: string) {
    const cacheKey = `search_${query}_${section || 'all'}_${version || 'latest'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      // Build search URL
      let searchUrl = this.baseUrl;
      if (version && version !== 'latest') {
        searchUrl += `/versions/${version}`;
      }
      if (section) {
        searchUrl += `/${section}`;
      }

      const response = await axios.get(searchUrl);
      const $ = cheerio.load(response.data);

      // Extract relevant content based on search query
      const results: string[] = [];
      
      // Search in headings
      $('h1, h2, h3, h4, h5, h6').each((_, element) => {
        const text = $(element).text();
        if (text.toLowerCase().includes(query.toLowerCase())) {
          results.push(`## ${text}`);
          const nextContent = $(element).nextUntil('h1, h2, h3, h4, h5, h6').first();
          if (nextContent.length) {
            results.push(this.turndownService.turndown(nextContent.html() || ''));
          }
        }
      });

      // Search in paragraphs and content
      $('p, li, td').each((_, element) => {
        const text = $(element).text();
        if (text.toLowerCase().includes(query.toLowerCase())) {
          results.push(this.turndownService.turndown($(element).html() || ''));
        }
      });

      // Search in code blocks
      $('pre, code').each((_, element) => {
        const text = $(element).text();
        if (text.toLowerCase().includes(query.toLowerCase())) {
          results.push('```\\n' + text + '\\n```');
        }
      });

      const searchResults = results.slice(0, 10).join('\\n\\n');
      const resultText = searchResults || `No results found for "${query}" in ${section || 'all sections'}${version ? ` (version: ${version})` : ''}`;

      this.cache.set(cacheKey, resultText);
      return { content: [{ type: 'text', text: resultText }] };
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocContent(url: string) {
    const cacheKey = `content_${url}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Remove navigation, footer, and other non-content elements
      $('nav, footer, .navbar, .sidebar, .breadcrumb, .pagination, header').remove();

      // Extract main content
      const mainContent = $('main, .main-content, .content, article, [role="main"]').first();
      const content = mainContent.length ? mainContent : $('body');

      // Convert to markdown
      const markdown = this.turndownService.turndown(content.html() || '');
      
      this.cache.set(cacheKey, markdown);
      return { content: [{ type: 'text', text: markdown }] };
    } catch (error) {
      throw new Error(`Failed to fetch content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocByPath(path?: string, version?: string) {
    let url = this.baseUrl;
    if (version && version !== 'latest') {
      url += `/versions/${version}`;
    }
    if (path) {
      url += `/${path}`;
    }

    return await this.getDocContent(url);
  }

  async listSections(section?: string, version?: string) {
    const cacheKey = `sections_${section || 'all'}_${version || 'latest'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      let url = this.baseUrl;
      if (version && version !== 'latest') {
        url += `/versions/${version}`;
      }
      if (section) {
        url += `/${section}`;
      }

      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const sections: string[] = [];
      
      // Look for navigation links or section headers
      $('nav a, .nav-link, .sidebar a, .menu a, aside a').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        if (href && text && !href.startsWith('http') && !href.startsWith('#')) {
          sections.push(`- [${text}](${this.baseUrl}${href})`);
        }
      });

      // Look for main content sections
      if (sections.length === 0) {
        $('h1, h2, h3').each((_, element) => {
          const text = $(element).text().trim();
          if (text) {
            sections.push(`- ${text}`);
          }
        });
      }

      const sectionsList = sections.length > 0 
        ? sections.slice(0, 30).join('\\n')
        : 'No sections found';

      const result = `# Available sections${section ? ` in ${section}` : ''}${version ? ` (version: ${version})` : ''}\\n\\n${sectionsList}`;
      
      this.cache.set(cacheKey, result);
      return { content: [{ type: 'text', text: result }] };
    } catch (error) {
      throw new Error(`Failed to list sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getApiReference(module: string, version?: string) {
    const cacheKey = `api_${module}_${version || 'latest'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      let url = `${this.baseUrl}/versions/${version || 'latest'}/sdk/${module}/`;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Remove navigation and other non-content elements
      $('nav, footer, .navbar, .sidebar, .breadcrumb, .pagination, header').remove();

      // Extract API documentation
      const mainContent = $('main, .main-content, .content, article, [role="main"]').first();
      const content = mainContent.length ? mainContent : $('body');

      // Convert to markdown
      const markdown = this.turndownService.turndown(content.html() || '');
      
      this.cache.set(cacheKey, markdown);
      return { content: [{ type: 'text', text: markdown }] };
    } catch (error) {
      // Try without trailing slash
      try {
        const altUrl = `${this.baseUrl}/versions/${version || 'latest'}/sdk/${module}`;
        const response = await axios.get(altUrl);
        const $ = cheerio.load(response.data);

        $('nav, footer, .navbar, .sidebar, .breadcrumb, .pagination, header').remove();
        const mainContent = $('main, .main-content, .content, article, [role="main"]').first();
        const content = mainContent.length ? mainContent : $('body');
        const markdown = this.turndownService.turndown(content.html() || '');
        
        this.cache.set(cacheKey, markdown);
        return { content: [{ type: 'text', text: markdown }] };
      } catch {
        throw new Error(`Failed to fetch API reference for ${module}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async getQuickStart(platform?: string) {
    const cacheKey = `quickstart_${platform || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { content: [{ type: 'text', text: cached as string }] };
    }

    try {
      const url = `${this.baseUrl}/get-started/introduction/`;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Remove navigation and other non-content elements
      $('nav, footer, .navbar, .sidebar, .breadcrumb, .pagination, header').remove();

      // Extract main content
      const mainContent = $('main, .main-content, .content, article, [role="main"]').first();
      const content = mainContent.length ? mainContent : $('body');

      // If platform specified, try to filter content
      if (platform && platform !== 'all') {
        const platformSpecificContent: string[] = [];
        content.find('h1, h2, h3, h4, h5, h6, p, li, pre').each((_, element) => {
          const text = $(element).text();
          if (text.toLowerCase().includes(platform.toLowerCase())) {
            platformSpecificContent.push(this.turndownService.turndown($(element).html() || ''));
          }
        });
        
        if (platformSpecificContent.length > 0) {
          const filteredMarkdown = platformSpecificContent.join('\\n\\n');
          this.cache.set(cacheKey, filteredMarkdown);
          return { content: [{ type: 'text', text: filteredMarkdown }] };
        }
      }

      // Convert to markdown
      const markdown = this.turndownService.turndown(content.html() || '');
      
      this.cache.set(cacheKey, markdown);
      return { content: [{ type: 'text', text: markdown }] };
    } catch (error) {
      throw new Error(`Failed to fetch quick start guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}