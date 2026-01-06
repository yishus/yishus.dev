import fs from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import Article from "./src/Article";
import Notes from "./src/Notes";
import Page from "./src/Page";
import { generateOGImage } from "./src/generateOGImage";

const distPath = path.join(__dirname, "dist");
const srcPath = path.join(__dirname, "src");
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
    /^(?:(?:# [^\n]*\n|<[a-z]+[^>]*>[\s\S]*?<\/[a-z]+>)\s*)*\s*([^#<\n][^\n]*)/m
  );

  const title = titleMatch?.[1] || h1Match?.[1] || "Article";
  const date = dateMatch?.[1];
  const description = descriptionMatch?.[1];

  return { title, date, description };
};

const buildNotesPage = () => {
  const directoryContent = fs.readdirSync(notesPath, {
    withFileTypes: true,
    recursive: true,
  });
  const directories = directoryContent
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => path.join(dirent.parentPath, dirent.name))
    .sort()
    .reverse();
  const files = directoryContent.filter((dirent) => dirent.isFile());
  const content = directories.map((directory) => {
    const filesInDir = files.filter((file) => file.parentPath === directory);
    const fileContents = filesInDir.map((file) =>
      fs.readFileSync(path.join(file.parentPath, file.name), "utf-8")
    );
    return (
      <Notes date={directory} markdownContent={fileContents} key={directory} />
    );
  });
  const htmlContent = renderToStaticMarkup(
    <Page pageType="notes" title="Notes" description="Scattered jotted notes">
      <title>Notes</title>
      {content}
    </Page>
  );
  fs.writeFileSync(distPath + "/notes.html", `<!DOCTYPE html>\n${htmlContent}`);
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
      `${filename}.png`
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
      </Page>
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
