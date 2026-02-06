import type { PropsWithChildren } from "react";

interface PageProps {
  pageType?: "notes" | "article";
  ogImage?: string;
  title?: string;
  description?: string;
}

const Page = ({
  children,
  pageType,
  ogImage,
  title,
  description,
}: PropsWithChildren<PageProps>) => {
  const stylesPath =
    pageType === "notes"
      ? ["./styles/main.css", "./styles/prism-colddark.css"]
      : ["../styles/main.css", "../styles/prism-colddark.css"];
  const scriptPath = pageType === "notes" ? "./main.js" : "../main.js";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {stylesPath.map((path) => (
          <link key={path} rel="stylesheet" href={path} />
        ))}
        <script src={scriptPath} defer />
        {ogImage && (
          <>
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:image" content={ogImage} />
          </>
        )}
        {title && (
          <>
            <meta property="og:title" content={title} />
            <meta name="twitter:title" content={title} />
          </>
        )}
        {description && (
          <>
            <meta property="og:description" content={description} />
            <meta name="twitter:description" content={description} />
          </>
        )}
      </head>

      <body>
        <nav>
          <ul>
            <li>
              <a href="/notes">Notes</a>
            </li>
            <li>
              <a href="/writing">Writing</a>
            </li>
            <li>
              <button id="theme-toggle" aria-label="Toggle dark mode">
                <span id="theme-icon">☀️</span>
              </button>
            </li>
          </ul>
        </nav>
        <main>
          {pageType === "notes" && <h1>Notes</h1>}
          {children}
        </main>
        <footer>
          <ul>
            <li>
              <a href="https://github.com/yishus">github</a>
            </li>
            <li>
              <a href="https://twitter.com/yishusee">twitter</a>
            </li>
          </ul>
        </footer>
      </body>
    </html>
  );
};

export default Page;
