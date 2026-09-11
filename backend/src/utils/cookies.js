const { env } = require("../config/env");

const refreshCookieName = "estateos_refresh";

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    path: "/api/auth",
    maxAge: env.refreshTokenDays * 24 * 60 * 60 * 1000,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(refreshCookieName, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(refreshCookieName, { ...refreshCookieOptions(), maxAge: undefined });
}

function getRefreshCookie(req) {
  return parseCookies(req.headers.cookie || "")[refreshCookieName];
}

module.exports = { clearRefreshCookie, getRefreshCookie, setRefreshCookie };
