.PHONY: verify test build lint typecheck unit integration coverage e2e

# Verificación completa: lint, tipos, pruebas de Vitest y build (escribe reports/verification.json).
verify:
	npm run verify

test:
	npm test

build:
	npm run build

lint:
	npm run lint

typecheck:
	npm run typecheck

unit:
	npm run test:unit

integration:
	npm run test:integration

coverage:
	npm run test:coverage

# Requiere `npm run build` previo y Chromium (npx playwright install chromium).
e2e:
	npm run test:e2e
