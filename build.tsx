import fs from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";

import Article from "./src/Article";
import Notes from "./src/Notes";
import Page from "./src/Page";

const distPath = path.join(__dirname, "dist");
const srcPath = path.join(__dirname, "src");
const notesPath = path.join(__dirname, "src", "notes");
const articlesPath = path.join(__dirname, "src", "articles");
const assetsPath = path.join(__dirname, "src", "assets");

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
      fs.readFileSync(path.join(file.parentPath, file.name), "utf-8"),
    );
    return (
      <Notes date={directory} markdownContent={fileContents} key={directory} />
    );
  });
  const htmlContent = renderToStaticMarkup(
    <Page pageType="notes">
      <title>Notes</title>
      {content}
    </Page>,
  );
  fs.writeFileSync(distPath + "/notes.html", `<!DOCTYPE html>\n${htmlContent}`);
};

const buildArticlePages = () => {
  const files = fs.readdirSync(articlesPath);
  files.forEach((file) => {
    const fileContent = fs.readFileSync(path.join(articlesPath, file), "utf-8");
    const htmlContent = renderToStaticMarkup(
      <Page pageType="article">
        <Article markdownContent={fileContent} />
      </Page>,
    );
    fs.mkdirSync(distPath + `/${file.replace(".md", "")}`, {
      recursive: true,
    });
    const htmlFilePath = distPath + `/${file.replace(".md", "")}/index.html`;
    fs.writeFileSync(htmlFilePath, `<!DOCTYPE html>\n${htmlContent}`);
  });
};

const copyAssets = () => {
  fs.cpSync(assetsPath, distPath, { recursive: true });
};

const build = () => {
  fs.mkdirSync(distPath, { recursive: true });
  buildNotesPage();
  buildArticlePages();
  copyAssets();
};

build();
