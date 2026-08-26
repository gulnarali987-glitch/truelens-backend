import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Anonymous device id for pre-signup free scans
function getAnonId() {
  let id = localStorage.getItem("tl_anon_id");
  if (!id) {
    id = "anon_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("tl_anon_id", id);
  }
  return id;
}

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers || {};
  cfg.headers["X-Anon-Id"] = getAnonId();
  const t = localStorage.getItem("tl_token");
  if (t) cfg.headers["Authorization"] = `Bearer ${t}`;
  return cfg;
});

export function saveToken(t) {
  if (t) localStorage.setItem("tl_token", t);
}
export function clearToken() {
  localStorage.removeItem("tl_token");
}
export { getAnonId };
