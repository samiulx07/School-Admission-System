FROM node:26.13.0-alpine AS dependencies
WORKDIR /app
RUN npm install --global npm@12.2.2
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci --no-fund

FROM dependencies AS build
COPY frontend/ ./
ARG SITE_URL=http://localhost:3000
ENV NEXT_TELEMETRY_DISABLED=1 SITE_URL=${SITE_URL}
RUN mkdir -p public && npm run build

FROM node:26.13.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=5s --start-period=15s --retries=10 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
