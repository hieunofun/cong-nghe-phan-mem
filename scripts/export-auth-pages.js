const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const outputDir = path.join(projectRoot, 'code-gui-ban');

const css = fs.readFileSync(path.join(publicDir, 'css', 'style.css'), 'utf8');
const scripts = [
  'env.js',
  'api.js',
  'social-login.js',
  'auth.js'
].map((fileName) => ({
  source: `/js/${fileName}`,
  code: fs
    .readFileSync(path.join(publicDir, 'js', fileName), 'utf8')
    .replace(/<\/script/gi, '<\\/script')
}));

function bundlePage(sourceFile, outputFile) {
  let html = fs.readFileSync(path.join(publicDir, sourceFile), 'utf8');

  html = html.replace(
    '<link rel="stylesheet" href="/css/style.css">',
    `<style>\n${css}\n</style>`
  );

  scripts.forEach(({ source, code }) => {
    html = html.replace(
      `<script src="${source}"></script>`,
      `<script>\n${code}\n</script>`
    );
  });

  html = html.replace(
    '<!DOCTYPE html>',
    '<!DOCTYPE html>\n<!-- File doc lap duoc xuat tu du an JobLink. Cac chuc nang tai khoan can backend JobLink. -->'
  );

  fs.writeFileSync(path.join(outputDir, outputFile), html, 'utf8');
}

fs.mkdirSync(outputDir, { recursive: true });
bundlePage('login.html', 'trang-dang-nhap.html');
bundlePage('register.html', 'trang-dang-ky.html');

console.log(`Da tao 2 file tai: ${outputDir}`);
