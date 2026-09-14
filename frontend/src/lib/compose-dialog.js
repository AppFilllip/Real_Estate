let listener = null;

export function setComposeDialogListener(fn) {
  listener = fn;
}

/**
 * Imperative, singleton-style opener — any screen can call this without
 * threading dialog state through props. A single <ComposeMessageDialog />
 * mounted once in AppShell listens for these and renders the actual modal.
 */
export function openComposeDialog(payload) {
  listener?.(payload);
}
