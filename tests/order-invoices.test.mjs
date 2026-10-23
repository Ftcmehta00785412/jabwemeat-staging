// Local-only PostgreSQL/WASM integration tests. Never connects to Supabase.
// Run from repository root: bun -i tests/order-invoices.test.mjs
import {PGlite} from '@electric-sql/pglite';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const db=new PGlite();
const base=await readFile(root+'supabase/migrations/001_jabwemeat_commerce.sql','utf8');
const table=(name)=>base.match(new RegExp(`create table public\\.${name} \\([\\s\\S]*?\\n\\);`))[0];
await db.exec(`create role anon; create role authenticated; create role service_role;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email',current_setting('test.email',true)) $$;
create type public.order_status as enum ('new','confirmed','cancelled');
create table public.team_members(email text,role text,status text);
create table public.role_permissions(role text,area text,permission text);
insert into public.role_permissions values ('Admin','Invoices','Full'),('Manager','Invoices','View'),('Staff','Orders','Full');
insert into public.team_members values ('admin@example.test','Admin','Active'),('manager@example.test','Manager','Active'),('staff@example.test','Staff','Active');
create sequence public.order_number_seq start 1001;
create table public.products(id uuid primary key,sku text,name text,price numeric(10,2),stock integer,active boolean);
${table('delivery_slots')}
${table('store_settings')}
${table('orders')}
alter table public.orders add column area text;
${table('order_items')}
create function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text) returns jsonb language sql as $$ select '{}'::jsonb $$;`);
const permissionSQL=await readFile(root+'supabase/migrations/005_role_permissions.sql','utf8');
for(const name of ['current_team_role','has_role_permission']) {
  await db.exec(permissionSQL.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`))[0]);
}
const cod=await readFile(root+'supabase/migrations/015_cod_backend_hardened_checkout.sql','utf8');
await db.exec(cod.split('-- Explicit privacy boundary.')[0]+'commit;');
await db.exec(`insert into public.store_settings(key,value) values ('cod_enabled','true'),('serviceable_pins','["834002","834003","834004"]');
update public.store_settings set value='true' where key='ordering_enabled';
insert into public.delivery_slots(id,label,start_time,end_time,capacity) values ('10000000-0000-0000-0000-000000000001','Fixture','10:00','12:00',20);
insert into public.products values ('20000000-0000-0000-0000-000000000001','FIXTURE','Saved product',299.04,100,true);`);
await db.exec(await readFile(root+'supabase/migrations/021_order_invoice_records.sql','utf8'));
const checks=[];
const q=async(sql,params=[]) => (await db.query(sql,params)).rows;
const fails=async(sql,pattern)=>{await assert.rejects(()=>db.exec(sql),pattern);};
const key='30000000-0000-0000-0000-000000000001';
const args=[
  'fixture-session-key-one','Buyer','buyer@example.test','9876543210',
  JSON.stringify({line1:'Fixture road 12',city:'Ranchi',state:'Jharkhand'}),'834003',
  '10000000-0000-0000-0000-000000000001',
  JSON.stringify([{product_id:'20000000-0000-0000-0000-000000000001',quantity:1}]),key
];
const checkout=`select public.place_cod_order($1,$2,$3,$4,$5::jsonb,$6,((clock_timestamp() at time zone 'Asia/Kolkata')::date+1),$7::uuid,$8::jsonb,null,$9::uuid,null) receipt`;
await db.exec('begin;');
const receipt=(await q(checkout,args))[0].receipt;
assert.equal((await q('select count(*)::int n from public.order_items'))[0].n,1);
assert.equal((await q('select count(*)::int n from public.order_invoices'))[0].n,0,'snapshot genuinely deferred');
await db.exec('commit;');
let invoice=(await q('select * from public.order_invoices'))[0];
assert.equal(invoice.order_id,receipt.order_id);
assert.equal(invoice.snapshot.items[0].name,'Saved product');
assert.equal(invoice.snapshot.hsn_status,'not_supplied');
assert.equal(invoice.snapshot.totals.gst_amount,53.83);
assert.equal(invoice.snapshot.totals.cgst_amount,26.92);
assert.equal(invoice.snapshot.totals.sgst_amount,26.91);
assert.equal((await q('select invoice_number from public.orders where id=$1',[receipt.order_id]))[0].invoice_number,invoice.invoice_number);
assert.ok(invoice.invoice_number.length<=16);
checks.push('Real 015 COD checkout commits with item-complete deferred snapshot and odd-paisa split');
assert.deepEqual((await q(checkout,args))[0].receipt,receipt);
assert.equal((await q('select count(*)::int n from public.order_invoices'))[0].n,1);
await db.exec(`set test.email='admin@example.test'; set role authenticated;`);
assert.equal((await q('select public.ensure_order_invoice($1::uuid) i',[receipt.order_id]))[0].i.id,invoice.id);
await db.exec('reset role;');
checks.push('Replay and repeated admin ensure preserve one invoice and its original number');

// No anonymous or ordinary authenticated table access, even knowing the order id.
await db.exec('set role anon;');
await fails('select * from public.order_invoices',/permission denied/);
await fails('select * from public.cod_order_requests',/permission denied/);
assert.equal((await q('select public.get_order_invoice($1::uuid) i',[receipt.order_id]))[0].i,null);
assert.equal((await q('select public.get_order_invoice(null) i'))[0].i,null);
assert.equal((await q("select public.get_order_invoice('00000000-0000-0000-0000-000000000000') i"))[0].i,null);
assert.deepEqual((await q('select public.get_order_invoice($1::uuid) i',[key]))[0].i.snapshot,invoice.snapshot);
for(const capability of [key,null,receipt.order_id]) {
  await db.exec('begin;');
  await q('select public.get_order_invoice($1::uuid)',[capability]);
  const headers=(await q("select current_setting('response.headers')::jsonb headers"))[0].headers;
  assert.deepEqual(headers,[{'Cache-Control':'private, no-store'}]);
  await db.exec('commit;');
}
checks.push('PII RPC sets transaction-local PostgREST private, no-store header for valid, null and invalid capabilities');
await fails(`select public.create_order_invoice_snapshot('${receipt.order_id}')`,/permission denied/);
await fails(`select public.ensure_order_invoice('${receipt.order_id}')`,/permission denied/);
await db.exec(`reset role; set test.email='staff@example.test'; set role authenticated;`);
assert.equal((await q('select count(*)::int n from public.order_invoices'))[0].n,0);
await fails(`select public.ensure_order_invoice('${receipt.order_id}')`,/Invoices Edit permission required/);
await fails(`update public.order_invoices set invoice_number='BAD'`,/permission denied/);
await fails('truncate public.order_invoices',/permission denied/);
await db.exec(`reset role; set test.email='manager@example.test'; set role authenticated;`);
assert.equal((await q('select count(*)::int n from public.order_invoices'))[0].n,1);
await fails(`select public.ensure_order_invoice('${receipt.order_id}')`,/Invoices Edit permission required/);
await db.exec(`reset role; set test.email='admin@example.test';`);
checks.push('Capability-only anonymous reads; guessed order id denied; Staff denied; Invoices View read-only; helpers private');

await fails("update public.order_invoices set snapshot='{}'",/immutable/);
await fails('delete from public.order_invoices',/immutable/);
await fails(`update public.orders set invoice_number='REPLACED' where id='${receipt.order_id}'`,/immutable/);
await db.exec(`update public.products set name='Changed catalogue',price=999;
update public.order_items set product_name='Later operational edit';
update public.orders set status='cancelled',customer_name='Changed customer' where id='${receipt.order_id}';`);
assert.deepEqual((await q('select snapshot from public.order_invoices'))[0].snapshot,invoice.snapshot);
assert.deepEqual((await q('select public.ensure_order_invoice($1::uuid) i',[receipt.order_id]))[0].i.snapshot,invoice.snapshot);
checks.push('Record/number immutability; catalogue, item, customer and cancellation changes cannot rewrite issued data');

// Clone saved orders to test eligibility, historical handling and error isolation.
const clone=async(gst,number=null,items=true)=>{
  const id=crypto.randomUUID();
  await db.exec('begin;');
  await q(`insert into public.orders(id,customer_name,email,mobile,address,pincode,delivery_date,slot_id,subtotal,discount,delivery_charge,total,payment_method,status,gst_rate,gst_amount,invoice_number)
  select $1::uuid,customer_name,email,mobile,address,pincode,delivery_date,slot_id,subtotal,discount,delivery_charge,total,payment_method,'new',case when $2 then gst_rate end,case when $2 then gst_amount end,$3 from public.orders where id=$4::uuid`,[id,gst,number,receipt.order_id]);
  if(items) await q(`insert into public.order_items(order_id,sku,product_name,unit_price,quantity,line_total) select $1::uuid,sku,product_name,unit_price,quantity,line_total from public.order_items where order_id=$2::uuid`,[id,receipt.order_id]);
  await db.exec('commit;');
  return id;
};
const historical=await clone(false);
assert.equal((await q('select count(*)::int n from public.order_invoices where order_id=$1',[historical]))[0].n,0);
await fails(`select public.ensure_order_invoice('${historical}')`,/complete saved tax/);
const manual=await clone(true,'EXISTING-42');
assert.equal((await q('select invoice_number from public.order_invoices where order_id=$1',[manual]))[0].invoice_number,'EXISTING-42');
const missingItems=await clone(true,null,false);
assert.equal((await q('select invoice_number from public.orders where id=$1',[missingItems]))[0].invoice_number,null);
await fails(`select public.ensure_order_invoice('${missingItems}')`,/complete saved tax/);
await q(`insert into public.order_items(order_id,sku,product_name,unit_price,quantity,line_total) select $1::uuid,sku,product_name,unit_price,quantity,line_total from public.order_items where order_id=$2::uuid`,[missingItems,receipt.order_id]);
assert.ok((await q('select public.ensure_order_invoice($1::uuid) i',[missingItems]))[0].i.id);
checks.push('Missing historical GST stays unissued; existing number retained; incomplete items refuse then recover by admin');

const cancelled=await clone(true,null,false);
await q(`update public.orders set status='cancelled' where id=$1::uuid`,[cancelled]);
await q(`insert into public.order_items(order_id,sku,product_name,unit_price,quantity,line_total) select $1::uuid,sku,product_name,unit_price,quantity,line_total from public.order_items where order_id=$2::uuid`,[cancelled,receipt.order_id]);
await fails(`select public.ensure_order_invoice('${cancelled}')`,/complete saved tax/);
assert.equal((await q('select count(*)::int n from public.order_invoices where order_id=$1',[cancelled]))[0].n,0);
assert.equal((await q('select invoice_number from public.orders where id=$1',[cancelled]))[0].invoice_number,null);
checks.push('Cancelled unissued order refuses initial issuance despite complete tax/items; existing issued cancelled snapshot remains readable unchanged');

// Deliberate backend insertion fault: checkout must remain committed with no
// half-linked invoice; explicit admin retry can recover when fault is removed.
await db.exec(`create function public.fixture_invoice_failure() returns trigger language plpgsql as $$ begin raise exception 'fixture fault'; end $$;
create trigger fixture_invoice_failure before insert on public.order_invoices for each row execute function public.fixture_invoice_failure();`);
const recoverable=await clone(true);
assert.equal((await q('select invoice_number from public.orders where id=$1',[recoverable]))[0].invoice_number,null);
assert.equal((await q('select count(*)::int n from public.order_invoices where order_id=$1',[recoverable]))[0].n,0);
await db.exec('drop trigger fixture_invoice_failure on public.order_invoices;');
assert.ok((await q('select public.ensure_order_invoice($1::uuid) i',[recoverable]))[0].i.id);
const counts=(await q('select count(*)::int n,count(distinct invoice_number)::int numbers,count(distinct order_id)::int orders from public.order_invoices'))[0];
assert.equal(counts.n,counts.numbers); assert.equal(counts.n,counts.orders);
checks.push('Unexpected invoice insertion fault does not fail order commit; no partial linkage; admin retry recovers; distinct numbers/order uniqueness');
const result={passed:true,checks,invoiceCount:counts.n,productionApplied:false};
if(process.env.INVOICE_TEST_REPORT) await writeFile(process.env.INVOICE_TEST_REPORT,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
await db.close();
