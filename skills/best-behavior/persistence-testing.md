# Persistence Testing

Infrastructure tests for repositories, query layers, or anything that talks to a real database. The pattern: boot a containerized database once (via `testcontainers`), expose it through a `globalContext`, and wrap it in a per-example `TestDatabase` that resets state and exposes repository operations as methods.

Assumes familiarity with `contexts.md`.

## Project structure

```
/behaviors
  /infra
    /*.behavior.ts               # repository behavior files
    /helpers
      /dbContext.ts              # testcontainers-backed global context
      /testableDatabase.ts       # per-example wrapper: reset + repo methods
      /matchers.ts               # custom great-expectations matchers
  /best.infra.config.ts          # infra-specific config
/best.config.ts                  # shared defaults
```

A separate config file keeps infra tests from running in your default command and lets you add per-suite coverage or reporter settings.

## Config

```ts
// best.config.ts
import { defineConfig } from "best-behavior/run"
export default defineConfig({
  viteConfig: "./behaviors/vite.config.ts",
  failFast: true
})
```

```ts
// behaviors/best.infra.config.ts
import { defineConfig } from "best-behavior/run"
import { MonocartCoverageReporter } from "best-behavior/coverage"
import { databaseContext } from "./infra/helpers/dbContext"
import defaultConfig from "../best.config"

export default defineConfig({
  ...defaultConfig,
  behaviorGlobs: ["./behaviors/infra/**/*.behavior.ts"],
  context: databaseContext(),
  coverageReporter: new MonocartCoverageReporter({
    reports: ["raw"],
    outputDir: "./coverage-reports/infra",
    entryFilter: { "/src": true }
  })
})
```

## The global database context

Start the container once per run and run migrations; reset data at the per-example layer. This keeps the expensive part (container boot + schema creation) amortized across the suite.

```ts
// dbContext.ts
import { PrismaClient } from "../../../generated/prisma"
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { Context, globalContext, use } from "best-behavior"
import { execSync } from "node:child_process"

export function databaseContext(): Context<TestPostgresDB> {
  return {
    init: async () => {
      const db = new TestPostgresDB()
      await db.start()
      return db
    },
    teardown: (db) => db.stop()
  }
}

export function useDatabase<T>(
  context: Context<T, TestPostgresDB>
): Context<T> {
  return use(globalContext<TestPostgresDB>(), context)
}

export class TestPostgresDB {
  private container: StartedPostgreSqlContainer | undefined
  private client: PrismaClient | undefined

  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer("postgres:17.2-alpine").start()
    execSync("node_modules/.bin/prisma migrate reset --force --skip-seed", {
      env: { ...process.env, DATABASE_URL: this.container.getConnectionUri() }
    })
  }

  getConnectionUri(): string | undefined {
    return this.container?.getConnectionUri()
  }

  get prisma(): PrismaClient {
    if (!this.client) {
      this.client = new PrismaClient({ datasourceUrl: this.getConnectionUri() })
    }
    return this.client
  }

  async stop(): Promise<void> {
    await this.container?.stop()
  }
}
```

## The per-example wrapper

Every example gets a fresh `TestDatabase` that (a) resets tables before the example runs, and (b) exposes the operations that examples need, both as fixture helpers (`withEntity`) and as subject-under-test entry points (`createEntity`, `getEntity`, ...).

```ts
// testableDatabase.ts
import { Context } from "best-behavior"
import { TestPostgresDB, useDatabase } from "./dbContext"
import { YourRepository } from "@/infrastructure/yourRepository"

export const testableDatabase: Context<TestDatabase> = useDatabase({
  init: async (db) => {
    const wrapper = new TestDatabase(db)
    await wrapper.reset()
    return wrapper
  }
})

class TestDatabase {
  private createdEntities = new Map<string, string>()
  constructor(private db: TestPostgresDB) {}

  async reset() {
    await this.db.prisma.yourTable.deleteMany()
  }

  // Fixture helpers (used in `suppose`)
  async withEntity(params: EntityParams) {
    const created = await this.db.prisma.yourTable.create({ data: params })
    this.createdEntities.set(created.name, created.id)
  }
  getCreatedEntityId(name: string) { return this.createdEntities.get(name)! }

  // Subject-under-test wrappers (used in `perform`/`observe`)
  createEntity(params: EntityParams) {
    return new YourRepository(this.db.prisma).create(params)
  }
  getEntity(id: string) {
    return new YourRepository(this.db.prisma).get(id)
  }
  updateEntity(entity: Entity) {
    return new YourRepository(this.db.prisma).save(entity)
  }
  deleteEntity(entity: Entity) {
    return new YourRepository(this.db.prisma).delete(entity)
  }
}
```

**Note:** the `reset()` at the top of each example is what keeps examples isolated despite sharing the container. Don't skip it.

## Custom matchers

Small, domain-specific matchers keep effects readable:

```ts
// matchers.ts
import { Matcher, objectWithProperty } from "great-expectations"

export function errorWithMessage<X extends { message: string }>(
  expected: Matcher<string>
): Matcher<X> {
  return objectWithProperty("message", expected)
}

export function entityWithName<X extends { name: string }>(
  expected: Matcher<string>
): Matcher<X> {
  return objectWithProperty("name", expected)
}
```

## Writing the behavior

```ts
import { behavior, example, fact, step, effect } from "best-behavior"
import { expect, equalTo, is, objectWith, arrayWith, resolvesTo } from "great-expectations"
import { testableDatabase } from "./helpers/testableDatabase"

export default behavior("EntityRepository", [

  example(testableDatabase)
    .description("creates a new entity")
    .script({
      perform: [
        step("a new entity is created", async (db) => {
          await db.createEntity({ name: "Test Entity", value: 123 })
        })
      ],
      observe: [
        effect("the entity is stored", async (db) => {
          const entities = await db.getAllEntities()
          expect(entities, is(arrayWith([
            objectWith({ name: equalTo("Test Entity"), value: equalTo(123) })
          ])))
        })
      ]
    }),

  example(testableDatabase)
    .description("retrieves an entity by id")
    .script({
      suppose: [
        fact("an entity exists", async (db) => {
          await db.withEntity({ name: "Test Entity", value: 1 })
        })
      ],
      observe: [
        effect("the entity is returned by id", async (db) => {
          const id = db.getCreatedEntityId("Test Entity")
          await expect(
            db.getEntity(id),
            resolvesTo(objectWith({ name: equalTo("Test Entity") }))
          )
        })
      ]
    }),

  example(testableDatabase)
    .description("deletes an entity")
    .script({
      suppose: [
        fact("an entity exists", async (db) => {
          await db.withEntity({ name: "Test Entity", value: 1 })
        })
      ],
      perform: [
        step("the entity is deleted", async (db) => {
          const id = db.getCreatedEntityId("Test Entity")
          const entity = await db.getEntity(id)
          await db.deleteEntity(entity)
        })
      ],
      observe: [
        effect("the entity is no longer retrievable", async (db) => {
          const id = db.getCreatedEntityId("Test Entity")
          await expect(db.getEntity(id), resolvesTo(null))
        })
      ]
    })

])
```

## Container variants

Swap the postgres container for another driver as needed:

```ts
// MySQL
import { MySqlContainer } from "@testcontainers/mysql"
new MySqlContainer("mysql:8.0").start()

// MongoDB
import { MongoDBContainer } from "@testcontainers/mongodb"
new MongoDBContainer("mongo:6.0").start()

// Redis
import { RedisContainer } from "@testcontainers/redis"
new RedisContainer("redis:7.0").start()
```

## What to test

Useful coverage for a repository test suite:
- CRUD round-trips
- Query filters, sort order, pagination
- Error paths (not found, unique-constraint violation, foreign-key violation)
- Transaction semantics (if the repository exposes them)
- Authorization scoping, if your repository enforces it

## Gotchas

- **Don't reuse the `PrismaClient` lazily across container restarts.** The `TestPostgresDB` caches the client against the current connection URI. If you ever `stop()` and re-`start()` within a run (don't), invalidate the cache.
- **`prisma migrate reset` is destructive.** That's the point, but only run it against the ephemeral container. Never point these tests at a shared database.
- **Container startup is slow (5-15s).** Good reason for a global context — don't be tempted to run it per-example.
- **`--parallel` with this pattern is tricky.** Each worker thread would get its own global context — and its own container. Possible, but multiply boot cost accordingly; often not worth it for infra tests.
- **Schema drift.** If you change your Prisma schema, make sure your migrations apply cleanly — otherwise `migrate reset` will fail at startup with an error that looks like an infra problem rather than a schema problem.
