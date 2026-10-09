# Multi-stage build. The final image contains only nginx + static files (no Node, no node_modules).
# Build context is the repository root (see docker-compose.yml).

# ---- Vue panel -------------------------------------------------------------
FROM node:22-alpine AS vue-base
WORKDIR /src/vue-panel
COPY frontend/vue-panel/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/shared /src/shared
COPY frontend/vue-panel/ ./

# Optional: docker build --target vue-test -f frontend/Dockerfile .   (runs the unit tests)
FROM vue-base AS vue-test
RUN npm test

FROM vue-base AS vue-build
RUN npm run build

# ---- React app -------------------------------------------------------------
FROM node:22-alpine AS react-build
WORKDIR /src/react-app
COPY frontend/react-app/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/shared /src/shared
COPY frontend/react-app/ ./
RUN npm run build

# ---- Final image -----------------------------------------------------------
FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=react-build /src/react-app/dist /usr/share/nginx/html
COPY --from=vue-build /src/vue-panel/dist /usr/share/nginx/html/vue-panel
COPY backend/urdf /usr/share/nginx/html/robot/urdf
