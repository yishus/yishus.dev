import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface NoteProps {
  markdownContent: string;
}

const Article = ({ markdownContent }: NoteProps) => {
  return (
    <article>
      <Markdown
        rehypePlugins={[rehypeRaw, remarkGfm]}
        components={{
          h2(props) {
            const { children, node, ...rest } = props;
            let headerText: string | undefined;
            if (Array.isArray(children)) {
              headerText = children[0].toString();
            } else {
              headerText = children == null ? undefined : children.toString();
            }
            const headerId = headerText
              ?.toLowerCase()
              .replace(/[!?]/g, "")
              .replace(/ /g, "-");
            return (
              <h2 id={headerId} {...rest}>
                {children}
                <a href={`#${headerId}`} aria-label="Permalink to this heading">
                  ¶
                </a>
              </h2>
            );
          },
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "log";
            const isInline = !String(children).includes("\n");

            if (isInline) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }

            return (
              <SyntaxHighlighter
                style={coldarkDark}
                language={language}
                PreTag="div"
                useInlineStyles={false}
                codeTagProps={{
                  className: language ? `language-${language}` : undefined,
                  style: {},
                }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {markdownContent}
      </Markdown>
    </article>
  );
};

export default Article;
