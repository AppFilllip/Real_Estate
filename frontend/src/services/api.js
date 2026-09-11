import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:4000/api",
  withCredentials: true,
});

let sessionExpiredHandled = false;

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    sessionExpiredHandled = false;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// Only ever honored by the backend when the caller is SUPER_ADMIN — every
// other role's requests are always confined to their own token's company
// regardless of this header.
export function setWorkspaceOverride(companyId) {
  if (companyId) {
    api.defaults.headers.common["X-Workspace-Id"] = companyId;
  } else {
    delete api.defaults.headers.common["X-Workspace-Id"];
  }
}

let onSessionExpired = null;

// Registered by the app shell once, so any 401 anywhere (an expired or
// tampered token) logs the user out immediately instead of leaving screens
// stuck on "Backend data unavailable" style errors.
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthenticated = Boolean(api.defaults.headers.common.Authorization);
    if (error.response?.status === 401 && isAuthenticated && !sessionExpiredHandled) {
      sessionExpiredHandled = true;
      onSessionExpired?.();
    }
    return Promise.reject(error);
  }
);
