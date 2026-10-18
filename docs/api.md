# Routes and API

Stub has no public JSON API. Links are created through a Server Action called by the home page form; everything else is a page or a plain HTTP route.

| Route | Method | Type | Purpose |
|---|---|---|---|
| `/` | GET | Page | Home page with the create-link form. |
| `/` (form submit) | POST | Server Action | Create a link. |
| `/<code>` | GET, HEAD | Route handler | Redirect to the destination. |
| `/stats/<token>` | GET | Page | Private stats for one link. |
| `/api/qr/<code>` | GET | Route handler | QR code PNG. |
| `/robots.txt` | GET | Metadata route | Crawler rules. |

Unknown paths with one segment (`/about`, `/favicon.ico`) are matched by the `/<code>` handler and get its static HTML 404 page. Unknown paths with more segments render the site-wide React 404 page.

## Create a link (Server Action)

Defined in `src/app/actions.ts` as `createLinkAction`. It is invoked by the form on `/` through Next.js's Server Action mechanism. The wire format is a Next.js implementation detail and is not a stable, documented API, so do not script against it. Use the form.

Form fields:

| Field | Required | Description |
|---|---|---|
| `url` | yes | Destination. See validation below. |
| `expiresAt` | no | Expiry as ISO-8601 UTC, for example `2030-01-31T09:30:00.000Z`. Empty or absent means the link never expires. Set by the browser from the visible `expiresLocal` field. |
| `expiresLocal` | no | The date-time input shown to the user. Only used to detect that JavaScript did not run (see below). |

### Validation

URL rules. The exact evaluation order is in [Architecture](architecture.md#url-validation).

| Error code | Condition |
|---|---|
| `url_required` | Empty after trimming. |
| `url_too_long` | More than 2048 characters, before or after normalization. |
| `url_invalid` | Does not parse as an absolute URL (this includes input with no scheme, like `example.com`), or the host has no dot (`localhost`, bare names). |
| `url_scheme` | Scheme is not `http` or `https` (for example `javascript:` or `ftp:`). |
| `url_credentials` | The URL contains a username or password. |
| `url_own_domain` | The hostname equals the hostname of `APP_URL` (lowercased, trailing dot removed, port ignored). Subdomains pass. |

Expiry rules:

| Error code | Condition |
|---|---|
| `expiry_invalid` | Not in the form `YYYY-MM-DDTHH:mm[:ss[.SSS]]Z`, not a real calendar date (`2027-02-31`), or only `expiresLocal` was sent without `expiresAt`. |
| `expiry_past` | Earlier than 60 seconds from now. |

Other errors:

| Error code | Condition |
|---|---|
| `rate_limited` | The creator's IP hash already created 20 or more links in the last hour. |
| `server_error` | Missing or invalid environment configuration, a database error, or five code collisions in a row. The cause is logged on the server. |

The action runs these checks in order: `expiresLocal` sent without `expiresAt` (`expiry_invalid`), then environment, URL, expiry, rate limit, insert.

### Result

On success the action returns:

| Field | Description |
|---|---|
| `code` | The 7-character short code. |
| `shortUrl` | `APP_URL/<code>`. |
| `statsUrl` | `APP_URL/stats/<token>`. Shown once; only a hash is stored. |
| `expiresAt` | ISO string, or `null`. |

On failure it returns an error code from the tables above. The UI turns codes into sentences using `src/content/copy.ts`. Errors are part of the action's result, not HTTP error statuses.

### Rate limit

20 new links per creator per rolling hour. The creator is identified by a keyed hash of the client IP (see [Architecture](architecture.md#hashing-and-secret-tokens)); the limit is a count of `links` rows with that hash created in the last hour. Only successful creations count. Clients that share an IP share the budget. The IP comes from `x-real-ip`, then the first `x-forwarded-for` entry. Next.js never sets `x-real-ip` itself, so a client can send its own value unless a reverse proxy overwrites it. Next.js fills `x-forwarded-for` from the socket address, so the `unknown` fallback is practically unreachable. The check counts and then inserts without a lock, so parallel requests can exceed 20.

## Redirect: `GET` and `HEAD` `/<code>`

`<code>` must be exactly 7 characters from `A-Z`, `a-z`, `0-9`. Codes are case-sensitive.

| Status | When | Body |
|---|---|---|
| `302` | Link exists, is not disabled, and has not expired. `Location` is the stored URL. `Cache-Control: private, no-store`. | Empty |
| `404` | Code has the wrong format or does not exist. | HTML page; empty for `HEAD` |
| `410` | Link is disabled, or its expiry has passed. | HTML page (different text for each case); empty for `HEAD` |
| `503` | The database lookup failed. | Empty |

The 404 and 410 responses use `Content-Type: text/html; charset=utf-8` and `Cache-Control: no-store`.

`GET` records a click unless the request is filtered as a bot or a prefetch (see [Architecture](architecture.md#analytics)). `HEAD` never records one. Expired and disabled links record nothing.

## Stats page: `GET /stats/<token>`

`<token>` is the 43-character secret from the stats URL (`A-Z`, `a-z`, `0-9`, `-`, `_`).

| Status | When |
|---|---|
| `200` | A link matches the token. Works for active, expired, and disabled links; the page shows which. |
| `404` | Malformed token or no matching link. Renders the not-found page. |
| `500` | The database failed. The client-side `error.tsx` shows a retry button that reloads the page. |

The page shows the short URL, destination, creation and expiry times (UTC), state, all-time click total, a 30-day chart of clicks and unique visitors per UTC day, device, browser and OS breakdowns for the same 30 days, and the QR code with a download link. Empty states cover a link with no clicks and a link with no clicks in the last 30 days.

Response headers: `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`. The page is rendered on every request (`dynamic = 'force-dynamic'`).

## QR code: `GET /api/qr/<code>`

| Status | When | Body |
|---|---|---|
| `200` | `<code>` has the valid format. `Content-Type: image/png`, `Cache-Control: public, max-age=31536000, immutable`. | PNG, 512 px wide, error correction level M, encoding `APP_URL/<code>` |
| `404` | Wrong code format. | Plain text `Not found` |
| `500` | QR generation failed, or the environment is invalid (missing `DATABASE_URL`, `APP_URL`, or `HASH_SECRET`, a short `HASH_SECRET`, or a bad `APP_URL`). | Plain text `Server error` |

The route does not check that the link exists, so a well-formed code always returns an image.

## `GET /robots.txt`

Allows crawling in general and disallows `/stats/` and `/api/` for all user agents.
