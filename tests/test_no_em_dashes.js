'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const banner=String.fromCodePoint(0x2014);
const sitePaths=fs.readdirSync(root,{withFileTypes:true})
 .filter(x=>x.isFile()&&/\.(?:js|css|html|webmanifest)$/.test(x.name))
 .map(x=>x.name)
 .concat(fs.readdirSync(path.join(root,'data')).filter(x=>x.endsWith('.json')).map(x=>'data/'+x))
 .concat(['workers/ask-fig/src/index.js','workers/boekmuse-v2/src/index.js','assets/avatars/hayden-2026.svg']);
const violations=[];
for(const file of sitePaths){
 const content=fs.readFileSync(path.join(root,file),'utf8');
 if(content.includes(banner))violations.push(file);
}
assert.deepEqual(violations,[],'Em dash glyphs must not appear in any published frontend text assets: '+violations.join(', '));
console.log('No em dash glyphs in '+sitePaths.length+' public website text assets');
