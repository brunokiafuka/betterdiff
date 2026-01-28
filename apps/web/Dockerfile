## Build stage: compile the Vite app into static assets
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (relax peer-dep checks to match local dev)
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps; \
    else \
      npm install --legacy-peer-deps; \
    fi

# Copy source and build
COPY . .
RUN npm run build

## Runtime stage: serve the built assets with a SPA-aware static server
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy only the built assets from the build stage
COPY --from=build /app/dist ./dist

# Install a tiny static server that supports history API fallback
RUN npm install -g serve

# -s enables SPA mode (all routes fallback to index.html)
# -l 8080 listens on the internal Fly port defined in fly.toml
CMD ["serve", "-s", "dist", "-l", "8080"]
