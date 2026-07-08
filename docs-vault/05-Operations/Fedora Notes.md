---
tags: [operations]
---

# Fedora Notes

Developed and verified on Fedora 44, Docker CE 29, SELinux **Enforcing**.

## SELinux volume labels

Bind mounts need relabeling or the container gets `EACCES`:

- Already handled in compose: `./artifacts:…:z` and `./config:…:ro,z` ([Docker Design](../02-Architecture/Docker%20Design.md)).
- New mounts: add `:z` (shared) or `:Z` (private). Named volumes (the [Profiles](./Profiles.md) volume) need no label.
- Symptom of a missing label: permission denied writing `/artifacts` while ownership looks fine; AVC denials visible via `sudo ausearch -m avc -ts recent`.

## host.docker.internal

Not automatic on Fedora's Docker — compose maps it with `extra_hosts: ["host.docker.internal:host-gateway"]`. For the container to reach a host app, the app must listen on `0.0.0.0` (or the bridge IP), **not** only `127.0.0.1`. Demonstrated working against a host HTTP server ([Project History](../01-Overview/Project%20History.md)).

## Firewall

`firewalld` can block container→host traffic depending on zones. If `host.docker.internal:<port>` times out while `curl 127.0.0.1:<port>` works on the host:

```bash
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --zone=docker --list-all
sudo firewall-cmd --zone=FedoraWorkstation --add-port=<port>/tcp   # temporary
```

Our verification needed no changes — Docker 29's `docker` zone policies sufficed.

## Ports & access

Everything binds to host loopback ([Security Model](../06-Security/Security%20Model.md)). Port 6080 busy? Change `RAVENEYE_NOVNC_PORT` in [Configuration](./Configuration.md). `scripts/verify-workspace.sh` checks this (and knows when the listener is this project's own observer).

## Chromium specifics

- Renderer crashes on heavy pages → `/dev/shm` too small; compose sets `shm_size: 2gb`.
- Sandbox intentionally disabled in-container — rationale in [Security Model](../06-Security/Security%20Model.md).
- uid mapping: container writes as uid 1000 to match the default Fedora user; adjust the Dockerfile `usermod` if your uid differs.

Related: [Quick Start](./Quick%20Start.md) · [Troubleshooting](./Troubleshooting.md)
