const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
const XLSX=require('../vendor/xlsx.full.min.js');
test('auto maps technical names, labels and common source aliases',()=>{
 for(const [header,key] of [['Product Name','name'],['SKU','default_code'],['Selling Price','list_price'],['Barcode','barcode'],['categ_id/id','categ_id/id'],['Point of Sale Categories','pos_categ_ids']])assert.equal(C.match(header),key);
 assert.equal(C.match('On hand quantity'),'');
});
test('converts data, preserves identifiers and applies defaults only to blanks',()=>{
 const r=C.convert([['Water','0012','0623456789012','1,250.50','yes',''],['Juice','0013','0623456789013','0','no','Other']],['name','default_code','barcode','list_price','available_in_pos','company_id'],{defaults:{company_id:'Livingstone Shop',type:'consu'},prefixReference:true});
 assert.deepEqual(r.errors,[]);assert.equal(r.rows[0][r.keys.indexOf('barcode')],'0623456789012');assert.equal(r.rows[0][r.keys.indexOf('list_price')],1250.5);assert.equal(r.rows[1][r.keys.indexOf('list_price')],0);assert.equal(r.rows[0][r.keys.indexOf('name')],'(0012) Water');assert.equal(r.rows[1][r.keys.indexOf('company_id')],'Other');
});
test('reports source row numbers, invalid numbers, duplicate keys and booleans',()=>{
 const r=C.convert([['','X','abc','maybe'],['A','X','3','true']],['name','id','list_price','available_in_pos'],{headerRow:3});
 assert.equal(r.errors.length,4);assert.equal(r.errors[0].row,4);assert.ok(r.errors.some(e=>e.message.includes('Duplicate External ID')));
});
test('generated IDs are stable across order changes and distinct for punctuation',()=>{
 const rows=[['Water','A-B'],['Juice','A B']];const a=C.convert(rows,['name','default_code'],{generateIds:true}),b=C.convert([...rows].reverse(),['name','default_code'],{generateIds:true});
 const ix=a.keys.indexOf('id');assert.notEqual(a.rows[0][ix],a.rows[1][ix]);assert.equal(a.rows[0][ix],b.rows[1][ix]);
});
test('rejects duplicate mapping, conflicting relations and service inventory',()=>{
 assert.ok(C.convert([['A','B']],['name','name']).errors.some(e=>e.message.includes('more than once')));
 const r=C.convert([['A','service','yes','Drinks','__export__.cat']],['name','type','is_storable','categ_id','categ_id/id']);assert.equal(r.errors.length,2);
});
test('normalizes legacy storable type into Odoo 19 goods with inventory tracking',()=>{
 const r=C.convert([['Bolt','storable'],['Service','service']],['name','type']);assert.equal(r.rows[0][r.keys.indexOf('type')],'consu');assert.equal(r.rows[0][r.keys.indexOf('is_storable')],'True');assert.deepEqual(r.errors,[]);
});
test('does not add company-name default over a supplied company External ID',()=>{
 const r=C.convert([['A','__export__.company']],['name','company_id/id'],{defaults:{company_id:'Shop'}});assert.deepEqual(r.errors,[]);assert.ok(!r.keys.includes('company_id'));
});
test('blank rows are skipped, empty data rejected, duplicate barcode blocked',()=>{
 assert.equal(C.convert([[''],['A']],['name']).rows.length,1);assert.ok(C.convert([['']],['name']).errors.length);
 assert.ok(C.convert([['A','001'],['B','001']],['name','barcode']).errors.some(e=>e.message.includes('Duplicate Barcode')));
});
test('XLSX round trip keeps barcode zeros and formula-like names as text',()=>{
 const ws=XLSX.utils.aoa_to_sheet([['name','barcode','list_price'],['=Example','0012345678901',123.5]]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Products');const bytes=XLSX.write(wb,{bookType:'xlsx',type:'buffer'}),out=XLSX.read(bytes,{type:'buffer'}).Sheets.Products;
 assert.equal(out.B2.v,'0012345678901');assert.equal(out.A2.t,'s');assert.equal(out.A2.f,undefined);assert.equal(out.C2.v,123.5);
});
