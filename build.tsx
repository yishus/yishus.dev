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
const stylesPath = path.join(__dirname, "src", "styles");
const imagesPath = path.join(__dirname, "src", "images");

const buildNotesPage = () => {
  const files = fs.readdirSync(notesPath);
  const content = files.map((file) => {
    return fs.readFileSync(path.join(notesPath, file), "utf-8");
  });
  const htmlContent = renderToStaticMarkup(
    <Page pageType="notes">
      <title>Notes</title>
      <Notes markdownContent={content} />
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
  fs.cpSync(stylesPath, path.join(distPath, "styles"), { recursive: true });
  fs.cpSync(imagesPath, path.join(distPath, "images"), { recursive: true });
  fs.copyFileSync(srcPath + "/index.html", distPath + "/index.html");
  fs.copyFileSync(srcPath + "/404.html", distPath + "/404.html");
};

const build = () => {
  fs.mkdirSync(distPath, { recursive: true });
  buildNotesPage();
  buildArticlePages();
  copyAssets();
};

build();
