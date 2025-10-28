// MarkdownRenderer.jsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css"; // optional

export default function MarkdownRenderer({ source }) {
    return (
        <div className="markdown-body" style={{lineHeight:1.6}}>
            <ReactMarkdown
                children={source}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize, rehypeHighlight]}
                components={{
                    a: ({node, ...props}) => (
                        <a {...props} target={props.href && !props.href.startsWith('#') ? "_blank" : undefined}
                           rel={props.href && !props.href.startsWith('#') ? "noopener noreferrer" : undefined} />
                    )
                }}
            />
        </div>
    );
}
