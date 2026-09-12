import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// A shared stack keeps nested proof/confirmation dialogs keyboard accessible.
const dialogs = [];
let originalOverflow = "";
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function DialogFrame({ children, onClose, disableClose = false, closeOnOverlay = false, label, labelledBy, describedBy, className }) {
  const root = useRef(null);
  const closeRef = useRef(onClose);
  const disabledRef = useRef(disableClose);
  useEffect(() => { closeRef.current = onClose; disabledRef.current = disableClose; });

  useEffect(() => {
    const node = root.current;
    const previousFocus = document.activeElement;
    if (!dialogs.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    dialogs.push(node);
    node.focus({ preventScroll: true });
    const isTop = () => dialogs.at(-1) === node;
    const onKey = (event) => {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!disabledRef.current) closeRef.current?.();
      }
      if (event.key === "Tab") {
        const items = [...node.querySelectorAll(focusable)].filter(el => el.getClientRects().length && !el.closest('[inert]'));
        const first = items[0];
        const last = items.at(-1);
        if (!first) { event.preventDefault(); node.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === node)) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const onFocus = (event) => {
      if (isTop() && !node.contains(event.target)) node.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      const wasTop = isTop();
      dialogs.splice(dialogs.indexOf(node), 1);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      if (!dialogs.length) document.body.style.overflow = originalOverflow;
      if (wasTop && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div ref={root} className={className} role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnOverlay && !disableClose) onClose?.();
      }}>
      {children}
    </div>, document.body,
  );
}
