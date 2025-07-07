# Expo Docs MCP Server

A Model Context Protocol (MCP) server that provides access to Expo documentation with advanced search and navigation capabilities.

## Features

- 🔍 **Search Documentation**: Search through Expo docs with section and version filtering
- 📄 **Full Content Access**: Get complete documentation pages by URL or path
- 📚 **Browse Sections**: List available documentation sections and topics
- 🛠️ **API References**: Access detailed API documentation for Expo SDK modules
- 🚀 **Quick Start Guides**: Platform-specific getting started guides
- 📦 **Version Support**: Access documentation for different SDK versions
- 💾 **Smart Caching**: 1-week cache for optimal performance
- 📱 **Offline First**: Downloads and indexes documentation locally for fast, reliable access
- 🔎 **Fuzzy Search**: Advanced search with exact, partial, and fuzzy matching

## Installation

```bash
npm install expo-docs-mcp
```

Or use with npx:

```bash
npx expo-docs-mcp
```

## Configuration

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "expo-docs": {
      "command": "npx",
      "args": ["expo-docs-mcp"]
    }
  }
}
```

## Available Tools

### 1. `search_expo_docs`
Search through Expo documentation.

**Parameters:**
- `query` (required): Search query
- `section` (optional): Documentation section (`home`, `guides`, `eas`, `reference`, `learn`, `versions`)
- `version` (optional): SDK version (e.g., `latest`, `v51.0.0`, `v50.0.0`)

### 2. `get_expo_doc_content`
Get the full content of a specific documentation page.

**Parameters:**
- `url` (optional): Full URL of the documentation page
- `path` (optional): Path within docs (e.g., `guides/routing`)
- `version` (optional): SDK version

### 3. `list_expo_sections`
List all available documentation sections and topics.

**Parameters:**
- `section` (optional): Section to list contents for
- `version` (optional): SDK version

### 4. `get_expo_api_reference`
Get API reference for a specific Expo SDK module.

**Parameters:**
- `module` (required): Module name (e.g., `expo-camera`, `expo-location`)
- `version` (optional): SDK version

### 5. `get_expo_quick_start`
Get quick start guide for Expo.

**Parameters:**
- `platform` (optional): Target platform (`ios`, `android`, `web`, `all`)

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/ah2-io/expo-docs-mcp.git
cd expo-docs-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Watch mode for development  
- `npm start` - Run the built server
- `npm run download-docs` - Download and cache Expo documentation
- `npm run init` - Build and download docs (first-time setup)

### Project Structure

```
├── src/
│   ├── index.ts                    # MCP server setup and tool handlers
│   ├── offline-docs-fetcher.ts     # Offline documentation management and search
│   ├── download-docs.ts            # Documentation download from GitHub
│   └── expo-docs-fetcher.ts        # Online documentation fetching (legacy)
├── docs-cache/                     # Downloaded documentation files
├── dist/                           # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## How It Works

1. **Documentation Download**: On first run, downloads Expo documentation from GitHub (expo/expo repository)
2. **Local Indexing**: Builds a searchable index of all documentation files with metadata extraction
3. **Fuzzy Search**: Provides multiple search strategies including exact matching, partial matching, and fuzzy search
4. **Smart Caching**: Caches search results and content for 1 week to improve performance
5. **Offline Operation**: Works entirely offline after initial documentation download

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## About

This MCP server is developed by [ah2.io](https://ah2.io), a software development company focused on building innovative tools and solutions for developers and businesses.