# GitHub Copilot Instructions

These instructions define how GitHub Copilot should assist with this TypeScript monorepo project. The goal is to ensure consistent, high-quality code generation aligned with TypeScript conventions, modern tooling, security best practices, and our architecture standards.

## Context

- **Project Type**: Web libraries / Node Libraries
- **Language**: TypeScript with strict type checking
- **Framework / Libraries**: Typescript / Vitest
- **Architecture**: Monorepo with modules found under "packages" folder, dependencies managed by `pnpm`, and workspace integration with pnpm
- **Build Tools**: RSBuild for web apps, Vite for components, Biome for linting/formatting
- **Package Manager**: pnpm with workspace support

## Security-First Development (OWASP Guidelines)

**Security is a primary concern. Always choose the more secure option and explain the reasoning.**

### Access Control & Authentication
- **Principle of Least Privilege**: Always default to the most restrictive permissions and explicitly grant access only when needed
- **Deny by Default**: All access control decisions must follow a "deny by default" pattern

### Security Headers & Configuration
- **Security Headers**: Implement CSP, HTTP Strict Transport Security, X-Content-Type-Options headers
- **Up-to-Date Dependencies**: Use latest stable versions and run security audits regularly
- **Secure Defaults**: Disable verbose error messages and debug features in production
- **No Sensitive Data in Logs**: Never log sensitive information or secrets

## TypeScript & Code Quality Guidelines

- Use idiomatic TypeScript with strict type checking enabled
- Prefer `interface` over `type` for object shapes, `type` for unions and computed types
- Follow the project's `tsconfig.json` strict mode settings
- Use TypeScript's built-in utility types (`Partial`, `Pick`, `Omit`, etc.)
- Prefer named functions for better debugging and testability
- Use `async/await` over raw Promises and avoid `.then().catch()` chains
- Keep files small, focused, and well-organized (< 200 lines when possible)
- Use descriptive variable and function names that explain intent
- Never use `any` unless absolutely necessary; prefer `unknown` for unknown types
- Use proper error handling with typed errors when possible

### Import/Export Standards
- Use ES6 `import` statements for modules, never `require`
- Use ES6 `export` for module exports, never `module.exports`
- Prefer named exports over default exports for better tree-shaking
- Use absolute imports with path mapping when configured

### Monorepo Management
- Do not create or update changelog files (`CHANGELOG.md`): handled by release process automatically
- When creating/deleting packages, update both `release-please-config.json` and `.release-please-manifest.json`
- Do not add dev dependencies to `package.json` files unless explicitly requested
- Use workspace protocol (`workspace:*`) for internal package dependencies
- Maintain consistent package structure across workspace packages

### Version Control Standards
Use Angular-style commit messages and PR titles:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to build process or auxiliary tools
- `security`: Security-related changes

## Architecture & Design Patterns

### Patterns to Follow
- **Dependency Injection**: Use clear dependency injection patterns for testability
- **Separation of Concerns**: Separate business logic, UI components, and data access
- **SOLID Principles**: Follow Single Responsibility, Open/Closed, Interface Segregation, and Dependency Inversion
- **Clean Architecture**: Organize code in layers with clear boundaries and dependencies
- **Configuration Management**: Store config and secrets in `.env` files and load with proper environment variable handling with `dotenv`
- **Error Boundaries**: Implement proper error handling and recovery mechanisms
- **Immutable Data Patterns**: Prefer immutable data structures and functional programming concepts

### Patterns to Avoid
- Avoid using `any` type unless absolutely necessary; prefer `unknown` for unknown types
- Avoid deeply nested callbacks or overly complex code
- Do not commit hardcoded secrets, API keys, or tokens
- Avoid global state unless using proper state management (React Context, etc.)
- Avoid large components; break them into smaller, focused components
- Avoid side effects in pure functions
- Do not ignore TypeScript compiler errors or warnings

## Performance Optimization

### Frontend Performance
- **Image Optimization**: Use modern formats (WebP, AVIF), proper sizing, and lazy loading
- **Bundle Optimization**: Use code splitting, tree shaking, and dynamic imports
- **Caching Strategies**: Implement proper HTTP caching headers and service worker caching
- **Minimize DOM Manipulation**: Batch DOM updates and use virtual DOM efficiently
- **CSS Performance**: Use CSS-in-JS efficiently, avoid inline styles, prefer CSS classes
- **Memory Management**: Clean up event listeners, intervals, and prevent memory leaks

### JavaScript/TypeScript Performance
- **Efficient Data Structures**: Use Maps/Sets for lookups, appropriate collections for use cases
- **Debounce/Throttle**: Use for expensive operations triggered by user events
- **Avoid Blocking Main Thread**: Use Web Workers for CPU-intensive tasks
- **Optimize Renders**: Use React.memo, useMemo, useCallback judiciously
- **Efficient Algorithms**: Choose appropriate algorithms and data structures (avoid O(n²) when possible)

## Testing Strategy (Vitest)

### Testing Philosophy
- Write tests for business logic, not implementation details
- Test behavior, not internal structure
- Aim for high test coverage (80%+) but focus on critical paths
- Write tests that are maintainable and provide value

### Testing Types
- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test component interactions and data flow
- **End-to-End Tests**: Test complete user workflows (when applicable)
- **Snapshot Tests**: Use sparingly, only for stable UI components

### Vitest Best Practices
- Use `describe` and `it` blocks for clear test organization
- Mock external dependencies using `vi.mock()` for unit tests
- Use `beforeEach`/`afterEach` for setup/cleanup
- Test both success and error paths
- Use meaningful test names that describe the expected behavior
- Prefer explicit assertions over implicit ones
- Use `toThrow` for error testing, `toBe` for exact matches, `toEqual` for deep equality

### React Testing
- Test component behavior, not implementation
- Use React Testing Library patterns for component testing
- Test user interactions and accessibility features
- Mock API calls and external services
- Test error boundaries and loading states

## Monitoring & Observability

### Error Handling
- Implement global error boundaries for React applications
- Use typed error handling with proper error types
- Log errors with sufficient context for debugging
- Implement graceful degradation for non-critical failures
- Use circuit breaker patterns for external service calls
- Provide meaningful error messages to users

## Documentation Standards

### Code Documentation
- Use JSDoc for complex functions and public APIs
- Write self-documenting code with clear naming conventions
- Document architectural decisions with ADRs (Architecture Decision Records)
- Maintain up-to-date README files for each package
- Include examples in documentation
- Document configuration options and environment variables

## Accessibility & Inclusive Design

### React Accessibility
- Use semantic HTML elements appropriately
- Implement proper ARIA attributes and roles
- Ensure keyboard navigation works for all interactive elements
- Provide alt text for images and descriptive text for icons
- Implement proper color contrast ratios

### Inclusive Design Principles
- Design for users with disabilities from the start
- Use clear and simple language
- Ensure compatibility with assistive technologies

## Definition of Done

### Code Quality
- All code must pass TypeScript compilation without errors
- Code passes linting and formatting checks (`pnpm lint`)
- All tests pass with at least 80% coverage (`pnpm test` and `pnpm test:coverage`)
- Build succeeds without errors (`pnpm build`)
- Security scans pass without critical vulnerabilities
- Code follows established architectural patterns and conventions

### Documentation & Review
- Code changes include necessary documentation updates
- Architecture decisions documented in ADRs when applicable
- Performance implications considered and documented

### Testing & Quality Assurance
- Unit tests must be written for new functionality and bug fixes
- Existing tests should not be broken by changes and should not have to be updated or removed
- Integration tests cover critical user flows
- Accessibility requirements verified
- Performance impact assessed for significant changes

## Continuous Improvement

### Iteration & Review Process
- Conduct retrospectives to identify improvement areas

### Learning & Knowledge Sharing
- Share architectural decisions and lessons learned
- Document common patterns and anti-patterns

## Communication Style
- Use clear and concise language in all communications
- Avoid sycophancy and excessive flattery, eg avoid phrases like "You're absolutely right!" or "That's a brilliant idea!"
