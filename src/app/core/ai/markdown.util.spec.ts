import { renderAssistantMarkdown } from "./markdown.util";

describe("renderAssistantMarkdown", () => {
  it("should render bold text", () => {
    expect(renderAssistantMarkdown("You have **163 total orders**.")).toBe(
      "<p>You have <strong>163 total orders</strong>.</p>"
    );
  });

  it("should render italics and inline code", () => {
    expect(renderAssistantMarkdown("This is *important* and `code`.")).toBe(
      "<p>This is <em>important</em> and <code>code</code>.</p>"
    );
  });

  it("should render a bullet list as ul/li", () => {
    const raw = "- Wireless Mouse\n- USB Cable";
    expect(renderAssistantMarkdown(raw)).toBe(
      "<ul><li>Wireless Mouse</li><li>USB Cable</li></ul>"
    );
  });

  it("should render a numbered list as ol/li", () => {
    const raw = "1. First\n2. Second";
    expect(renderAssistantMarkdown(raw)).toBe(
      "<ol><li>First</li><li>Second</li></ol>"
    );
  });

  it("should join single newlines within a paragraph with br", () => {
    expect(renderAssistantMarkdown("Line one\nLine two")).toBe(
      "<p>Line one<br>Line two</p>"
    );
  });

  it("should treat blank-line-separated text as separate paragraphs", () => {
    const raw = "First paragraph.\n\nSecond paragraph.";
    expect(renderAssistantMarkdown(raw)).toBe(
      "<p>First paragraph.</p><p>Second paragraph.</p>"
    );
  });

  it("should escape raw HTML so it can never inject real tags", () => {
    const raw = "<script>alert(1)</script> & <img src=x onerror=alert(1)>";
    const html = renderAssistantMarkdown(raw);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });
});
