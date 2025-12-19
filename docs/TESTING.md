# QuestLegends OS - Testing Guide

## Running Tests

### Unit Tests
```bash
npm test                    # Run all tests
npm test -- --coverage      # Run with coverage report
npm test calculations       # Run specific test file
npm test -- --watch        # Watch mode for development
```

### Test Coverage Requirements
- Minimum 85% coverage for critical modules
- All calculation functions must have 100% coverage
- All business logic must be tested

## Test Structure

### Unit Tests
Located in `lib/*.test.ts` files next to the implementation.

**Calculation Tests** (`lib/calculations.test.ts`)
- Test all calculation functions with various inputs
- Test edge cases (zero, negative, decimals)
- Test error handling
- Integration test for complete game flow

### Integration Tests
Located in `tests/integration/` directory.

**API Integration Tests**
- Test complete API endpoints
- Test database interactions
- Test webhook delivery
- Test notification system

### Performance Tests
Located in `tests/performance/` directory.

**Load Tests**
- Test analytics endpoints with 100k+ transactions
- Measure response times
- Identify bottlenecks

## Test Data

### Seed Data
```bash
npm run seed              # Load test data
npm run seed:clean        # Clean and reload
```

### Test Scenarios

**Standard Game Scenario**
- Participants: 10
- Check per person: 5,000₽
- Animators: 2 (3,000₽ each)
- Host: 5,000₽
- DJ: 4,000₽
- Expected revenue: 50,000₽
- Expected FOT: 15,000₽
- Expected royalty: 3,500₽
- Expected profit: 31,500₽

## Coverage Reports

Coverage reports are generated in `coverage/` directory.

View HTML report: `open coverage/lcov-report/index.html`

## CI/CD

Tests run automatically on:
- Pull requests
- Commits to main branch
- Scheduled daily runs

All PRs must pass tests before merge.
