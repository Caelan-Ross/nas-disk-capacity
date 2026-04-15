# nas-disk-capacity

A lightweight Homepage iframe widget that displays a color-coded capacity bar for a TrueNAS pool.

The bar shifts from green → yellow → red based on how full the pool is:
- **< 40%** → green
- **40–75%** → yellow
- **> 75%** → red

Color transitions gradually between zones — not a hard cutoff.

---

## Stack

- Node.js + Express
- Proxies the TrueNAS `/api/v2.0/pool/dataset` endpoint (handles CORS + self-signed certs)
- Served as a static iframe page

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TRUENAS_HOST` | `truenas.home.arpa` | Hostname or IP of your TrueNAS instance |
| `TRUENAS_API_KEY` | _(required)_ | TrueNAS API key — generate under account menu → API Keys |
| `POOL_NAME` | `temp_pool` | Name of the pool to monitor |
| `PORT` | `3010` | Port the container listens on |

---

## Running

```bash
docker compose up -d --build
```

To update after config changes:

```bash
docker compose down && docker compose up -d --build
```

---

## Adding to Homepage

In your `services.yaml`, add a `widget` block to your TrueNAS service entry:

```yaml
- TrueNAS:
    icon: truenas.svg
    href: http://truenas.home.arpa
    description: NAS, SMB share /child_pool/
    widget:
      type: iframe
      src: http://<docker-host-ip>:3010
      classes: h-10
```

Adjust `classes` to control the iframe height. `h-10` works well for the two-row layout (label + bar).

---

## Screenshots

_Coming soon._