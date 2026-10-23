import {jsPDF} from 'jspdf';
import fontData from './invoice-font.js';

const palette={green:'#253b32',terra:'#b83b2a',cream:'#f8f5ee',muted:'#6d756b',line:'#e1dfd4'};
const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,2000);
const money=value=>`₹ ${Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export function invoiceFileName(record){return `JabWeMeat-${record.document_type==='order_summary'?'Order-Summary-':''}${clean(record.invoice_number||record.snapshot?.order?.number).replace(/[^A-Za-z0-9_-]/g,'-')}.pdf`;}

export function createInvoicePdf(record){
  const s=record?.snapshot;
  const summary=record?.document_type==='order_summary';
  if(!s?.supplier||!s?.order||!s?.customer||!Array.isArray(s.items)||!s?.totals||(!summary&&!record.invoice_number))throw Error('Invoice details are incomplete. Please contact support.');
  if(!Number.isFinite(Number(s.totals.total)))throw Error('Invoice total is invalid.');
  const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
  pdf.addFileToVFS('JwmSans.ttf',fontData);pdf.addFont('JwmSans.ttf','JwmSans','normal');
  pdf.setProperties({title:summary?`JabWeMeat order summary ${s.order.number}`:`JabWeMeat invoice ${record.invoice_number}`,subject:`Order ${s.order.number}`,author:'URBAN CRAVE VENTURES LLP',creator:'JabWeMeat'});
  const text=(value,x,y,size=9,color=palette.green,align='left')=>{pdf.setFont('JwmSans','normal');pdf.setFontSize(size);pdf.setTextColor(color);pdf.text(Array.isArray(value)?value.map(clean):clean(value),x,y,{align});};
  const wrapped=(value,x,y,width,size=9,color=palette.green)=>{pdf.setFont('JwmSans','normal');pdf.setFontSize(size);const lines=pdf.splitTextToSize(clean(value),width);pdf.setTextColor(color);pdf.text(lines,x,y);return y+lines.length*size*.42;};
  const line=y=>{pdf.setDrawColor(palette.line);pdf.setLineWidth(.25);pdf.line(15,y,195,y);};
  const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric'});};
  let page=1;
  const header=()=>{pdf.setFillColor(palette.green);pdf.rect(0,0,210,3,'F');pdf.setFillColor(palette.cream);pdf.rect(0,3,210,34,'F');text('JabWeMeat™',15,18,22);text('FRESH CUTS. LOCAL ROOTS.',15,27,7,palette.terra);text(summary?'ORDER SUMMARY':'INVOICE',195,17,summary?10:13,palette.terra,'right');text(summary?s.order.number:record.invoice_number,195,26,9,palette.green,'right');};
  const footer=()=>{line(273);text('Want to Connect Us',15,280,8.2);text(s.supplier.email||'support@jabwemeat.com',15,286,8);text(`Order ${s.order.number} · Page ${page}`,195,286,7,palette.muted,'right');};
  const nextPage=()=>{footer();pdf.addPage();page++;header();text(`Order ${s.order.number} · continued`,15,45,9,palette.muted);return 54;};
  header();
  text(s.supplier.name,15,46,11);let y=wrapped(s.supplier.address,15,53,110,8.2);
  text(`GSTIN  ${s.supplier.gstin}`,15,y+4,8.1);text(`FSSAI licence  ${s.supplier.fssai}`,15,y+10,8.1);
  text(`Date: ${date(summary?s.order.created_at:record.created_at||s.invoice?.created_at)}`,195,46,8,palette.muted,'right');
  text(`Order: ${s.order.number}`,195,54,8,palette.green,'right');text(summary?`Payment method: ${s.order.payment_method||'Not recorded'}`:'Cash on Delivery · unpaid at issue',195,62,7.6,palette.terra,'right');
  y=Math.max(y+18,79);line(y);y+=10;
  text('BILL TO / DELIVER TO',15,y,7.5,palette.muted);text('PLACE OF SUPPLY',195,y,7.5,palette.muted,'right');y+=7;
  y=wrapped(s.customer.name,15,y,115,10);
  const address=s.customer.address||{};const addressText=typeof address==='string'?address:[address.line1,address.line2,address.landmark,address.city,address.state,s.customer.pincode].filter(Boolean).join(', ');
  y=wrapped(addressText,15,y+2,115,8.5);y=wrapped(`${s.customer.mobile} · ${s.customer.email}`,15,y+2,115,8.1,palette.muted);
  text('Jharkhand (20)',195,104,9,palette.green,'right');y=Math.max(y+9,124);
  const tableHeader=()=>{pdf.setFillColor(palette.green);pdf.roundedRect(15,y,180,10,1.5,1.5,'F');text('ITEM / DESCRIPTION',19,y+6.7,7,'#ffffff');text('QTY',131,y+6.7,7,'#ffffff','right');text('RATE',160,y+6.7,7,'#ffffff','right');text('VALUE',191,y+6.7,7,'#ffffff','right');y+=17;};
  tableHeader();
  for(const item of s.items){
    pdf.setFontSize(9);const nameLines=pdf.splitTextToSize(clean(item.name||item.product_name),99);const height=Math.max(19,nameLines.length*4.2+10);
    if(y+height>258){y=nextPage();tableHeader();}
    text(nameLines,19,y,9);text(item.quantity,131,y,8.5,palette.green,'right');text(money(item.unit_price),160,y,8,palette.green,'right');text(money(item.line_total),191,y,8,palette.green,'right');
    text(item.hsn?`HSN: ${item.hsn}`:`SKU: ${item.sku||'—'}`,19,y+nameLines.length*4.2+2,7,palette.muted);y+=height;line(y-6);
  }
  y+=3;if(y+75>264)y=nextPage();
  const totals=s.totals;const totalsRows=[['Product subtotal',totals.subtotal]];
  if(Number(totals.discount))totalsRows.push(['Discount',-Number(totals.discount)]);
  if(!summary){if(totals.cgst_amount!=null&&totals.sgst_amount!=null){totalsRows.push([`CGST · ${Number(totals.gst_rate)/2}%`,totals.cgst_amount],[`SGST · ${Number(totals.gst_rate)/2}%`,totals.sgst_amount]);}else totalsRows.push([`GST · ${totals.gst_rate}%`,totals.gst_amount]);}
  totalsRows.push([!summary&&Number(totals.delivery_charge)===0?'Delivery · inaugural offer':'Delivery',totals.delivery_charge]);
  for(const [label,value] of totalsRows){text(label,116,y,8,palette.muted);text(money(value),191,y,8.5,palette.green,'right');y+=7;}
  pdf.setFillColor(palette.green);pdf.roundedRect(112,y,83,15,2,2,'F');text(summary?'ORDER TOTAL':'TOTAL · COD',116,y+9.5,8,'#ffffff');text(money(totals.total),191,y+9.5,12,'#ffffff','right');
  text(summary?'Historical order record':'Free inaugural delivery',19,y-20,9);text(summary?'Payment collection is not certified here.':'Pay cash when your order arrives.',19,y-12,7.8,palette.muted);text(summary?'Original saved amounts are unchanged.':'No online payment collected.',19,y-5,7.8,palette.muted);
  y+=24;text(summary?'GST breakdown was not recorded. This order summary is not a tax invoice.':'Amounts are in INR. Tax reflects the saved order breakdown.',15,y,7.2,palette.muted);
  footer();return pdf;
}

export function downloadInvoice(record){const pdf=createInvoicePdf(record);pdf.save(invoiceFileName(record));}
