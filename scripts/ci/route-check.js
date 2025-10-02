const fs = require('fs');
const path = require('path');

function loadAll(dir) {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) return 0;
  let count = 0;
  for (const f of fs.readdirSync(full)) {
    const p = path.join(full, f);
    if (fs.statSync(p).isFile() && f.endsWith('.js')) {
      try { require(p); count++; }
      catch (e) { console.error('Failed to require', p, e.message); process.exit(2); }
    }
  }
  return count;
}

const routes = loadAll('routes');
const middlewares = loadAll('middlewares');
console.log(`[ci] storage route-check ok (routes=${routes}, middlewares=${middlewares})`);

