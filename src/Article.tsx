import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

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
        }}
      >
        {markdownContent}
      </Markdown>
    </article>
  );
};

export default Article;
