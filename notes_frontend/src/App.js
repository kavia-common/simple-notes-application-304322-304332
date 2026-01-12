import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
} from "./api/notesApi";

// PUBLIC_INTERFACE
function App() {
  /** Notes state */
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  /** Form state */
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  /** UI state */
  const [status, setStatus] = useState({ kind: "idle", message: "" }); // idle | loading | saving | error
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const loadNotes = async () => {
    setIsRefreshing(true);
    setStatus({ kind: "loading", message: "Loading notes…" });
    try {
      const data = await listNotes();
      setNotes(data);
      // Preserve selection if possible, else select first.
      setSelectedId((prev) => {
        if (prev && data.some((n) => n.id === prev)) return prev;
        return data.length ? data[0].id : null;
      });
      setStatus({ kind: "idle", message: "" });
    } catch (e) {
      setStatus({
        kind: "error",
        message:
          e?.message ||
          "Unable to load notes. Ensure the backend is running on port 3001.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep form in sync when switching notes.
  useEffect(() => {
    if (!selectedNote) {
      setTitle("");
      setContent("");
      return;
    }
    setTitle(selectedNote.title);
    setContent(selectedNote.content);
  }, [selectedNote]);

  const resetToNew = () => {
    setSelectedId(null);
    setTitle("");
    setContent("");
  };

  const onSave = async (e) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setStatus({ kind: "error", message: "Title is required." });
      return;
    }

    setStatus({ kind: "saving", message: "Saving…" });
    try {
      if (selectedId == null) {
        const created = await createNote({
          title: trimmedTitle,
          content,
        });
        // Add to top (API returns created; list is ordered by updated_at desc).
        setNotes((prev) => [created, ...prev]);
        setSelectedId(created.id);
      } else {
        const updated = await updateNote(selectedId, {
          title: trimmedTitle,
          content,
        });
        setNotes((prev) =>
          [updated, ...prev.filter((n) => n.id !== updated.id)]
        );
        setSelectedId(updated.id);
      }
      setStatus({ kind: "idle", message: "" });
    } catch (e2) {
      setStatus({
        kind: "error",
        message: e2?.message || "Save failed. Please try again.",
      });
    }
  };

  const onDelete = async () => {
    if (selectedId == null) return;

    const existing = notes;
    const idToDelete = selectedId;

    // Optimistic removal
    setNotes((prev) => prev.filter((n) => n.id !== idToDelete));
    setSelectedId(null);
    setStatus({ kind: "saving", message: "Deleting…" });

    try {
      await deleteNote(idToDelete);
      setStatus({ kind: "idle", message: "" });

      // If we deleted the selected note, select first remaining.
      setSelectedId((prev) => prev ?? (existing.filter((n) => n.id !== idToDelete)[0]?.id ?? null));
    } catch (e) {
      // Revert
      setNotes(existing);
      setSelectedId(idToDelete);
      setStatus({
        kind: "error",
        message: e?.message || "Delete failed. Restored note.",
      });
    }
  };

  return (
    <div className="NotesApp">
      <header className="Header">
        <div className="Header__brand">
          <div className="Header__logo" aria-hidden="true">
            N
          </div>
          <div>
            <div className="Header__title">Notes</div>
            <div className="Header__subtitle">
              Simple, fast notes (no sign-in).
            </div>
          </div>
        </div>

        <div className="Header__actions">
          <button
            className="Button Button--secondary"
            type="button"
            onClick={loadNotes}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="Button"
            type="button"
            onClick={resetToNew}
            aria-label="Create a new note"
          >
            New note
          </button>
        </div>
      </header>

      <main className="Main">
        <aside className="Sidebar" aria-label="Notes list">
          <div className="Sidebar__header">
            <div className="Sidebar__label">Your notes</div>
            <div className="Sidebar__count">{notes.length}</div>
          </div>

          {status.kind === "error" ? (
            <div className="Notice Notice--error" role="alert">
              {status.message}
            </div>
          ) : null}

          <div className="NotesList" role="list">
            {notes.length === 0 ? (
              <div className="EmptyState">
                <div className="EmptyState__title">No notes yet</div>
                <div className="EmptyState__desc">
                  Click <strong>New note</strong> to create your first one.
                </div>
              </div>
            ) : (
              notes.map((n) => (
                <button
                  key={n.id}
                  className={
                    "NoteItem" + (n.id === selectedId ? " NoteItem--active" : "")
                  }
                  type="button"
                  role="listitem"
                  onClick={() => setSelectedId(n.id)}
                >
                  <div className="NoteItem__title">{n.title}</div>
                  <div className="NoteItem__meta">
                    {new Date(n.updated_at).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="Editor" aria-label="Note editor">
          <form className="Card" onSubmit={onSave}>
            <div className="Card__header">
              <div>
                <div className="Card__title">
                  {selectedId == null ? "New note" : "Edit note"}
                </div>
                <div className="Card__subtitle">
                  {selectedId == null
                    ? "Write something and save."
                    : "Update title/content and save changes."}
                </div>
              </div>

              <div className="Card__headerActions">
                <button
                  className="Button Button--danger"
                  type="button"
                  onClick={onDelete}
                  disabled={selectedId == null || status.kind === "saving"}
                >
                  Delete
                </button>
                <button
                  className="Button"
                  type="submit"
                  disabled={status.kind === "saving"}
                >
                  {status.kind === "saving" ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div className="Field">
              <label className="Field__label" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                className="Field__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g. Grocery list"
                autoComplete="off"
                maxLength={200}
              />
            </div>

            <div className="Field">
              <label className="Field__label" htmlFor="content">
                Content
              </label>
              <textarea
                id="content"
                className="Field__textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note…"
                rows={12}
              />
            </div>

            {status.kind === "loading" ? (
              <div className="Notice">{status.message}</div>
            ) : null}

            {status.kind === "error" ? (
              <div className="Notice Notice--error" role="alert">
                {status.message}
              </div>
            ) : null}

            <div className="Card__footer">
              <div className="Hint">
                API:{" "}
                <code className="Code">
                  {process.env.REACT_APP_API_BASE || "http://localhost:3001"}
                </code>
              </div>
              <div className="Hint">
                Tip: click a note in the list to edit.
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
