import React, {useEffect, useState} from 'react';
import {Download, ReceiptText, Search, RefreshCw} from 'lucide-react';
import {supabase} from './supabase';

export default function Invoices({orders,editable}:any){
  const [records,setRecords]=useState<any[]>([]),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState('');
  const load=async()=>{setLoading(true);const r=await supabase.from('order_invoices').select('order_id,invoice_number,created_at').order('created_at',{ascending:false});if(r.error)setError(r.error.message);else{setError('');setRecords(r.data||[]);}setLoading(false);};
  useEffect(()=>{load();},[orders]);
  const download=async(order:any)=>{
    if(busy)return;setBusy(order.id);setError('');
    try{
      const exists=records.find(r=>r.order_id===order.id);
      const result=exists?await supabase.from('order_invoices').select('*').eq('order_id',order.id).single():await supabase.rpc('ensure_order_invoice',{p_order_id:order.id});
      if(result.error)throw result.error;
      const record=Array.isArray(result.data)?result.data[0]:result.data;
      if(!record?.snapshot)throw Error('The invoice is not available for this order.');
      const {downloadInvoice}=await import('../documents/invoice-pdf.js');downloadInvoice(record);
      if(!exists)setRecords(rows=>[...rows,record]);
    }catch(err:any){setError(err.message||'Could not download the invoice. Please retry.');}finally{setBusy('');}
  };
  const index=new Map(records.map(r=>[r.order_id,r]));
  const rows=(orders||[]).filter((o:any)=>[o.order_number,o.customer_name,o.email,index.get(o.id)?.invoice_number].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <><div className="page-title"><div><h2>Invoices</h2><p>A dedicated invoice number and PDF against each order. Original order amounts are preserved.</p></div><button className="outline" disabled={loading} onClick={load}><RefreshCw size={15}/> Refresh</button></div>
    <div className="invoice-admin-note"><ReceiptText size={18}/><span>New orders receive an invoice record automatically. Email delivery is not enabled; PDFs can be downloaded here.</span></div>
    <label className="order-search customer-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search invoice, order or customer"/></label>
    {error&&<div className="error-banner" role="alert">{error}</div>}
    <div className="table-wrap"><table><thead><tr><th>Order ID</th><th>Invoice number</th><th>Customer</th><th>Issued</th><th>Order value</th><th>Invoice PDF</th></tr></thead><tbody>{rows.map((order:any)=>{const record=index.get(order.id);const eligible=order.gst_amount!=null&&order.gst_rate!=null&&order.status!=='cancelled';return <tr key={order.id}><td><b>{order.order_number}</b></td><td>{record?.invoice_number||'Not issued'}</td><td>{order.customer_name}</td><td>{record?.created_at?new Date(record.created_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'}):'—'}</td><td>₹{Number(order.total).toLocaleString('en-IN',{minimumFractionDigits:2})}</td><td><button className="outline" disabled={!!busy||(!record&&(!editable||!eligible))} onClick={()=>download(order)}><Download size={14}/>{busy===order.id?'Preparing…':record?'Download PDF':eligible?'Create PDF':order.status==='cancelled'?'Cancelled':'Tax details missing'}</button></td></tr>;})}</tbody></table>{loading&&<p className="empty-state">Loading invoices…</p>}{!loading&&!rows.length&&<p className="empty-state">No matching orders.</p>}</div></>;
}
