import type { CSSProperties } from "react";

type XmlReaderProps = {
  value: string;
};

function XmlNode({ element, depth = 0 }: { element: Element; depth?: number }) {
  const children = Array.from(element.children);
  const text = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  const attributes = Array.from(element.attributes);
  const hasChildren = children.length > 0 || attributes.length > 0 || Boolean(text);

  return (
    <details className="xml-reader-node" open={depth < 1}>
      <summary
        className="xml-reader-row"
        style={{ "--xml-depth": depth } as CSSProperties}
        title={`<${element.tagName}>`}
      >
        <span className="xml-reader-tag">{element.tagName}</span>
        {text && !children.length ? <span className="xml-reader-text">{text}</span> : null}
        {!hasChildren ? <span className="xml-reader-empty">empty</span> : null}
      </summary>
      {hasChildren ? (
        <div>
          {attributes.length ? (
            <div
              className="xml-reader-attributes"
              style={{ "--xml-depth": depth + 1 } as CSSProperties}
            >
              {attributes.map((attribute) => (
                <span className="xml-reader-attribute" key={attribute.name}>
                  <span className="xml-reader-attribute-name">{attribute.name}</span>
                  <span className="xml-reader-separator">=</span>
                  <span className="xml-reader-string">&quot;{attribute.value}&quot;</span>
                </span>
              ))}
            </div>
          ) : null}
          {children.map((child) => (
            <XmlNode
              key={`${child.tagName}-${child.getAttribute("id") ?? ""}`}
              element={child}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </details>
  );
}

export function XmlReader({ value }: XmlReaderProps) {
  let document: XMLDocument;
  try {
    document = new DOMParser().parseFromString(value, "application/xml");
  } catch (error) {
    return (
      <div className="xml-reader xml-reader-error">
        <strong>Invalid XML</strong>
        <p>{error instanceof Error ? error.message : String(error)}</p>
      </div>
    );
  }

  if (document.getElementsByTagName("parsererror").length > 0 || !document.documentElement) {
    return (
      <div className="xml-reader xml-reader-error">
        <strong>Invalid XML</strong>
        <p>The document could not be parsed as XML.</p>
      </div>
    );
  }

  return (
    <div className="xml-reader" aria-label="XML reader">
      <XmlNode element={document.documentElement} />
    </div>
  );
}
