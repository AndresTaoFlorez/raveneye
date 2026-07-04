# Fedora notes

Developed and verified on Fedora 44 with Docker CE 29 and SELinux **Enforcing**.

## Docker setup

```bash
sudo dnf install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # log out/in afterwards
```

Compose v2 (`docker compose`, not `docker-compose`) is required.

## SELinux volume labels

With SELinux Enforcing, bind mounts need relabeling or the container gets `EACCES`:

- `compose.yaml` already uses `:z` on `./artifacts` and `:ro,z` on `./config`.
- If you add mounts, use `:z` (shared) or `:Z` (private). Named volumes
  (`ui-observer-profile`) need no labels.
- Symptom of a missing label: `permission denied` writing `/artifacts` while
  `ls -la` looks fine, and AVC denials in `sudo ausearch -m avc -ts recent`.

## host.docker.internal

Fedora's Docker does not resolve `host.docker.internal` by default; the compose file maps
it with `extra_hosts: ["host.docker.internal:host-gateway"]`. For the container to reach a
host app the app must listen on `0.0.0.0` (or the docker bridge IP), not just `127.0.0.1`.

## Firewall

`firewalld` can block container→host traffic on some zone configurations. If
`host.docker.internal:<port>` times out but `curl 127.0.0.1:<port>` works on the host:

```bash
sudo firewall-cmd --get-active-zones          # find the docker zone
sudo firewall-cmd --zone=docker --list-all
sudo firewall-cmd --zone=FedoraWorkstation --add-port=8123/tcp   # temporarily
```

(Our verification worked without changes — Docker 29 puts its interfaces in the
`docker` zone with the needed policies.)

## Ports

Everything binds to `127.0.0.1` on the host. If 6080 is taken
(`ss -tlnp | grep 6080`), change `UI_OBSERVER_NOVNC_PORT` in `.env`.

## noVNC access

`http://127.0.0.1:6080` auto-connects with scaling. If you see the noVNC connect page
instead of the browser, the VNC chain is up but the display may still be starting —
check `scripts/observer health`.

## Chromium failures

- **Crashes / renderer OOM**: increase `shm_size` in compose (2 GB default). The classic
  symptom of tiny `/dev/shm` is tab crashes on media-heavy pages.
- **`Missing X server`**: Xvfb died — `make logs`, look at `/tmp/xvfb.log` in the container.
- **Sandbox errors**: the sandbox is intentionally disabled in-container (docs/security.md).

## Profile permissions

The container user is uid 1000 to match the default Fedora user, so files written to
`artifacts/` belong to you. If your uid differs, adjust the `usermod` line in
`apps/observer-server/Dockerfile` or chown `artifacts/` afterwards. If the profile volume
gets wedged, `make reset-profile` recreates it cleanly.
