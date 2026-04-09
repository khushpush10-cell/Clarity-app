# Contributing

## Branching

- Use feature branches from `main`
- Keep pull requests focused and small where possible

## Local Checks

Run before opening a PR:

```bash
npm run format
npm run check
npm run test
```

## Coding Guidelines

- TypeScript strict mode only
- Prefer server-side auth and authorization checks
- Keep components composable and accessible
- Add tests for business logic and critical flows
