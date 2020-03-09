const fs = require("fs");
const path = require("path");

const copyFolderRecursiveSync = function(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach(function(file) {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
};

const deleteFolderRecursive = function(source) {
  if (fs.existsSync(source)) {
    fs.readdirSync(source).forEach((file, index) => {
      const curPath = path.join(source, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(source);
  }
};

module.exports = {
  copyFolderRecursiveSync,
  deleteFolderRecursive
};
