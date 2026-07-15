# Raveneye

Raveneye le da a un agente un navegador Chromium real que tú puedes ver en vivo.

Sirve para revisar interfaces como una persona: navegar, hacer click, tomar screenshots, leer consola y detectar requests rotos.

## Instalación Rápida

Requisitos:

- Docker Desktop
- Node.js 22+

Instalar, actualizar, reparar, registrar MCP y abrir el dashboard:

```bash
npx --yes raveneye-mcp-server@latest fix codex
```

Otros agentes:

```bash
npx --yes raveneye-mcp-server@latest fix claude
npx --yes raveneye-mcp-server@latest fix zcode
npx --yes raveneye-mcp-server@latest fix none
```

`fix none` solo instala/repara/abre Raveneye, sin registrar un agente.

## URLs Importantes

| URL | Para Qué Sirve |
| --- | --- |
| `http://127.0.0.1:8090/overview` | Dashboard: apps, sesiones, estado |
| `http://127.0.0.1:6080` | Navegador base visible por noVNC |
| `http://127.0.0.1:8090/health` | Salud del stack |

Importante: las acciones del agente no se ven necesariamente en el dashboard. Se ven en el `watchUrl` de la sesión noVNC.

## Comandos Útiles

Abrir el dashboard:

```bash
npx raveneye-mcp-server open
```

Registrar MCP solamente:

```bash
npx raveneye-mcp-server setup codex
npx raveneye-mcp-server setup claude
npx raveneye-mcp-server setup zcode
```

Instalación clásica:

```bash
# Windows PowerShell
irm https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.ps1 | iex

# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/install.sh | bash
```

## Apps Locales

Si tu app corre en tu máquina, desde Docker normalmente no se accede como `localhost`.

Usa:

```text
http://host.docker.internal:<puerto>
```

Si hay conflicto de puertos o `host.docker.internal` abre otra app, usa la IP local del host, por ejemplo:

```text
http://172.24.32.1:5173
http://192.168.0.13:5173
```

Para apps con hash routing:

```text
http://host.docker.internal:5173/#tsp/cases
```

## MCP Tools

Raveneye expone herramientas para:

- revisar salud y estado
- navegar
- observar screenshot + consola + red
- hacer click y llenar inputs
- abrir apps registradas en sesiones aisladas
- leer consola y requests

La herramienta principal para empezar es:

```text
raveneye_observe
```

## Desarrollo Local

```bash
npm install
npm run build
docker compose up -d
npm test
```

Checks útiles:

```bash
npm run lint
npm run format:check
npm run test:unit
```

## Problemas Comunes

Ver salud:

```bash
curl http://127.0.0.1:8090/health
```

Ver logs:

```bash
docker compose logs -f raveneye
```

Si una URL local no abre:

1. revisa que la app esté corriendo
2. prueba `host.docker.internal`
3. revisa si hay dos procesos usando el mismo puerto
4. registra la app desde `http://127.0.0.1:8090/overview`

Si el MCP no aparece:

1. ejecuta `npx --yes raveneye-mcp-server@latest fix codex`
2. reinicia Codex/Claude/ZCode
3. revisa `/mcp` o la configuración del agente

## Desinstalar

```bash
# Windows
irm https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/uninstall.ps1 | iex

# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/AndresTaoFlorez/raveneye/main/uninstall.sh | bash
```
