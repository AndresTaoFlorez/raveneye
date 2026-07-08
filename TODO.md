# RavenEye Development TODO

RavenEye ya permite observar una aplicación mediante un navegador compartido expuesto por noVNC en el puerto `6080`.

Actualmente, para observar una aplicación externa es necesario modificar el archivo `.env` e indicar manualmente el `target` de la aplicación. Esto funciona, pero representa una fricción importante en la experiencia de usuario.

El objetivo es que RavenEye evolucione de una herramienta configurada por archivos hacia una plataforma local con interfaz web propia, donde el usuario pueda configurar, iniciar, observar y controlar sesiones sin modificar archivos internos del repositorio.

## Problema actual

La configuración depende demasiado del archivo `.env`.

Esto genera varios problemas:

* El usuario debe abrir y editar archivos internos del proyecto.
* Cambiar de aplicación observada requiere modificar configuración manualmente.
* La experiencia inicial no es suficientemente fluida.
* La herramienta se siente más como infraestructura técnica que como producto.
* El uso no es ideal para desarrolladores que solo quieren levantar RavenEye y empezar a observar una aplicación.

## Objetivo de evolución

RavenEye debe exponer una interfaz web local, amigable y profesional, desde la cual el usuario pueda:

* Registrar aplicaciones a observar.
* Configurar URLs objetivo.
* Iniciar sesiones de observación.
* Abrir navegadores compartidos.
* Ejecutar misiones de revisión.
* Ver sesiones activas.
* Consultar artefactos.
* Revisar logs, screenshots, traces y reportes.
* Gestionar configuraciones sin tocar archivos internos.

El usuario debería poder levantar el programa y operar todo desde la interfaz.

## Nuevas funcionalidades

### Multi Observer

RavenEye debe permitir observar varias aplicaciones al mismo tiempo.

Cada aplicación observada debe tener su propia sesión, navegador, configuración, puerto y estado.

Esto permitirá ejecutar varias sesiones en paralelo, por ejemplo:

* Una aplicación frontend local.
* Una aplicación en Docker.
* Una aplicación de staging autorizada.
* Una aplicación de prueba.

Cada sesión debe simular de forma realista un navegador abierto con la aplicación, usando noVNC y Playwright.

### Database local y portable

RavenEye necesita una base de datos ligera y local para persistir información sin depender de servicios externos.

Debe evaluarse una opción portable que pueda vivir dentro del mismo directorio del proyecto, por ejemplo SQLite.

La base de datos debería almacenar:

* Aplicaciones registradas.
* URLs objetivo.
* Sesiones creadas.
* Configuración de observación.
* Misiones ejecutadas.
* Artefactos generados.
* Historial de interacciones.
* Preferencias del usuario.
* Estado de sesiones persistentes.

Esto mejoraría la experiencia de usuario y evitaría depender exclusivamente de archivos `.env`.

### No tocar archivos internos del repositorio

La interacción con RavenEye debe realizarse desde la interfaz web local.

El usuario no debería necesitar modificar:

* `.env`
* `compose.yaml`
* scripts internos
* archivos de configuración manuales
* archivos del repositorio

La configuración manual puede seguir existiendo para casos avanzados, pero el flujo principal debe estar disponible desde la plataforma web.

El objetivo es que el usuario solo tenga que:

1. Levantar RavenEye.
2. Abrir la interfaz local.
3. Registrar una aplicación.
4. Iniciar una sesión.
5. Observar e interactuar.

### Agentic Browser Preview

RavenEye debe evolucionar hacia un entorno visual para agentes de código.

No debe quedarse únicamente como una ventana noVNC donde se ve lo que ocurre. Debe permitir que el agente observe, interactúe, analice y mejore interfaces de forma más cercana a como lo haría una persona.

La evolución debe ser gradual:

1. Shared Browser
   Navegador real visible por noVNC y controlable por Playwright.

2. Agent Browser
   El agente puede navegar, hacer clic, escribir, leer consola, red, DOM y accesibilidad.

3. Visual Inspector Overlay
   El usuario puede seleccionar elementos visuales de la interfaz observada.

4. Source Mapping
   RavenEye intenta relacionar el elemento seleccionado con el componente, archivo o estilo que lo genera.

5. In-context UI Editing
   El usuario puede comentar sobre una zona específica de la UI y el agente recibe contexto visual y técnico para corregirla.

6. Visual Verification Loop
   RavenEye repite la misma misión, compara antes y después, y confirma si el problema fue corregido.

## Open Source Vision

Herramientas como Claude Design y Cursor ya ofrecen experiencias similares, pero suelen ser cerradas, costosas y difíciles de auditar.

RavenEye debe aspirar a ser una alternativa abierta, local y extensible.

La visión es que cualquier desarrollador pueda:

* Ejecutarlo localmente.
* Conectar el agente o modelo de su preferencia.
* Usar su propia API key.
* Observar aplicaciones reales.
* Dar ojos y manos a sus agentes personales.
* Mejorar UI, UX, apariencia y flujos reales.
* Detectar problemas que no aparecen en pruebas tradicionales.
* Contribuir mejoras al proyecto.

RavenEye debe ayudar a que los agentes puedan corregir aquello que normalmente solo el ojo y la experiencia humana logran detectar.

### Source-Aware UI Inspection

Como funcionalidad experimental, RavenEye debería permitir que al registrar una aplicación a observar también se indique la ruta local del repositorio donde se encuentran sus archivos de desarrollo.

Ejemplo:

```text
Aplicación observada:
http://host.docker.internal:5173

Repositorio local:
~/Projects/my-frontend-app
```

Esto permitiría que RavenEye relacione la interfaz visual observada con el código fuente que probablemente la genera.

Durante el uso de In-context UI Editing, cuando el usuario seleccione un elemento visual de la aplicación, RavenEye debería recolectar contexto técnico como:

* Selector DOM.
* Texto visible.
* Clases CSS.
* Atributos relevantes.
* Bounding box del elemento.
* Screenshot recortado.
* Ruta actual del navegador.
* Estilos computados.
* Árbol cercano del DOM.
* Posibles archivos relacionados dentro del repositorio local.

Con esta información, y usando el modelo conectado por el usuario mediante su API key, RavenEye podría ayudar a identificar a qué componente, archivo o estilo se está haciendo referencia.

El objetivo no es modificar código a ciegas, sino construir un puente entre:

```text
Elemento visual seleccionado
        ↓
Contexto DOM y visual
        ↓
Repositorio local asociado
        ↓
Componente o archivo probable
        ↓
Tarea precisa para el agente
```

Esto permitiría que el usuario pueda señalar una parte específica de la UI y escribir una observación como:

```text
Este botón se ve muy pegado al borde.
```

Y RavenEye pueda entregar al agente un contexto mucho más útil:

```text
Elemento seleccionado: botón "Guardar"
Ruta: /settings/profile
Selector probable: button.save-profile
Componente probable: src/features/profile/ProfileForm.tsx
Archivo de estilos probable: src/features/profile/ProfileForm.module.css
Problema reportado: el botón se ve muy pegado al borde.
```

Esta funcionalidad debe tratarse inicialmente como experimental, ya que la relación entre un elemento visual y su archivo fuente puede ser aproximada. RavenEye debería mostrar sugerencias probables, no asumir certeza absoluta.

La modificación automática de código debería requerir aprobación del usuario o ejecutarse mediante el agente conectado, dejando evidencia clara de qué archivo fue analizado, qué cambio se propuso y qué resultado visual produjo.
