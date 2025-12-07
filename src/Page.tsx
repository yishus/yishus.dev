import type { PropsWithChildren } from "react";

interface PageProps {
  pageType?: "notes" | "article";
}

const Page = ({ children, pageType }: PropsWithChildren<PageProps>) => {
  const stylesPath =
    pageType === "notes" ? "./styles/main.css" : "../styles/main.css";
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        <meta name="description" content="" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href={stylesPath} />
      </head>

      <body>
        <nav>
          <ul>
            <li>
              <a href="/notes">Notes</a>
            </li>
            <li>
              <a href="/">Writings</a>
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
