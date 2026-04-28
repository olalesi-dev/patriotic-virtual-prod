import { defineConfig } from "drizzle-kit";
import { env } from "@workspace/env";

export default defineConfig({
  schema: "./src/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
