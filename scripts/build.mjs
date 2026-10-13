import fs from 'node:fs/promises';
import path from 'node:path';
import {root,copyDir,readJson,sha256} from './lib.mjs';

const dist=path.join(root,'dist');
await fs.rm(dist,{recursive:true,force:true});
await fs.mkdir(path.join(dist,'data'),{recursive:true});
await copyDir(path.join(root,'src'),dist);
const [platforms,catalog,offers]=await Promise.all(['platforms','catalog','offers'].map(name=>readJson(`data/${name}.json`)));
for(const name of ['platforms.json','catalog.json','offers.json'])await fs.copyFile(path.join(root,'data',name),path.join(dist,'data',name));

const manifest={
  releaseId:`${new Date().toISOString().replace(/[:.]/g,'-')}-${sha256(JSON.stringify([catalog.items,offers.items])).slice(0,8)}`,
  builtAt:new Date().toISOString(),
  contentRevision:sha256(JSON.stringify([platforms.items,catalog.items,offers.items])),
  platformCount:platforms.items.length,
  modelCount:catalog.items.length,
  offerCount:offers.items.filter(item=>item.status==='active').length,
  categoryCount:new Set(catalog.items.flatMap(item=>item.categories??[])).size,
  sourceCount:0
};
await fs.writeFile(path.join(dist,'release.json'),JSON.stringify(manifest,null,2)+'\n');

const [html,css,app]=await Promise.all([
  fs.readFile(path.join(root,'src/index.html'),'utf8'),
  fs.readFile(path.join(root,'src/assets/styles.css'),'utf8'),
  fs.readFile(path.join(root,'src/assets/app.js'),'utf8')
]);
const embedded=JSON.stringify({platforms,catalog,offers}).replace(/</g,'\\u003c');
const standalone=html
  .replace('<link rel="stylesheet" href="./assets/styles.css">',`<style>${css}</style>`)
  .replace('<script type="module" src="./assets/app.js"></script>',`<script>globalThis.__AI_OPPORTUNITY_DATA__=${embedded};</script><script type="module">${app}</script>`);
await fs.writeFile(path.join(dist,'standalone.html'),standalone);
await fs.writeFile(path.join(root,'standalone.html'),standalone);
console.log(`构建完成：平台 ${platforms.items.length} 个，模型 ${catalog.items.length} 个，限时福利 ${offers.items.filter(item=>item.status==='active').length} 个；已生成 standalone.html。`);
