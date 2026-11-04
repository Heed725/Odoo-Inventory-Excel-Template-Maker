(function(root){
'use strict';
const fields = [
 ['name','Name',['product','product name','item','item name','description','jina','product description','item description','jina la bidhaa','bidhaa']],
 ['default_code','Internal Reference',['sku','code','item code','product code','reference','internal reference','item number','product number','stock code','part number','item no','product no','namba ya bidhaa']],
 ['barcode','Barcode',['ean','ean13','upc','bar code','ean code','barcode number']],
 ['list_price','Sales Price',['price','selling price','sale price','sales price','retail price','unit price','sell price','rrp','bei ya kuuza']],
 ['standard_price','Cost',['buying price','purchase price','unit cost','cost price','buy price','purchase cost','bei ya kununua']],
 ['categ_id','Product Category',['category','product category','category name','product group','item category','kundi la bidhaa']],
 ['uom_id','Unit of Measure',['uom','unit','units','unit of measure','sales uom','unit of measurement','kipimo']],
 ['uom_ids','Packagings',['packaging','packagings']],
 ['type','Product Type',['type','product type']],
 ['is_storable','Track Inventory',['track inventory','stockable','storable']],
 ['sale_ok','Sales',['can be sold','sale ok','sellable']],
 ['purchase_ok','Purchase',['can be purchased','purchase ok']],
 ['available_in_pos','Available in POS',['pos','available in pos','point of sale']],
 ['pos_categ_ids','Point of Sale Categories',['pos category','pos categories','point of sale category','point of sale categories','pos product category','pos product categories']],
 ['company_id','Company',['company','company name']],
 ['id','External ID',['external id','xml id','xmlid']],
 ['description_sale','Sales Description',['sales description','sale description']],
 ['weight','Weight',['weight','weight kg']], ['volume','Volume',['volume']],
 ['categ_id/id','Product Category / External ID',['category external id','product category external id']],
 ['pos_categ_ids/id','POS Categories / External ID',['pos category external id','pos categories external id']],
 ['company_id/id','Company / External ID',['company external id']],
 ['uom_id/id','Unit of Measure / External ID',['uom external id','unit of measure external id']]
].map(([key,label,aliases])=>({key,label,aliases}));
const numbers=new Set(['list_price','standard_price','weight','volume']);
const booleans=new Set(['is_storable','sale_ok','purchase_ok','available_in_pos']);
const normalize=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const compact=s=>normalize(s).replace(/\s/g,'');
function distance(a,b){if(a.length===b.length){const ix=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])ix.push(i);if(ix.length===2&&ix[1]===ix[0]+1&&a[ix[0]]===b[ix[1]]&&a[ix[1]]===b[ix[0]])return 1;}const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let last=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const old=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,last+(a[i-1]===b[j-1]?0:1));last=old;}}return d[b.length];}
function suggest(header){
 const raw=String(header??'').trim(),exact=fields.find(f=>f.key===raw);
 if(exact)return {key:exact.key,score:1,reason:'Odoo field name'};
 const input=normalize(raw),s=compact(input);
 if(!s)return {key:'',score:0,reason:'Empty heading'};
 const candidates=fields.map(f=>{
  const names=[f.label,...f.aliases,...(f.key==='id'?[]:[f.key])];
  let score=0,reason='';
  for(const name of names){const target=compact(name);let value=0,why='';
   if(s===target){value=.98;why='Recognized column name';}
   else if(['list_price','standard_price'].includes(f.key)&&compact(input.replace(/\b(?:tzs|tsh|tshs|usd|eur|gbp|kes|ksh|ugx|rwf)\b/g,''))===target){value=.96;why='Price heading with currency';}
   else if(Math.min(s.length,target.length)>=7&&Math.max(s.length,target.length)<=60){const edits=distance(s,target);if(edits<=2){const similarity=1-edits/Math.max(s.length,target.length);if(similarity>=.85){value=similarity*.95;why='Possible spelling variation';}}}
   if(value>score){score=value;reason=why;}
  }return {key:f.key,score,reason};
 }).sort((a,b)=>b.score-a.score);
 const best=candidates[0],next=candidates[1];
 if(best.score<.8||best.score-next.score<.07)return {key:'',score:0,reason:'No clear match. Choose a field or leave skipped.'};
 return best;
}
function match(header){return suggest(header).key;}
function autoMap(headers){
 const results=headers.map(suggest),used=new Set();
 // Strong matches take priority even when an approximate heading appears first.
 [...results.keys()].sort((a,b)=>results[b].score-results[a].score).forEach(i=>{
  const s=results[i];if(!s.key)return;if(used.has(s.key))results[i]={key:'',score:0,reason:'Another column already matches this Odoo field.'};else used.add(s.key);
 });return results;
}
function detectHeaderRow(matrix){
 let row=1,best=0;matrix.slice(0,100).forEach((cells,i)=>{
  const count=autoMap(cells).filter(s=>s.key&&s.score>=.95).length;
  if(count>best){best=count;row=i+1;}
 });return row;
}
const text=v=>String(v??'').trim();
function numeric(v){if(typeof v==='number')return Number.isFinite(v)?v:NaN;const s=text(v);if(!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s))return NaN;return Number(s.replace(/,/g,''));}
function convert(rows, mappings, options={}){
 const errors=[],warnings=[],out=[],keys=[];
 const issue=(list,row,message)=>list.push({row,message});
 const counts=new Map();mappings.filter(Boolean).forEach(k=>counts.set(k,(counts.get(k)||0)+1));
 for(const [k,n] of counts)if(n>1)issue(errors,null,`${fields.find(f=>f.key===k)?.label||k} is mapped more than once.`);
 if(!mappings.includes('name'))issue(errors,null,'Map a source column to Name.');
 mappings.filter(Boolean).forEach(k=>{if(!keys.includes(k))keys.push(k);});
 Object.entries(options.defaults||{}).forEach(([k,v])=>{if(text(v)&&!keys.includes(k))keys.push(k);});
 if(options.generateIds&&!keys.includes('id'))keys.push('id');
 if(options.generateIds&&!mappings.includes('default_code'))issue(errors,null,'Map Internal Reference to generate stable External IDs.');
 const seen={id:new Map(),barcode:new Map(),default_code:new Map()};
 rows.forEach((source,index)=>{
  if(source.every(v=>!text(v)))return;
  const row=index+(options.headerRow||1)+1,obj={};
  mappings.forEach((key,col)=>{if(key)obj[key]=source[col]??'';});
  for(const [key,v] of Object.entries(options.defaults||{})){
   const counterpart=key.endsWith('/id')?key.slice(0,-3):key+'/id';
   if(!text(obj[key])&&!text(obj[counterpart])&&text(v))obj[key]=v;
  }
  for(const k of keys){let v=obj[k]??'';
   if(numbers.has(k)&&text(v)){const n=numeric(v);if(!Number.isFinite(n))issue(errors,row,`${k}: “${text(v)}” is not a valid number (use 1,250.50 or 1250.50).`);else{v=n;if(n<0)issue(warnings,row,`${k} is negative.`);}}
   else if(booleans.has(k)&&text(v)){const s=normalize(v);if(['true','yes','1','y'].includes(s))v='True';else if(['false','no','0','n'].includes(s))v='False';else issue(errors,row,`${k}: use Yes/No, True/False, or 1/0.`);}
   else v=text(v);
   if(k==='type'&&text(v)){const s=normalize(v);if(['goods','consu','consumable','consumables','stockable','storable','product'].includes(s)){if(['stockable','storable'].includes(s)&&!text(obj.is_storable)){obj.is_storable='True';if(!keys.includes('is_storable'))keys.push('is_storable');}v='consu';}else if(['service','services'].includes(s))v='service';else if(s==='combo')v='combo';else issue(errors,row,`Product Type “${v}” is unknown. Use Goods, Service, or Combo.`);}
   obj[k]=v;
  }
  if(!text(obj.name))issue(errors,row,'Product name is missing.');
  if(options.prefixReference&&text(obj.default_code)&&text(obj.name)&&!text(obj.name).startsWith(`(${obj.default_code}) `))obj.name=`(${obj.default_code}) ${obj.name}`;
  if(options.generateIds&&!text(obj.id)){if(!text(obj.default_code))issue(errors,row,'Internal reference is required to generate an External ID.');else obj.id='inventory_product_'+Array.from(text(obj.default_code)).map(c=>c.codePointAt(0).toString(16)).join('_');}
  for(const k of ['categ_id','company_id','uom_id','pos_categ_ids'])if(text(obj[k])&&text(obj[k+'/id']))issue(errors,row,`Use either ${k} by name or its External ID, not both on the same row.`);
  if(obj.type==='service'&&obj.is_storable==='True')issue(errors,row,'Services cannot have Track Inventory enabled.');
  if(obj.available_in_pos==='True'&&obj.sale_ok==='False')issue(errors,row,'A product available in POS must be enabled for Sales.');
  for(const k of Object.keys(seen)){const v=text(obj[k]);if(!v)continue;if(seen[k].has(v)){const msg=`Duplicate ${fields.find(f=>f.key===k).label} “${v}” (also row ${seen[k].get(v)}).`;issue(k==='default_code'?warnings:errors,row,msg);}else seen[k].set(v,row);}
  out.push(obj);
 });
 if(!out.length)issue(errors,null,'No product rows found under the selected header row.');
 const activeKeys=keys.filter(k=>out.some(r=>text(r[k])));
 return {keys:activeKeys,rows:out.map(r=>activeKeys.map(k=>r[k]??'')),errors,warnings};
}
const api={fields,match,suggest,autoMap,detectHeaderRow,convert,numeric};if(typeof module!=='undefined')module.exports=api;else root.InventoryCore=api;
})(typeof window!=='undefined'?window:globalThis);
