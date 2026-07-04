---
tags: [overview, beginner]
---

# Absolute Basics

Zero-assumptions explanations of every technical concept the rest of this vault uses. If terms like "container" or "port" are new to you, read this first, then go to [[Quick Start]].

## The terminal

A window where you type commands instead of clicking. On Fedora it is the app called **Terminal** (or Console). Every code block in this vault like:

```bash
make up
```

means: open the terminal, go to the project folder (`cd ~/Projects/ui-observer`), type the command, press Enter.

## What is Docker?

Think of Docker as a way to run a program inside a **sealed box** that carries everything the program needs — its own files, its own mini-operating-system pieces. That box is called a **container**.

- **Image** = the frozen recipe/template (like a cake recipe).
- **Container** = a running copy made from the image (like an actual cake).
- Why it matters here: UI Observer ships a whole browser + screen + streaming setup as one image, so you never install any of that on your computer. `make build` bakes the images, `make up` starts the containers, `make down` stops them.

## What is a port?

A computer can run many programs that talk over the network; **ports are numbered doors** so traffic finds the right program. A web address like `http://127.0.0.1:6080` means: "talk to door **6080**".

- `127.0.0.1` (also called **localhost** or *loopback*) means **this same computer**. Nothing on the internet can reach it — that is why UI Observer uses it everywhere ([[Security Model]]).
- UI Observer's doors: **6080** = watch the browser · **9222** = agents control the browser · **8090** = simple commands · **3000** = the built-in demo app. See [[Configuration]].

## "Publishing a port" (the key Docker idea for you)

A container is sealed: programs inside it have doors, but your computer can't knock on them **unless the container publishes the door**. Publishing `8080:80` means: "door **8080 of my computer** forwards to door **80 inside the box**".

You can see what a container publishes with:

```bash
docker ps
# ...  PORTS: 127.0.0.1:8080->80/tcp   ← published: your 8080 goes to its 80
```

If the PORTS column shows nothing like `->`, that container publishes nothing — that's Option B territory in [[Observing Your Own App]].

## host.docker.internal — the container calling *you* back

Inside a container, `localhost` means *the container itself*, not your computer. So when the observer's browser needs to open an app running **on your computer**, it uses the special name **`host.docker.internal`**, which means "the human's machine". That's why targets look like `http://host.docker.internal:8080`.

## The .env file

A plain text file of `NAME=value` lines in the project folder — the project's settings. You copy the example once (`cp .env.example .env`), edit values with any text editor, and apply changes with `docker compose up -d`. Every setting is explained in [[Configuration]].

## Putting it together

Watching `http://127.0.0.1:6080` = "knock on my own door 6080, which Docker forwards into the observer box, where a streaming program shows me the browser's screen" — the [[Shared Browser Model]] in plumbing terms.
