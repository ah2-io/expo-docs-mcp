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

### Project Structure

```
├── src/
│   ├── index.ts              # MCP server setup and tool handlers
│   └── expo-docs-fetcher.ts  # Documentation fetching logic
├── dist/                      # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## How It Works

1. **Documentation Fetching**: The server fetches documentation from docs.expo.dev
2. **HTML to Markdown**: Converts HTML content to clean Markdown for better readability
3. **Smart Caching**: Caches responses for 1 week to reduce API calls and improve performance
4. **Version Support**: Handles different SDK versions through URL path manipulation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

Inspired by the [Amplify Gen1 MCP Server](https://github.com/danlmarmot/amplify-gen1-mcp-server) architecture.