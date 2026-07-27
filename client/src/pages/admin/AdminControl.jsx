import React, { useMemo, useState } from "react";
import AdminNavbar from "../../components/admin/Navbar";
import styles from "./AdminControl.module.css";
import { api } from "../../lib/api";

export default function AdminControl() {
  const [cleanup, setCleanup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const unusedFiles = useMemo(() => {
    if (Array.isArray(cleanup?.unused)) return cleanup.unused;
    if (Array.isArray(cleanup?.deleted)) return cleanup.deleted;
    return [];
  }, [cleanup]);

  const previewUnusedUploads = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const { data } = await api.get("/admin/uploads/unused");
      setCleanup(data);
      setMessage(data?.message || "Unused upload scan complete.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to scan unused uploads.");
    } finally {
      setLoading(false);
    }
  };

  const deleteUnusedUploads = async () => {
    const count = cleanup?.counts?.unused ?? cleanup?.counts?.scanned_unused ?? 0;
    if (!window.confirm(`Delete ${count} unused upload image${count === 1 ? "" : "s"}?`)) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");
      const { data } = await api.delete("/admin/uploads/unused");
      setCleanup(data);
      setMessage(data?.message || "Unused upload cleanup complete.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete unused uploads.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <AdminNavbar />
      <main className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Control</h1>
            <p className={styles.sub}>Platform control tools are being updated.</p>
          </div>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2>Upload Cleanup</h2>
              <p className={styles.sub}>
                Scan uploaded images and remove files that are not referenced by site data.
              </p>
            </div>
          </div>

          <div className={styles.cleanupBody}>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={previewUnusedUploads}
                disabled={loading || deleting}
              >
                {loading ? "Scanning..." : "Preview unused images"}
              </button>

              <button
                type="button"
                className={styles.danger}
                onClick={deleteUnusedUploads}
                disabled={loading || deleting || !cleanup}
              >
                {deleting ? "Deleting..." : "Delete unused images"}
              </button>
            </div>

            {error ? <div className={styles.errorBox}>{error}</div> : null}
            {message ? <div className={styles.successBox}>{message}</div> : null}

            {cleanup ? (
              <>
                <div className={styles.countGrid}>
                  <div className={styles.countBox}>
                    <span>Referenced</span>
                    <strong>{cleanup.counts?.referenced ?? 0}</strong>
                  </div>
                  <div className={styles.countBox}>
                    <span>Kept</span>
                    <strong>{cleanup.counts?.kept ?? 0}</strong>
                  </div>
                  <div className={styles.countBox}>
                    <span>Unused</span>
                    <strong>{cleanup.counts?.unused ?? cleanup.counts?.scanned_unused ?? 0}</strong>
                  </div>
                  <div className={styles.countBox}>
                    <span>Deleted</span>
                    <strong>{cleanup.counts?.deleted ?? 0}</strong>
                  </div>
                </div>

                <div className={styles.fileList}>
                  <div className={styles.fileListHead}>
                    <strong>{Array.isArray(cleanup.deleted) ? "Deleted files" : "Unused files"}</strong>
                    <span>{unusedFiles.length} shown</span>
                  </div>

                  {unusedFiles.length ? (
                    unusedFiles.slice(0, 80).map((file) => (
                      <div key={file.filename} className={styles.fileRow}>
                        <span className={styles.mono}>{file.path || file.filename}</span>
                        <span>{formatBytes(file.size)}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyBox}>No unused upload images found.</div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.emptyBox}>Run preview first to see unused upload images.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
