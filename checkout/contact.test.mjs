import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkoutContact} from './contact.js';

const valid = {name:'Guest Customer',email:'guest@example.com',mobile:'9876543210'};
test('guest checkout accepts and normalizes all mandatory contact details',()=>{
  assert.deepEqual(checkoutContact({name:' Guest Customer ',email:' Guest@Example.COM ',mobile:' 9876543210 '}),{contact:valid,errors:{}});
});
for(const field of ['name','email','mobile']){
  for(const value of [undefined,null,'','   ']){
    test(`${field} is mandatory for ${JSON.stringify(value)}`,()=>assert.ok(checkoutContact({...valid,[field]:value}).errors[field]));
  }
}
test('rejects invalid lengths, control characters and malformed contact details',()=>{
  for(const name of ['x','x'.repeat(101),'Guest\nName'])assert.ok(checkoutContact({...valid,name}).errors.name);
  for(const email of ['guest','guest@localhost','guest @example.com','x'.repeat(243)+'@example.com'])assert.ok(checkoutContact({...valid,email}).errors.email);
  for(const mobile of ['1234567890','987654321','98765432100','98765abc10'])assert.ok(checkoutContact({...valid,mobile}).errors.mobile);
});
test('checkout HTML requires name, mobile and email; email stays a typed field',async()=>{
  const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
  for(const id of ['customer-name','mobile','email'])assert.match(html,new RegExp(`<input[^>]*id="${id}"[^>]*\\brequired\\b`));
  assert.match(html,/<input[^>]*id="email"[^>]*type="email"/);
});
test('server keeps required validation, persisted contacts and guest auth attribution',async()=>{
  const sql=await readFile(new URL('../supabase/migrations/015_cod_backend_hardened_checkout.sql',import.meta.url),'utf8');
  for(const field of ['name','email','mobile'])assert.match(sql,new RegExp(`if v_${field} is null`));
  assert.match(sql,/insert into public\.orders\(user_id,customer_name,email,mobile/);
  assert.match(sql,/values\(auth\.uid\(\),v_name,v_email,v_mobile/);
});
