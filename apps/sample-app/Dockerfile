FROM node:22.22.0-alpine3.22

WORKDIR /app
COPY server.mjs package.json ./
COPY public ./public

USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.mjs"]
