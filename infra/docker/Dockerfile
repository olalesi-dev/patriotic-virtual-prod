FROM oven/bun:alpine AS builder

# Install some standard utilities just in case
RUN apk add --no-cache bash curl

WORKDIR /app

# Cache dependencies
COPY package.json bun.lock bunfig.toml ./
COPY apps/*/package.json apps/
COPY packages/*/package.json packages/
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the standalone binary
RUN bun run --filter api build

FROM oven/bun:alpine AS runner

WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the compiled binary from the builder
COPY --from=builder /app/apps/api/dist/api-server .

# Ensure proper permissions
RUN chown appuser:appgroup ./api-server && chmod +x ./api-server

USER appuser

EXPOSE 3000

CMD ["./api-server"]
