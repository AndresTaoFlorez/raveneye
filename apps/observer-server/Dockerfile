# Base image ships Node 22 and Chromium matching Playwright 1.61.1 —
# browsers are baked in, never downloaded at container start.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

RUN apt-get update && apt-get install -y --no-install-recommends \
      xvfb openbox x11vnc novnc websockify socat supervisor curl scrot \
    && rm -rf /var/lib/apt/lists/* \
    && printf '<!doctype html><meta http-equiv="refresh" content="0; url=vnc.html?autoconnect=true&resize=scale">' \
       > /usr/share/novnc/index.html

# Align the container user with the typical host uid (1000) so files written
# to the bind-mounted /artifacts directory belong to the developer.
RUN userdel -r ubuntu 2>/dev/null || true \
    && groupdel ubuntu 2>/dev/null || true \
    && groupmod -g 1000 pwuser \
    && usermod -u 1000 -g 1000 pwuser \
    && chown -R pwuser:pwuser /home/pwuser

RUN mkdir -p /app /artifacts /browser-profile \
    && chown pwuser:pwuser /app /artifacts /browser-profile

WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/shared/package.json apps/shared/tsconfig.json apps/shared/
COPY apps/observer-server/package.json apps/observer-server/tsconfig.json apps/observer-server/
COPY apps/mission-runner/package.json apps/mission-runner/tsconfig.json apps/mission-runner/
COPY apps/sample-app/package.json apps/sample-app/
RUN npm ci

COPY apps/shared/src apps/shared/src
COPY apps/observer-server/src apps/observer-server/src
COPY apps/mission-runner/src apps/mission-runner/src
RUN npx tsc -b apps/shared apps/observer-server apps/mission-runner \
    && chown -R pwuser:pwuser /app

COPY apps/observer-server/supervisord.conf /etc/raveneye/supervisord.conf

ENV DISPLAY=:99 \
    RAVENEYE_VIEWPORT_WIDTH=1440 \
    RAVENEYE_VIEWPORT_HEIGHT=900 \
    RAVENEYE_PROFILE_MODE=ephemeral

USER pwuser
EXPOSE 6080 8090 9222

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8090/health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/raveneye/supervisord.conf"]
