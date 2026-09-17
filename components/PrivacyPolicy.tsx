import React from 'react';

type Props={onClose:()=>void};
const BulletList:React.FC<{items:string[]}>=({items})=><ul>{items.map((item,i)=><li key={i}>{item}</li>)}</ul>;
export const PrivacyPolicy:React.FC<Props>=({onClose})=><div className="policy-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
  <article className="privacy-policy">
    <button className="policy-close" onClick={onClose} aria-label="Close privacy policy">×</button>
    <header className="policy-header"><p className="eyebrow">JabWeMeat</p><h1 id="privacy-title">Privacy Policy</h1><p className="policy-updated">Last updated: [DATE]</p></header>
    <p>JabWeMeat (the “Platform,” accessible at [jabwemeat.com] and via our WhatsApp ordering channel) is owned and operated by Urbancrave Venture LLP (“Company,” “JabWeMeat,” “we,” “us,” or “our”), a Limited Liability Partnership registered under the laws of India (LLPIN: [ ]) with its registered office at [REGISTERED ADDRESS].</p>
    <p>This Privacy Policy explains how we collect, use, store, share, and protect your personal data when you use the Platform — including our website, any mobile app or Progressive Web App (PWA) we operate, and our WhatsApp ordering service.</p>
    <p>This Policy should be read together with our [Terms of Service]. Terms not defined here carry the meaning given to them there. Where this Policy uses terms defined under India’s Digital Personal Data Protection Act, 2023 (“DPDP Act”) — such as Data Fiduciary, Data Principal, and Consent — those terms carry the meaning given to them under that Act.</p>
    <p>By using the Platform — including registering an account, placing an order on the website, or messaging us on WhatsApp to order — you agree to the collection and use of your information as described in this Policy.</p>

    <section><h2>1. Information we collect</h2><h3>1.1 Information you give us directly</h3><BulletList items={[
      'Account and order details: name, phone number, email address (optional), delivery address, and PIN code — collected when you register or place an order, whether on the website, app, or through WhatsApp.',
      'WhatsApp ordering data: if you order through our WhatsApp channel, we collect the phone number linked to your WhatsApp account, your message content related to ordering (product selections, delivery preferences), and your language preference (English / Hindi / Bengali).',
      'Payment information: when you pay online, your payment is processed by our third-party payment gateway, [PAYMENT GATEWAY NAME]. We do not store your card, UPI, or other payment instrument details on our servers. That information is governed by [PAYMENT GATEWAY NAME]’s own privacy policy, which we encourage you to review. If you choose Cash on Delivery (COD), no online payment data is collected.',
      'Customer support interactions: if you contact us — by phone, WhatsApp, or email — we may retain a record of that conversation to assist you and to train our support process. Calls may be recorded for quality purposes, where you are informed of this at the start of the call.',
      'Feedback and coupon usage: any feedback you share with us, and records of any discount code or coupon you use.',
      'Information about someone else: if you place an order to be delivered to another person, we collect that recipient’s name, address, and contact number solely to complete the delivery. By providing this, you confirm you’re authorised to share it with us for that purpose.'
    ]}/><h3>1.2 Information collected automatically</h3><BulletList items={[
      'Usage data: pages and products viewed, taps and scrolls within the app/PWA, time and date of access, app crashes, and general interaction patterns.',
      'Device data: device type, operating system, browser type, and, where you grant permission, approximate location (used to show your nearest delivery PIN code and available slots).',
      'Cookies (website only): we use cookies to remember your language and delivery PIN, keep you logged in, and understand how visitors use the site. You can disable cookies in your browser, but some features — like staying logged in — may stop working properly if you do.'
    ]}/><h3>1.3 Information we do not collect or display without basis</h3><p>In line with our internal data-handling standards, we do not display placeholder claims (such as an unconfirmed FSSAI number), invented delivery cutoffs, or fabricated stock counts anywhere on the Platform, and we do not collect more personal data than a feature genuinely requires.</p></section>

    <section><h2>2. How we use your information</h2><p>We use your personal data to:</p><BulletList items={[
      'Register your account and confirm your orders, whether placed via the website or WhatsApp.',
      'Process and coordinate delivery, including assigning delivery slots and sharing delivery-relevant details with our delivery team.',
      'Verify your identity through OTP (sent by SMS and/or email) when you log in or place an order.',
      'Respond to your questions and support requests.',
      'Process payments and resolve payment issues, in coordination with our payment gateway.',
      'Send order-related and account-related notifications (order confirmed, packed, out for delivery, delivered) — including through WhatsApp utility messages, which you may opt out of at any time.',
      'Improve the Platform, understand customer preferences, and detect misuse or fraud.',
      'With your separate consent, send you marketing communications about offers, new products, or festive promotions.',
      'If you provide another person’s contact details (for example, as a delivery recipient), we use that information only to complete and communicate about that specific delivery.'
    ]}/></section>

    <section><h2>3. How we share your information</h2><p>We do not sell your personal data. We do not share it with third parties for their own marketing purposes without your explicit consent. We do share it in the following limited circumstances:</p><BulletList items={[
      'Delivery and logistics partners — to get your order to you.',
      'Payment gateway provider ([PAYMENT GATEWAY NAME]) — to process your payment.',
      'WhatsApp Business Platform / our messaging provider — to send you order updates and respond to your WhatsApp orders.',
      'SMS/OTP and email service providers — to verify your identity and send account notifications.',
      'Government or law enforcement authorities — where required by law, or in good faith to investigate fraud, illegal activity, or a threat to someone’s safety.',
      'A successor entity, if JabWeMeat or Urbancrave Venture LLP is ever involved in a merger, acquisition, or sale of business assets — subject to the same privacy commitments described here.',
      'Professional advisors (auditors, legal counsel) bound by confidentiality, where necessary.'
    ]}/><p>Every third party we work with is bound by a confidentiality or data-processing agreement and may use your data only for the specific purpose we’ve engaged them for.</p></section>

    <section><h2>4. Data security</h2><p>We take reasonable technical and organisational measures to protect your personal data, including:</p><BulletList items={[
      'Encryption of sensitive data in transit and at rest.',
      'Role-based access controls, so only authorised staff can view customer data relevant to their role.',
      'Regular security review of our systems (see also our internal security assessment programme).',
      'Restrictions on staff ability to manually alter payment status or export customer data without approval.'
    ]}/><p>No method of transmission over the internet is completely secure, and while we work hard to protect your data, we cannot guarantee absolute security.</p><p>If we become aware of a personal data breach that is likely to affect you, we will notify the Data Protection Board of India and affected Data Principals as required under the DPDP Act.</p></section>

    <section><h2>5. Data retention</h2><p>We retain your personal data only for as long as necessary to fulfil the purpose it was collected for — including order history, applicable tax and accounting record-keeping periods, and dispute resolution. Once no longer needed, we securely delete or anonymise it, in line with applicable law.</p><p className="policy-placeholder">[ADD SPECIFIC RETENTION PERIODS ONCE FINALISED — e.g., order records retained for X years for tax/accounting purposes; OTP records purged after X days.]</p></section>

    <section><h2>6. Your rights as a Data Principal</h2><p>Under the DPDP Act, and as a JabWeMeat customer, you have the right to:</p><BulletList items={['Access the personal data we hold about you.','Correct or update inaccurate or incomplete data.','Withdraw consent for any processing that relies on your consent (such as marketing messages), at any time, as easily as you gave it.','Request erasure of your personal data, subject to our legal obligation to retain certain records (e.g., transaction records for tax purposes).','Nominate another individual to exercise these rights on your behalf in the event of your death or incapacity.','File a grievance with us, and if unresolved, escalate it to the Data Protection Board of India.']}/><p>To exercise any of these rights, contact our Grievance Officer (details below). We will respond within the timeframe required under applicable law.</p><div className="policy-contact"><b>Grievance Officer Name:</b> [ ]<br/><b>Email:</b> [ ]<br/><b>Address:</b> [REGISTERED ADDRESS]</div></section>

    <section><h2>7. WhatsApp ordering — specific notes</h2><p>If you order through our WhatsApp channel:</p><BulletList items={['Your first message to us is treated as consent to receive order-related utility messages (confirmations, status updates, invoices) from that number.','We will never ask for your OTP, password, or full payment card details over WhatsApp.','You can opt out of promotional WhatsApp messages at any time by replying STOP, without affecting your ability to place orders.','Marketing messages on WhatsApp are only sent with your separate, explicit opt-in, consistent with WhatsApp Business Platform policy.']}/></section>
    <section><h2>8. Children’s privacy</h2><p>The Platform is not intended for individuals under the age of 18. We do not knowingly collect personal data from children. If we learn that a minor has created an account or provided personal data, we will delete that data and close the account. If you believe a child has shared personal data with us, please contact us at [CONTACT EMAIL].</p></section>
    <section><h2>9. Changes to this Policy</h2><p>We may update this Privacy Policy from time to time — for instance, as we roll out new features like full WhatsApp ordering automation or online payment. We’ll post the updated version here with a new “Last updated” date, and where a change is significant, we’ll notify you directly.</p></section>
    <section><h2>10. Contact us</h2><p>For any questions about this Privacy Policy or how we handle your data:</p><div className="policy-contact"><b>Urbancrave Venture LLP (operating JabWeMeat)</b><br/>Email: [CONTACT EMAIL — e.g. privacy@jabwemeat.com]<br/>Registered address: [REGISTERED ADDRESS]<br/>LLPIN: [ ]</div></section>

    <section className="policy-legal-disclaimer"><h2>Legal Disclaimer</h2><p>This document is an electronic record generated in accordance with the provisions of the Information Technology Act, 2000, including applicable rules and amendments. As this document is generated electronically, it does not require any physical or digital signatures.</p></section>
  </article>
</div>;
