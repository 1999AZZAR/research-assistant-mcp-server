# Contributing to Research MCP Server

This document provides guidelines for contributing to the Research MCP Server project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Code Standards](#code-standards)
- [Contribution Workflow](#contribution-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Code Review](#code-review)
- [Issue Reporting](#issue-reporting)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

- Node.js ≥18.0.0
- npm or yarn package manager
- TypeScript compiler
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:

   ```bash
   git clone https://github.com/your-username/research-mcp-server.git
   cd research-mcp-server
   ```

3. Add the upstream remote:

   ```bash
   git remote add upstream https://github.com/original-owner/research-mcp-server.git
   ```

4. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Environment

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment (optional):

   ```bash
   cp .env.example .env
   # Edit .env with your API keys for testing
   ```

3. Run in development mode:

   ```bash
   npm run dev
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production-ready TypeScript compilation |
| `npm run start` | Run production server from built files |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint for code quality checks |
| `npm run clean` | Remove build artifacts and caches |

### Project Structure

```
research-mcp-server/
├── src/
│   ├── __tests__/           # Test files
│   ├── config.ts           # Configuration management
│   ├── googleSearchService.ts  # Google Search integration
│   ├── wikipediaService.ts     # Wikipedia integration
│   ├── analysisEngine.ts       # Built-in analysis tools
│   ├── research-server.ts      # Main server implementation
│   └── types.d.ts             # Type definitions
├── dist/                     # Compiled JavaScript output
├── index.ts                  # Server entry point
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation
```

## Code Standards

### TypeScript Guidelines

- Use strict type checking
- Define interfaces for complex objects
- Use union types for related variants
- Avoid `any` type except when necessary
- Document complex type definitions

### Code Style

- Follow ESLint configuration
- Use consistent naming conventions
- Maintain 2-space indentation
- Limit line length to 100 characters
- Use semicolons

### Naming Conventions

- Classes: PascalCase
- Functions/methods: camelCase
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces: PascalCase with 'I' prefix
- Types: PascalCase

### Error Handling

- Use try-catch blocks for external API calls
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases gracefully
- Validate input parameters

## Contribution Workflow

### Branch Naming

Use descriptive branch names following this pattern:

- `feature/description-of-feature`
- `bugfix/issue-description`
- `docs/update-documentation`
- `refactor/component-name`

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `chore`: Maintenance tasks

Examples:
- `feat: add sentiment analysis tool`
- `fix: resolve Wikipedia API timeout issue`
- `docs: update configuration examples`

### Pull Request Guidelines

1. Ensure all tests pass: `npm test`
2. Run linting: `npm run lint`
3. Update documentation if needed
4. Write clear PR description
5. Reference related issues
6. Keep PR focused on single feature/bug

## Testing Guidelines

### Test Structure

- Unit tests in `src/__tests__/`
- Test files named `*.test.ts`
- Use descriptive test names
- Cover happy path and error cases
- Mock external API calls

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test/file

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- Aim for high test coverage
- Test critical functionality
- Include integration tests for API interactions
- Test error conditions and edge cases

### Test Examples

```typescript
describe('GoogleSearchService', () => {
  it('should return search results', async () => {
    const service = new GoogleSearchService();
    const results = await service.search('test query');
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    const service = new GoogleSearchService();
    // Mock API failure
    await expect(service.search('')).rejects.toThrow();
  });
});
```

## Documentation

### Code Documentation

- Use JSDoc comments for functions and classes
- Document parameters and return types
- Explain complex logic
- Include usage examples where helpful

```typescript
/**
 * Searches Google using Custom Search API
 * @param query - Search query string
 * @param options - Search options
 * @returns Promise resolving to search results
 */
async function searchGoogle(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  // Implementation
}
```

### README Updates

- Update README.md for new features
- Include usage examples
- Document configuration options
- Update tool and resource lists

### API Documentation

- Document all public methods
- Include parameter descriptions
- Provide return value information
- Note any side effects

## Pull Request Process

### Before Submitting

1. **Rebase** on latest main branch:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run quality checks**:

   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. **Update documentation** if needed

4. **Write clear commit messages**

### PR Template

Use this structure for PR descriptions:

```
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing performed and results.

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Breaking changes documented
```

### PR Review Process

1. **Automated checks** run first
2. **Maintainer review** for code quality
3. **Testing verification** by reviewer
4. **Approval and merge** or requested changes

## Code Review

### Review Criteria

- **Functionality**: Code works as intended
- **Code Quality**: Follows project standards
- **Performance**: No performance regressions
- **Security**: No security vulnerabilities
- **Testing**: Adequate test coverage
- **Documentation**: Code and docs updated

### Review Comments

- Be constructive and specific
- Suggest improvements, don't just criticize
- Reference coding standards
- Ask questions for clarification
- Acknowledge good practices

### Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] Error handling is comprehensive
- [ ] Tests are included and pass
- [ ] Documentation is updated
- [ ] No breaking changes without justification
- [ ] Performance impact considered
- [ ] Security implications reviewed

## Issue Reporting

### Bug Reports

Include these details in bug reports:

- **Title**: Clear, descriptive title
- **Description**: Steps to reproduce
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Node.js version, OS, etc.
- **Logs**: Error messages or relevant logs

### Feature Requests

Include these details in feature requests:

- **Title**: Clear feature description
- **Problem**: Current limitation or need
- **Solution**: Proposed implementation
- **Alternatives**: Other approaches considered
- **Impact**: Expected benefit or use case

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation issue
- `question`: Further information needed
- `wontfix`: Will not be implemented

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Maintain professional communication
- Respect differing viewpoints
- Help newcomers learn

### Communication

- Use clear, professional language
- Provide context for questions
- Be patient with responses
- Share knowledge generously
- Acknowledge contributions

### Recognition

Contributors are recognized through:
- GitHub contributor statistics
- Attribution in release notes
- Mention in documentation
- Community acknowledgments

---

Thank you for contributing to the Research MCP Server project!
