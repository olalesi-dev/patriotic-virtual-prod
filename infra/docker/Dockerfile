FROM oven/bun:alpine AS builder

WORKDIR /app

# Cache dependencies separately for faster rebuilds
COPY package.json bun.lock bunfig.toml ./
COPY apps/*/package.json apps/
COPY packages/*/package.json packages/
RUN bun install

# Copy rest of the code
COPY . .

# Build the standalone binary with production optimizations
ENV NODE_ENV=production
RUN bun run --filter api build && chmod +x /app/apps/api/dist/api-server

# Final Stage: Use plain Alpine
FROM alpine:3.20 AS runner

WORKDIR /app

# Install runtime dependencies for the binary
RUN apk add --no-cache libstdc++ libgcc

# Create non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# COPY with --chown and preserve permissions
COPY --from=builder --chown=appuser:appgroup /app/apps/api/dist/api-server ./api-server

USER appuser

EXPOSE 3000

CMD ["./api-server"]
