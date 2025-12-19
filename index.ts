import SimpleResearchMCPServer from './research-server.js';

async function main() {
  try {
    const server = new SimpleResearchMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();
