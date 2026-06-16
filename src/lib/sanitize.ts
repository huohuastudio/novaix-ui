import DOMPurify from "dompurify"

const BASE_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr", "blockquote", "pre", "code",
  "ul", "ol", "li",
  "a", "strong", "em", "b", "i", "u", "s", "del", "sub", "sup",
  "table", "thead", "tbody", "tr", "th", "td",
  "img", "figure", "figcaption",
  "div", "span",
]

const BASE_ATTR = ["href", "target", "rel", "src", "alt", "width", "height"]

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: BASE_TAGS,
    ALLOWED_ATTR: BASE_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}

export function sanitizeEmailHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: BASE_TAGS,
    ALLOWED_ATTR: [
      ...BASE_ATTR,
      "style", "class", "align", "valign", "bgcolor",
      "cellpadding", "cellspacing", "border", "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
  })
}
