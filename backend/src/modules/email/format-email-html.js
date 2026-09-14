function escapeHtml(value) {
  return String(value || "").replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char]));
}

/**
 * Converts a plain-text message (as typed into the compose box) into a
 * clean, minimally-styled HTML email — paragraphs on blank lines, single
 * line breaks preserved, and user input escaped before it ever touches HTML.
 */
function plainTextToEmailHtml(text) {
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => escapeHtml(paragraph).replace(/\n/g, "<br>"))
    .filter(Boolean);

  const content = paragraphs.map((paragraph) => `<p style="margin:0 0 14px;">${paragraph}</p>`).join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#101418;max-width:600px;">${content}</div>`;
}

module.exports = { plainTextToEmailHtml, escapeHtml };
