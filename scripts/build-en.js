/**
 * Builds the English version: "Serene Flow"
 * Temporarily patches productName and default lang, then restores after build.
 */
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root      = path.join(__dirname, '..');
const appJsPath = path.join(root, 'renderer/app.js');
const pkgPath   = path.join(root, 'package.json');

const origAppJs = fs.readFileSync(appJsPath, 'utf8');
const origPkg   = fs.readFileSync(pkgPath, 'utf8');

try {
  // Patch default lang zh → en
  const patchedAppJs = origAppJs.replace(
    "lang: 'zh' };",
    "lang: 'en' };"
  );
  if (patchedAppJs === origAppJs) {
    throw new Error('Could not find default lang setting to patch — check renderer/app.js');
  }

  // Patch productName
  const pkg = JSON.parse(origPkg);
  pkg.productName           = 'Serene Flow';
  pkg.build.productName     = 'Serene Flow';
  pkg.build.dmg.title       = 'Serene Flow';

  fs.writeFileSync(appJsPath, patchedAppJs);
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  console.log('Building Serene Flow (English)…');
  execSync('npx electron-builder --mac', { stdio: 'inherit', cwd: root });

  console.log('\n✓ English build complete. Files in dist/');
} finally {
  fs.writeFileSync(appJsPath, origAppJs);
  fs.writeFileSync(pkgPath, origPkg);
  console.log('✓ Restored original source files');
}
