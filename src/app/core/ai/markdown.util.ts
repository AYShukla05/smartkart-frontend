/**
 * Minimal, safe Markdown-to-HTML rendering for LLM-generated assistant
 * replies: bold, italics, inline code, bullet/numbered lists, paragraphs.
 * Not a general-purpose parser - just what conversational prose actually uses.
 *
 * Escapes HTML first so any literal `<`/`>`/`&` in the model's raw text can
 * never become real markup, then only ever injects tags this function wrote
 * itself. Angular's [innerHTML] binding additionally sanitizes the result
 * (strips script/style/event handlers) as a second layer.
 */
export function renderAssistantMarkdown(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped
    .split(/\n{2,}/)
    .map(renderBlock)
    .filter((html) => html.length > 0)
    .join("");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderBlock(block: string): string {
  const lines = block.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return "";

  if (lines.every((line) => /^[-*]\s+/.test(line))) {
    const items = lines.map((line) => `<li>${renderInline(line.replace(/^[-*]\s+/, ""))}</li>`).join("");
    return `<ul>${items}</ul>`;
  }

  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    const items = lines.map((line) => `<li>${renderInline(line.replace(/^\d+\.\s+/, ""))}</li>`).join("");
    return `<ol>${items}</ol>`;
  }

  return `<p>${lines.map(renderInline).join("<br>")}</p>`;
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}
