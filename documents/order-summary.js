// A historical order summary is NOT an issued tax invoice and must not assign
// an invoice number or manufacture missing GST/payment information.
export function historicalOrderSummary(order,items){
  const paise=value=>Math.round(Number(value)*100);
  if(!order?.order_number||!Array.isArray(items)||!items.length)throw Error('Complete saved order items are required for this summary.');
  const subtotal=paise(order.subtotal),discount=paise(order.discount||0),delivery=paise(order.delivery_charge||0),total=paise(order.total);
  const sum=items.reduce((n,item)=>n+paise(item.line_total),0);
  if(![subtotal,discount,delivery,total,sum].every(Number.isSafeInteger)||subtotal!==sum||total!==subtotal-discount+delivery)throw Error('The saved order breakdown needs review before a summary can be prepared.');
  return {document_type:'order_summary',order_id:order.id,created_at:order.created_at,snapshot:{
    supplier:{name:'URBAN CRAVE VENTURES LLP',gstin:'20AAJFU1454F1ZJ',fssai:'11126001000123',address:'Ground Floor, Shyama Complex, Singh More Hatia, Kalyanpur Road No. 04, Ranchi, Jharkhand – 834003, India',email:'support@jabwemeat.com'},
    order:{id:order.id,number:order.order_number,created_at:order.created_at,payment_method:order.payment_method,status:order.status},
    customer:{name:order.customer_name,email:order.email,mobile:order.mobile,address:order.address,pincode:order.pincode},
    items:items.map(item=>({sku:item.sku,name:item.product_name,quantity:item.quantity,unit_price:item.unit_price,line_total:item.line_total})),
    totals:{subtotal:order.subtotal,discount:order.discount||0,delivery_charge:order.delivery_charge||0,total:order.total,gst_rate:null,gst_amount:null},
    hsn_status:'not_supplied'
  }};
}
