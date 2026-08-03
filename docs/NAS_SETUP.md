# NAS Setup: WebDAV + CORS

myNotes runs entirely in the browser (it's a PWA, not a server-rendered app) and talks to your NAS's WebDAV endpoint directly from the page via `PROPFIND`/`GET`/`PUT`/`DELETE` (`src/sync/webdavClient.ts`). Because the app's origin (e.g. `https://s540d.github.io` for the demo, or wherever you self-host it) differs from your NAS's origin, the browser enforces **CORS** on every request. This is, by far, the most common first stumbling block when connecting myNotes to a real NAS: Synology's and QNAP's built-in WebDAV servers work fine for a native WebDAV client (which isn't subject to CORS), but neither exposes a CORS setting in their web UI, so a browser-based client like myNotes gets blocked until you add one.

This guide covers enabling WebDAV on Synology DSM and QNAP QTS, and the reverse-proxy step both need for CORS.

## 1. Enable WebDAV on the NAS

### Synology DSM

1. **Control Panel → File Services → WebDAV** → enable the WebDAV service. Prefer **HTTPS only** (disable the plain-HTTP port) — see [`THREAT_MODEL.md`](THREAT_MODEL.md) on why plain HTTP exposes your credentials. Note the HTTPS port (default `5006`).
2. **Control Panel → Security → Certificate**: issue a proper certificate (Synology's built-in Let's Encrypt integration works well) rather than relying on the self-signed default — browsers will otherwise refuse the connection outright.
3. Create a **dedicated shared folder** for myNotes (e.g. `myNotes`) rather than pointing it at an existing folder with unrelated files.
4. Create a **dedicated user account** with read/write access limited to that one shared folder — avoid using an admin account for the sync credentials configured in myNotes' Settings page.

### QNAP QTS

1. **Control Panel → Network & File Services → Win/Mac/NFS/WebDAV** (exact location varies by QTS version) → enable WebDAV, HTTPS preferred, note the port.
2. **Control Panel → Security → Certificate & Private Key**: install a real certificate the same way as above.
3. Create a dedicated shared folder and a dedicated user scoped to it, same reasoning as Synology.

At this point, a native WebDAV client (e.g. a desktop file manager's "connect to server") should already work. myNotes, running in a browser, still won't — that's the CORS step.

## 2. Add CORS (the part neither NAS does out of the box)

Neither DSM's nor QTS's built-in WebDAV server lets you configure CORS response headers. The fix is a reverse proxy in front of the WebDAV service that adds them. Two paths, in order of preference:

### Option A: DSM 7.x reverse proxy with custom headers (Synology only, no extra software)

DSM 7's built-in reverse proxy (**Control Panel → Login Portal → Advanced → Reverse Proxy**) supports adding custom response headers on newer builds:

1. Create a reverse proxy rule: source = a new HTTPS host/port (e.g. `webdav-cors.your-nas:5443`), destination = `https://localhost:5006` (the WebDAV port from step 1).
2. Under the rule's **Custom Header** tab, add response headers for **all** relevant methods:
   - `Access-Control-Allow-Origin`: your myNotes origin (e.g. `https://s540d.github.io`), not `*` — see the note on wildcards below.
   - `Access-Control-Allow-Methods`: `GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS`
   - `Access-Control-Allow-Headers`: `Depth, Content-Type, Authorization, If-Match`
   - `Access-Control-Expose-Headers`: `ETag, Content-Length`
3. Point myNotes' WebDAV URL (Settings page) at the new proxied host/port instead of the raw WebDAV port.

If your DSM version's reverse proxy doesn't support custom headers, or preflight `OPTIONS` requests don't get a clean response, fall back to Option B.

### Option B: nginx reverse proxy in a container (Synology and QNAP)

Both platforms support Docker (Synology **Container Manager**, QNAP **Container Station**). Run a small nginx container in front of the WebDAV port:

```nginx
server {
    listen 443 ssl;
    server_name webdav.your-domain.example;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        set $cors_origin "https://s540d.github.io"; # your myNotes origin

        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin $cors_origin always;
            add_header Access-Control-Allow-Methods "GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Depth, Content-Type, Authorization, If-Match" always;
            add_header Access-Control-Max-Age 86400 always;
            return 204;
        }

        add_header Access-Control-Allow-Origin $cors_origin always;
        add_header Access-Control-Allow-Methods "GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Depth, Content-Type, Authorization, If-Match" always;
        add_header Access-Control-Expose-Headers "ETag, Content-Length" always;

        proxy_pass https://127.0.0.1:5006/myNotes/; # the NAS's real WebDAV port + your shared folder
        proxy_set_header Host $host;
        proxy_ssl_verify off; # proxy→NAS hop stays on the loopback/LAN; adjust if that's not true for you
    }
}
```

This mirrors the permissive-CORS config already used for local testing in `test/webdav/config.yml` (see `docs/TESTING.md`) — same set of methods and headers, since that's exactly what `webdavClient.ts` sends.

**On the origin value:** pin it to your actual myNotes origin rather than `*` where you can — a NAS exposed to the internet with wildcard CORS plus valid credentials is more exposed to credential-stuffing-style abuse from arbitrary web pages than one that only answers CORS preflight for a known origin. For a NAS kept entirely on your LAN/VPN with no port-forwarding, this matters less; use your judgement.

## 3. Verify it before pointing myNotes at it

Check the preflight response directly with `curl` before testing in the app:

```sh
curl -i -X OPTIONS "https://webdav.your-domain.example/myNotes/" \
  -H "Origin: https://s540d.github.io" \
  -H "Access-Control-Request-Method: PROPFIND" \
  -H "Access-Control-Request-Headers: authorization"
```

You should see a `2xx` response with `Access-Control-Allow-Origin`, `-Methods`, and `-Headers` echoed back. If you get a `403`/`404` or the headers are missing, the proxy isn't in front of the request path yet — myNotes will fail the same way.

Once that succeeds, use the **"Verbindung testen"** ("Test connection") button on myNotes' Settings page with the proxied URL, username, and password. That exercises the exact same code path (`webdavClient.testConnection`) the app uses for real syncs.

## 4. Point myNotes at it

In myNotes' Settings page, set:
- **WebDAV-URL**: the HTTPS URL from step 2 (e.g. `https://webdav.your-domain.example/` if the proxy already routes to the shared folder, matching the placeholder format `https://mein-nas.example.com/webdav/myNotes`).
- **Benutzername / Passwort**: the dedicated account from step 1.

Then "Jetzt synchronisieren" ("Sync now"). See `docs/PLAN.md` for how the sync engine itself behaves (push/pull, conflict handling) once connected.

---
Part of the overall plan in `docs/PLAN.md`; see `docs/THREAT_MODEL.md` for what this setup does and doesn't protect against.
