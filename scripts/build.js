const babel = require("@babel/core");
const fs = require("fs");
const mdx = require("@mdx-js/mdx");
const { mdx: createElement } = require("@mdx-js/react");
const path = require("path");
const React = require("react");
const ReactDOMServer = require("react-dom/server");

const utils = require("./utils");

const output = path.resolve(__dirname, "../public");
const static = path.resolve(__dirname, "../static");
const blog = path.resolve(__dirname, "../src/blog");

const transform = code =>
  babel.transform(code, {
    plugins: ["@babel/plugin-transform-react-jsx"]
  }).code;

if (fs.existsSync(output)) {
  utils.deleteFolderRecursive(output);
}

utils.copyFolderRecursiveSync(static, output);

fs.mkdirSync(path.join(output, "blog"));

// Convert blog mdx files
const files = fs.readdirSync(blog);
files.forEach(function(file) {
  if (path.extname(file) !== ".mdx") {
    return;
  }

  const curSource = path.join(blog, file);
  const mdxText = fs.readFileSync(curSource, "utf8");
  const jsx = mdx.sync(mdxText, { skipExport: true });
  const code = transform(jsx);
  const scope = { mdx: createElement };

  const fn = new Function(
    "React",
    ...Object.keys(scope),
    `${code}; return React.createElement(MDXContent)`
  );

  const element = fn(React, ...Object.values(scope));
  const html = ReactDOMServer.renderToStaticMarkup(element);

  fs.mkdirSync(path.join(output, "blog", path.basename(file, ".mdx")));
  fs.writeFileSync(
    path.join(output, "blog", path.basename(file, ".mdx"), "index.html"),
    html
  );
});
