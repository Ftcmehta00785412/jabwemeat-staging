// Keep checkout contact validation aligned with the COD RPC. Contact details are
// required for guests too; collecting them does not verify email/mobile ownership.
export function checkoutContact({name, email, mobile}) {
  const contact = {
    name: String(name ?? '').trim(),
    email: String(email ?? '').trim().toLowerCase(),
    mobile: String(mobile ?? '').trim(),
  };
  const errors = {};
  if (contact.name.length < 2 || contact.name.length > 100 || /[\u0000-\u001f\u007f]/.test(contact.name)) {
    errors.name = 'Enter a customer name (2-100 characters).';
  }
  if (contact.email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?[.][A-Za-z]{2,63}$/.test(contact.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!/^[6-9][0-9]{9}$/.test(contact.mobile)) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  }
  return {contact, errors};
}
