import React, { useState } from "react";

export function JsonView({ data, maxLines = 10 }: { data: any, maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  
  if (data === undefined) return null;
  
  const { text, lines, isHuge } = React.useMemo(() => {
    if (typeof data === "string") {
      const split = data.split("\n");
      return { text: data, lines: split, isHuge: false };
    }
    
    // If it's a massive object, we don't even stringify the whole thing unless expanded
    if (!expanded) {
      // Just stringify a small version
      const smallStr = JSON.stringify(data, (k, v) => {
        if (Array.isArray(v) && v.length > 50) return `[Array(${v.length})]`;
        if (typeof v === "string" && v.length > 500) return v.slice(0, 500) + "...";
        return v;
      }, 2);
      const split = smallStr.split("\n");
      return { text: smallStr, lines: split, isHuge: true };
    }
    
    const fullStr = JSON.stringify(data, null, 2);
    return { text: fullStr, lines: fullStr.split("\n"), isHuge: false };
  }, [data, expanded]);
  
  if (lines.length <= maxLines && !isHuge) {
    return (
      <div style={{ position: "relative" }}>
        <pre className="code-block" style={{ margin: 0, padding: 10, overflowX: "auto" }}>
          {text}
        </pre>
        {expanded && lines.length > maxLines && (
          <button 
            onClick={() => setExpanded(false)}
            style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, background: "rgba(255,255,255,0.1)", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px 8px", borderRadius: 4 }}
          >
            Collapse
          </button>
        )}
      </div>
    );
  }
  
  const truncatedText = lines.slice(0, maxLines).join("\n") + "\n...";
  
  return (
    <div style={{ position: "relative" }}>
      <pre className="code-block" style={{ margin: 0, padding: 10, overflow: "hidden" }}>
        {truncatedText}
      </pre>
      <button 
        onClick={() => setExpanded(true)}
        style={{ position: "absolute", bottom: 8, right: 8, fontSize: 10, background: "var(--accent)", border: "none", color: "#fff", cursor: "pointer", padding: "4px 8px", borderRadius: 4 }}
      >
        Expand ({lines.length - maxLines} more lines)
      </button>
    </div>
  );
}
