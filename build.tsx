import fs from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import Article from "./src/Article";
import Page from "./src/Page";
import { generateOGImage } from "./src/generateOGImage";

const distPath = path.join(__dirname, "dist");
const notesPath = path.join(__dirname, "src", "notes");
const articlesPath = path.join(__dirname, "src", "articles");
const assetsPath = path.join(__dirname, "src", "assets");

interface ArticleMetadata {
  title: string;
  date?: string;
  description?: string;
}

const extractMetadata = (markdown: string): ArticleMetadata => {
  const titleMatch = markdown.match(/<title>(.*?)<\/title>/);
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  const dateMatch = markdown.match(/<time datetime="([^"]+)">/);
  const descriptionMatch = markdown.match(
    /^(?:(?:# [^\n]*\n|<[a-z]+[^>]*>[\s\S]*?<\/[a-z]+>)\s*)*\s*([^#<\n][^\n]*)/m,
  );

  const title = titleMatch?.[1] || h1Match?.[1] || "Article";
  const date = dateMatch?.[1];
  const description = descriptionMatch?.[1];

  return { title, date, description };
};

const NOTES_PER_PAGE = 10;

const extractNoteTitle = (markdown: string): string => {
  const match = markdown.match(/^##\s+(.+)$/m);
  return match?.[1] || "Untitled";
};

const titleToHeadingId = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

const buildNotesPage = () => {
  const files = fs
    .readdirSync(notesPath)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .reverse();

  const notes = files.map((file) => {
    const fileContent = fs.readFileSync(path.join(notesPath, file), "utf-8");
    const title = extractNoteTitle(fileContent);
    const headingId = titleToHeadingId(title);
    return { file, fileContent, title, headingId };
  });

  const totalPages = Math.max(1, Math.ceil(notes.length / NOTES_PER_PAGE));

  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * NOTES_PER_PAGE;
    const pageNotes = notes.slice(start, start + NOTES_PER_PAGE);

    const sidebar = (
      <aside className="notes-sidebar">
        <ul>
          {pageNotes.map((note) => (
            <li key={note.file}>
              <a href={`#${note.headingId}`}>{note.title}</a>
            </li>
          ))}
        </ul>
      </aside>
    );

    const pagination = totalPages > 1 && (
      <nav className="pagination">
        {page > 1 ? (
          <a href={page === 2 ? "/notes/" : `/notes/${page - 1}/`}>
            &larr; Newer
          </a>
        ) : (
          <span />
        )}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <a href={`/notes/${page + 1}/`}>Older &rarr;</a>
        ) : (
          <span />
        )}
      </nav>
    );

    const content = pageNotes.map((note) => (
      <Article key={note.file} markdownContent={note.fileContent} />
    ));

    const htmlContent = renderToStaticMarkup(
      <Page pageType="notes" title="Notes" description="Scattered jotted notes">
        <title>Notes</title>
        <div className="notes-layout">
          {sidebar}
          <div className="notes-content">
            {content}
            {pagination}
          </div>
        </div>
      </Page>,
    );

    const pageDir =
      page === 1 ? `${distPath}/notes` : `${distPath}/notes/${page}`;
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(
      `${pageDir}/index.html`,
      `<!DOCTYPE html>\n${htmlContent}`,
    );
  }
};

const buildArticlePages = async () => {
  const files = fs.readdirSync(articlesPath);

  for (const file of files) {
    const fileContent = fs.readFileSync(path.join(articlesPath, file), "utf-8");
    const filename = file.replace(".md", "");
    const { title, date, description } = extractMetadata(fileContent);

    // Generate OG image
    const ogImageOutputPath = path.join(
      distPath,
      "images",
      "og",
      `${filename}.png`,
    );
    await generateOGImage(title, date, filename, ogImageOutputPath);

    const ogImagePath = `https://yishus.dev/images/og/${filename}.png`;

    const htmlContent = renderToStaticMarkup(
      <Page
        pageType="article"
        ogImage={ogImagePath}
        title={title}
        description={description}
      >
        <Article markdownContent={fileContent} />
      </Page>,
    );

    fs.mkdirSync(distPath + `/${filename}`, {
      recursive: true,
    });
    const htmlFilePath = distPath + `/${filename}/index.html`;
    fs.writeFileSync(htmlFilePath, `<!DOCTYPE html>\n${htmlContent}`);
  }
};

const copyAssets = () => {
  fs.cpSync(assetsPath, distPath, { recursive: true });
};

const build = async () => {
  fs.mkdirSync(distPath, { recursive: true });
  buildNotesPage();
  await buildArticlePages();
  copyAssets();
};

build();
