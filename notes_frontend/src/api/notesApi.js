/**
 * Notes API client.
 *
 * Base URL:
 * - Set REACT_APP_API_BASE in the frontend environment to override.
 * - Defaults to http://localhost:3001.
 */

const DEFAULT_BASE = "http://localhost:3001";

function getBaseUrl() {
  const raw = process.env.REACT_APP_API_BASE || DEFAULT_BASE;
  return raw.replace(/\/+$/, "");
}

async function request(path, options = {}) {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const detail =
      body?.detail ||
      (typeof body === "string" ? body : null) ||
      `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return body;
}

// PUBLIC_INTERFACE
export async function listNotes() {
  /** List all notes */
  return request("/notes", { method: "GET" });
}

// PUBLIC_INTERFACE
export async function getNote(id) {
  /** Get a note by id */
  return request(`/notes/${id}`, { method: "GET" });
}

// PUBLIC_INTERFACE
export async function createNote(payload) {
  /** Create a note */
  return request("/notes", { method: "POST", body: JSON.stringify(payload) });
}

// PUBLIC_INTERFACE
export async function updateNote(id, payload) {
  /** Update a note (partial allowed) */
  return request(`/notes/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

// PUBLIC_INTERFACE
export async function deleteNote(id) {
  /** Delete a note */
  return request(`/notes/${id}`, { method: "DELETE" });
}
