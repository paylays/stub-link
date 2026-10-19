import type { CreateLinkError, StatsView } from "@/lib/types";

// Every UI string lives here, in English. The backend returns error codes only;
// the frontend maps them through this file.
// Date arguments arrive already formatted by the caller.

export const APP_NAME = "Stub";

export type StatusPageKind = "not-found" | "expired" | "disabled";

type StatusPageCopy = {
  documentTitle: string;
  title: string;
  body: string;
  homeLink: string;
};

const homeLink = `Go to the ${APP_NAME} home page`;

const errors: Record<CreateLinkError, string> = {
  url_required: "Paste a link to shorten.",
  url_invalid:
    "That isn't a complete web address. Include https:// and a domain, like https://example.com/page.",
  url_scheme: "Only links that start with http:// or https:// can be shortened.",
  url_too_long: "Links can be up to 2,048 characters long. This one is longer.",
  url_credentials:
    "Remove the username and password from this link first. Anyone who opens the short link would see them.",
  url_own_domain: `Links to ${APP_NAME} itself can't be shortened. Paste the original address instead.`,
  expiry_invalid: "Enter a valid date and time, or leave the expiry empty.",
  expiry_past: "The expiry must be at least 1 minute from now.",
  // The number mirrors the limit in src/server/rate-limit.ts. Change both together.
  rate_limited:
    "Your network has reached the limit of 20 new links per hour. Try again later.",
  server_error:
    "The link couldn't be created because of a problem on our side. Try again in a moment.",
};

const stateLabels: Record<StatsView["state"], string> = {
  active: "Active",
  expired: "Expired",
  disabled: "Disabled",
};

const stateNotes: Record<StatsView["state"], string> = {
  active: "The short link is working and counting clicks.",
  expired:
    "The expiry date has passed. Visitors see an expiry notice, and new clicks are not counted.",
  disabled:
    "The site operator turned this link off. Visitors see a notice, and new clicks are not counted.",
};

const statusPages: Record<StatusPageKind, StatusPageCopy> = {
  "not-found": {
    documentTitle: `Link not found | ${APP_NAME}`,
    title: "This short link doesn't exist",
    body: "Check that the whole address was copied. The code after the slash is 7 characters long, and capital letters matter.",
    homeLink,
  },
  expired: {
    documentTitle: `Link expired | ${APP_NAME}`,
    title: "This link has expired",
    body: "The person who made it set an end date, and that date has passed. Ask whoever shared it for a new link.",
    homeLink,
  },
  disabled: {
    documentTitle: `Link disabled | ${APP_NAME}`,
    title: "This link has been turned off",
    body: "The operator of this site disabled it, so it no longer leads anywhere.",
    homeLink,
  },
};

export const copy = {
  appName: APP_NAME,

  meta: {
    title: `${APP_NAME}: short links with click stats`,
    description:
      "Paste a long web address and get a 7-character short link, a QR code, and a secret page that counts its clicks. No account needed.",
  },

  // Theme switch in the header of every page.
  // The label is both the visible text and the accessible name; aria-checked carries the state.
  theme: {
    toggleLabel: "Dark mode",
  },

  home: {
    headline: "Shorten a link and count its clicks",
    intro:
      "Paste a web address. You get a 7-character short link, a QR code, and a secret stats page. No account needed.",
    urlLabel: "Link to shorten",
    urlPlaceholder: "https://example.com/a/very/long/address",
    expiryLabel: "Expiry (optional)",
    expiryHint:
      "Leave it empty and the link never expires. If you set one, it must be at least 1 minute from now, in your local time.",
    submit: "Shorten link",
    submitting: "Shortening…",
  },

  errors,

  result: {
    heading: "Your short link is ready",
    shortLinkLabel: "Short link",
    statsLinkLabel: "Stats link",
    warningTitle: "Save the stats link now",
    warningBody:
      "This is the only time it is shown, and it can't be recovered later. Anyone who has it can see this link's clicks, so share it only with people who should see them.",
    copy: "Copy",
    copied: "Copied",
    copyShortLinkLabel: "Copy short link",
    copyStatsLinkLabel: "Copy stats link",
    shortLinkCopied: "Short link copied",
    statsLinkCopied: "Stats link copied",
    copyFailed: "Couldn't copy. Select the link and copy it yourself.",
    qrLabel: "QR code",
    qrAlt: (shortUrl: string) => `QR code that opens ${shortUrl}`,
    qrDownload: "Download QR code (PNG)",
    qrError:
      "The preview didn't load. Your short link still works, and the stats page has the QR code too.",
    expiresOn: (date: string) => `This link stops working on ${date}.`,
    neverExpires: "This link has no expiry date.",
    createAnother: "Shorten another link",
  },

  stats: {
    metaTitle: `Link stats | ${APP_NAME}`,
    heading: "Link stats",
    bookmarkNote: "Bookmark this page. Its address is the only way back to these stats.",
    shortLinkLabel: "Short link",
    targetLabel: "Goes to",
    createdLabel: "Created",
    expiresLabel: "Expires",
    neverExpires: "No expiry date",
    stateLabel: "Status",
    states: stateLabels,
    stateNotes,
    timesInUtc: "All times on this page are in UTC.",

    totalClicksLabel: "Total clicks",
    totalClicksNote: "Since the link was created",

    last30DaysHeading: "Last 30 days",
    chartTitle: "Clicks and unique visitors per day",
    clicksLabel: "Clicks",
    dailyUniquesLabel: "Daily unique visitors",
    daysInUtcNote:
      "Days run midnight to midnight UTC. The last day is today, so its count can still go up.",
    uniquesNote:
      "A visitor counts once per day, so someone who comes back on another day counts again.",
    chartTableCaption:
      "Clicks and daily unique visitors for each of the last 30 days, in UTC",
    tableDayHeader: "Day (UTC)",

    devicesHeading: "Devices",
    browsersHeading: "Browsers",
    osHeading: "Operating systems",
    breakdownPeriod: "Last 30 days",
    other: "Other",
    // Keys match the clicks.device_type values.
    deviceNames: {
      desktop: "Desktop",
      mobile: "Mobile",
      tablet: "Tablet",
      tv: "TV",
      unknown: "Unknown",
    },

    emptyTitle: "No clicks yet",
    emptyBody:
      "Share the short link, then reload this page to see visits. Known bots and link previews are not counted.",
    emptyLast30: "No clicks in the last 30 days.",

    qrLabel: "QR code",
    qrAlt: (shortUrl: string) => `QR code that opens ${shortUrl}`,
    qrDownload: "Download QR code (PNG)",

    errorTitle: "Stats didn't load",
    errorBody: "Something failed while loading the numbers. Try again in a moment.",
    errorRetry: "Load stats again",
  },

  // App-level 404, also shown for a stats link with a wrong or incomplete token.
  notFound: {
    metaTitle: `Page not found | ${APP_NAME}`,
    title: "Nothing at this address",
    body: "If you followed a stats link, check that you copied all of it. Lost stats links can't be recovered.",
    homeLink,
  },

  statusPages,
} as const;
