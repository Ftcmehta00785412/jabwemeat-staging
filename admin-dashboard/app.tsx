import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, ShoppingBag, Package, Users, ReceiptText, Truck, Search, Bell,
  Menu, ArrowUpRight, IndianRupee, Clock3, AlertTriangle, Plus, MoreHorizontal,
  CheckCircle2, XCircle, LogOut, Mail, RefreshCw, UserRoundCog, Pencil, ShieldCheck,
  LockKeyhole
} from 'lucide-react';
import { supabase } from './supabase';
import './styles.css';

type Tab = 'Dashboard' | 'Orders' | 'Inventory' | 'Customers' | 'Invoices' | 'Delivery slots' | 'Team';
type Area = Tab;
type Permission = 'Full' | 'Edit' | 'View' | 'No Access';
type Role = 'Owner' | 'Admin' | 'Manager' | 'Staff';
type PermissionMap = Record<Role, Record<Area, Permission>>;

const areas: Area[] = ['Dashboard', 'Orders', 'Inventory', 'Customers', 'Invoices', 'Delivery slots', 'Team'];
const roles: Role[] = ['Owner', 'Admin', 'Manager', 'Staff'];
const permissionChoices: Permission[] = ['Full', 'Edit', 'View', 'No Access'];
const nav: [Tab, any][] = [
  ['Dashboard', LayoutDashboard], ['Orders', ShoppingBag], ['Inventory', Package],
  ['Customers', Users], ['Invoices', ReceiptText], ['Delivery slots', Truck], ['Team', UserRoundCog]
];
const statuses = ['new', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
const emptyProduct = { name: '', sku: '', description: '', price: '', mrp: '', stock: '0', image_url: '', featured: false, active: true, category_id: '' };
const nice = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const blankPermissionMap = (): PermissionMap => Object.fromEntries(roles.map(role => [role, Object.fromEntries(areas.map(area => [area, 'No Access']))])) as PermissionMap;

function AuthScreen({ message }: { message?: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: window.location.href } });
    setBusy(false); if (error) setError(error.message); else setSent(true);
  };
  return <div className="auth-shell"><div className="auth-card"><div className="auth-mark">J</div><span className="auth-kicker">JABWEMEAT · RANCHI OPERATIONS</span><h1>Admin console</h1><p>Sign in with the authorised email to manage the live staging store.</p>
    {message && <div className="error-banner">{message}</div>}
    {sent ? <div className="sent-card"><Mail /><b>Check your inbox</b><span>A magic link was sent to <strong>{email}</strong>. Open it in this browser to continue.</span><button onClick={() => setSent(false)}>Use another email</button></div> : <form onSubmit={submit}><label>Administrator email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>{error && <div className="error-banner">{error}</div>}<button className="primary wide" disabled={busy}>{busy ? 'Sending link…' : 'Send magic sign-in link'}<ArrowUpRight /></button></form>}
    <small className="auth-note">Only approved active team accounts can access this console.</small></div></div>;
}

function App() {
  const [session, setSession] = useState<any>(undefined);
  const [authError, setAuthError] = useState('');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<PermissionMap>(blankPermissionMap());
  const [tab, setTab] = useState<Tab>('Dashboard');
  const [mobile, setMobile] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [carts, setCarts] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); if (!nextSession) { setAllowed(null); setRole(null); } });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadAccess = async (email: string) => {
    const [memberResult, permissionResult] = await Promise.all([
      supabase.from('team_members').select('role').eq('email', email).eq('status', 'Active').maybeSingle(),
      supabase.from('role_permissions').select('role,area,permission')
    ]);
    if (memberResult.error || !memberResult.data || permissionResult.error) throw new Error(memberResult.error?.message || permissionResult.error?.message || 'This account is not listed as an active team member.');
    const nextRole = memberResult.data.role as Role;
    const nextMap = blankPermissionMap();
    (permissionResult.data || []).forEach((row: any) => { if (nextMap[row.role as Role] && areas.includes(row.area as Area)) nextMap[row.role as Role][row.area as Area] = row.permission as Permission; });
    setRole(nextRole); setRolePermissions(nextMap);
  };

  const loadAll = async () => {
    const [p, c, o, ca, s, t] = await Promise.all([
      supabase.from('products').select('*,categories(id,name)').order('created_at'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('orders').select('*,delivery_slots(label)').order('created_at', { ascending: false }),
      supabase.from('carts').select('*').eq('status', 'active').order('updated_at', { ascending: false }),
      supabase.from('delivery_slots').select('*').order('sort_order'),
      supabase.from('team_members').select('*').order('created_at')
    ]);
    const firstError = [p, c, o, ca, s, t].find(result => result.error)?.error;
    if (firstError) setError(firstError.message || 'Could not load live data.');
    setProducts(p.data || []); setCategories(c.data || []); setOrders(o.data || []); setCarts(ca.data || []); setSlots(s.data || []); setTeam(t.data || []);
  };

  useEffect(() => {
    if (!session) return;
    let active = true;
    const check = async () => {
      setLoading(true); setAuthError('');
      const { data, error: accessError } = await supabase.rpc('is_admin');
      if (accessError || data !== true) { setAuthError(accessError?.message || 'This account is not listed as an active team member.'); setAllowed(false); setLoading(false); return; }
      try { await loadAccess(String(session.user.email || '').trim().toLowerCase()); setAllowed(true); await loadAll(); if (active) setLoading(false); }
      catch (accessLoadError: any) { setAuthError(accessLoadError.message || 'Could not load role permissions.'); setAllowed(false); setLoading(false); }
    };
    check(); return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (allowed !== true) return;
    const channel = supabase.channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carts' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_slots' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, async () => { await loadAll(); if (session?.user?.email) await loadAccess(String(session.user.email).toLowerCase()); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, async () => { if (session?.user?.email) await loadAccess(String(session.user.email).toLowerCase()); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [allowed, session]);

  const permission = (area: Area) => role === 'Owner' ? 'Full' : (rolePermissions[role || 'Staff']?.[area] || 'No Access');
  const canView = (area: Area) => permission(area) !== 'No Access';
  const canEdit = (area: Area) => ['Full', 'Edit'].includes(permission(area));
  const visibleNav = useMemo(() => nav.filter(([name]) => canView(name)), [role, rolePermissions]);
  useEffect(() => { if (allowed === true && !visibleNav.some(([name]) => name === tab)) setTab(visibleNav[0]?.[0] || 'Dashboard'); }, [allowed, visibleNav, tab]);

  if (session === undefined) return <div className="loading-screen">Loading secure admin…</div>;
  if (!session) return <AuthScreen />;
  if (allowed === null) return <div className="loading-screen">Checking administrator access…</div>;
  if (!allowed) return <AuthScreen message={authError} />;

  const sessionEmail = String(session.user.email || '').trim().toLowerCase();
  const currentMember = team.find(member => String(member.email || '').trim().toLowerCase() === sessionEmail);
  const profileName = currentMember?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || sessionEmail.split('@')[0] || 'Administrator';
  const profileInitials = profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase() || 'AD';
  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const today = new Date().toISOString().slice(0, 10);
  const todayValue = orders.filter(o => String(o.created_at || '').slice(0, 10) === today).reduce((n, o) => n + Number(o.total || 0), 0);
  const low = products.filter(p => p.stock < p.low_stock_threshold).length;
  const editRolePermissions = async (updated: PermissionMap) => { setRolePermissions(updated); };

  return <div className="shell"><aside className={mobile ? 'open' : ''}><div className="logo"><span>J</span><div><b>JAB<span>WE</span>MEAT<sup>™</sup></b><small>ADMIN CONSOLE</small></div></div>
    <nav>{visibleNav.map(([name, Icon]) => <button className={tab === name ? 'active' : ''} onClick={() => { setTab(name); setMobile(false); }} key={name}><Icon />{name}{name === 'Orders' && activeOrders.length > 0 && <i>{activeOrders.length}</i>}</button>)}</nav>
    <div className="admin-user"><div>{profileInitials}</div><p><b>{profileName}</b><small>{session.user.email}</small></p><button title="Sign out" onClick={() => supabase.auth.signOut()}><LogOut /></button></div></aside>
    {mobile && <div className="scrim" onClick={() => setMobile(false)} />}<main><header><button className="menu" onClick={() => setMobile(true)}><Menu /></button><div><h1>{tab}</h1><p>Live staging · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div><label><Search /><input placeholder="Search orders, SKU, customers…" /></label><button className="bell"><Bell /><i /></button><button className="store" onClick={() => window.open('../apps/jabwemeat-store/index.html', '_blank')}>View store <ArrowUpRight /></button></header>
      <section className="content">{error && <div className="error-banner page-error">{error}<button onClick={() => { setError(''); loadAll(); }}><RefreshCw /> Retry</button></div>}{loading && <div className="sync-note">Syncing live data…</div>}
        {tab === 'Dashboard' && <Overview active={activeOrders.length} value={todayValue} products={products.length} carts={carts.length} low={low} orders={orders} onTab={setTab} profileName={profileName} canInventoryEdit={canEdit('Inventory')} canOrdersView={canView('Orders')} />}
        {tab === 'Orders' && <Orders orders={orders} refresh={loadAll} editable={canEdit('Orders')} />}
        {tab === 'Inventory' && <Inventory products={products} categories={categories} refresh={loadAll} editable={canEdit('Inventory')} />}
        {tab === 'Delivery slots' && <Slots slots={slots} refresh={loadAll} editable={canEdit('Delivery slots')} />}
        {tab === 'Team' && <Team members={team} refresh={loadAll} rolePermissions={rolePermissions} canManageRoles={role === 'Owner' || role === 'Admin'} canManageTeam={role === 'Owner' || role === 'Admin'} onPermissionsSaved={editRolePermissions} />}
        {tab === 'Customers' && <Upcoming title="Customers" />}{tab === 'Invoices' && <Upcoming title="Invoices" />}
      </section></main></div>;
}

const Metric = ({ icon: Icon, label, value, note, tone }: any) => <div className="metric"><span className={tone}><Icon /></span><p><small>{label}</small><b>{value}</b><i>{note}</i></p></div>;
function Overview({ active, value, products, carts, low, orders, onTab, profileName, canInventoryEdit, canOrdersView }: any) { return <><div className="welcome"><div><span>RANCHI OPERATIONS · LIVE</span><h2>Good afternoon, {profileName.split(/\s+/)[0]}.</h2><p>Here’s what is happening with JabWeMeat today.</p></div>{canInventoryEdit && <button className="primary" onClick={() => onTab('Inventory')}><Plus /> Manage products</button>}</div><div className="metrics"><Metric icon={ShoppingBag} label="Live orders" value={active} note="Needs attention in pipeline" tone="green" /><Metric icon={IndianRupee} label="Today’s COD value" value={`₹${value.toLocaleString('en-IN')}`} note="From live orders" tone="gold" /><Metric icon={Package} label="Active SKUs" value={products} note={`${low} low-stock items`} tone="blue" /><Metric icon={ShoppingBag} label="Abandoned carts" value={carts} note="Active baskets" tone="rose" /></div><div className="grid"><Panel title="Live order pipeline" action={canOrdersView ? 'View all orders' : undefined} onAction={canOrdersView ? () => onTab('Orders') : undefined}><div className="pipeline">{[['new', 'New'], ['confirmed', 'Confirmed'], ['preparing', 'Preparing'], ['out_for_delivery', 'Out for delivery']].map(([a, b], i) => <div key={a}><span className={`dot d${i}`} /><p><b>{orders.filter((o: any) => o.status === a).length}</b><small>{b}</small></p></div>)}</div><OrderTable orders={orders.slice(0, 5)} compact /></Panel><Panel title="Attention needed" action={canInventoryEdit ? 'Manage inventory' : undefined} onAction={canInventoryEdit ? () => onTab('Inventory') : undefined}><div className="alerts"><div><AlertTriangle /><p><b>{low} products are running low</b><small>Review stock before the next slot opens.</small></p></div><div><Clock3 /><p><b>{orders.filter((o: any) => o.status === 'new').length} new orders need confirmation</b><small>Keep today’s slots moving.</small></p></div><div><ShoppingBag /><p><b>{carts} abandoned carts</b><small>Active baskets available for recovery.</small></p></div></div></Panel></div></>; }
const Panel = ({ title, action, onAction, children }: any) => <article className="panel"><div className="panel-head"><h3>{title}</h3>{action && <button onClick={onAction}>{action}<ArrowUpRight /></button>}</div>{children}</article>;

function Orders({ orders, refresh, editable }: any) { const update = async (id: string, status: string) => { if (!editable) return; const { error } = await supabase.from('orders').update({ status }).eq('id', id); if (error) alert(error.message); else refresh(); }; return <Page title="Orders" sub="Live COD orders. Update status as the kitchen progresses."><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Value</th><th>Slot</th><th>Status</th><th /></tr></thead><tbody>{orders.map((o: any) => <tr key={o.id}><td><b>{o.order_number}</b><small>{new Date(o.created_at).toLocaleString('en-IN')}</small></td><td><b>{o.customer_name}</b><small>{o.pincode} · {o.mobile}</small></td><td><b>₹{o.total}</b></td><td>{o.delivery_slots?.label || '—'}</td><td><select className="status-select" disabled={!editable} value={o.status} onChange={e => update(o.id, e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></td><td><MoreHorizontal /></td></tr>)}</tbody></table>{!orders.length && <Empty text="No orders yet" />}</div></Page>; }

function Inventory({ products, categories, refresh, editable }: any) { const [drafts, setDrafts] = useState<Record<string, any>>({}); const [newOpen, setNewOpen] = useState(false); const [newProduct, setNewProduct] = useState<any>({ ...emptyProduct, category_id: categories[0]?.id || '' }); const start = (p: any) => setDrafts(d => ({ ...d, [p.id]: { name: p.name, sku: p.sku, description: p.description || '', price: p.price, mrp: p.mrp, stock: p.stock, image_url: p.image_url || '', featured: !!p.featured, active: p.active !== false } })); const val = (p: any) => drafts[p.id] || p; const save = async (p: any) => { if (!editable) return; const d = val(p); const { error } = await supabase.from('products').update({ ...d, price: Number(d.price), mrp: Number(d.mrp), stock: Number(d.stock) }).eq('id', p.id); if (error) alert(error.message); else { setDrafts(x => { const y = { ...x }; delete y[p.id]; return y; }); refresh(); } }; const create = async (e: React.FormEvent) => { e.preventDefault(); if (!editable) return; const slug = newProduct.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'); const { error } = await supabase.from('products').insert({ ...newProduct, slug, price: Number(newProduct.price), mrp: Number(newProduct.mrp), stock: Number(newProduct.stock) }); if (error) alert(error.message); else { setNewOpen(false); setNewProduct({ ...emptyProduct, category_id: categories[0]?.id || '' }); refresh(); } }; return <Page title="Products & inventory" sub="Edit live catalogue data. Save each row to publish changes." action={editable ? <button className="primary" onClick={() => setNewOpen(true)}><Plus /> New product</button> : undefined}><div className="table-wrap"><table className="inventory-table"><thead><tr><th>Product / SKU</th><th>Description</th><th>Price / MRP</th><th>Stock</th><th>Image URL</th><th>Flags</th><th /></tr></thead><tbody>{products.map((p: any) => { const d = val(p); return <tr key={p.id}><td><input disabled={!editable} value={d.name} onFocus={() => start(p)} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), name: e.target.value } }))} /><input disabled={!editable} value={d.sku} onFocus={() => start(p)} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), sku: e.target.value } }))} /><small>{p.categories?.name || '—'}</small></td><td><textarea disabled={!editable} value={d.description || ''} onFocus={() => start(p)} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), description: e.target.value } }))} /></td><td><input disabled={!editable} type="number" value={d.price} onFocus={() => start(p)} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), price: e.target.value } }))} /><input disabled={!editable} type="number" value={d.mrp} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), mrp: e.target.value } }))} /></td><td><input disabled={!editable} className="stock-input" type="number" min="0" value={d.stock} onFocus={() => start(p)} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), stock: e.target.value } }))} /></td><td><input disabled={!editable} value={d.image_url || ''} onFocus={() => start(p)} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), image_url: e.target.value } }))} /></td><td><label className="check"><input disabled={!editable} type="checkbox" checked={!!d.featured} onFocus={() => start(p)} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), featured: e.target.checked } }))} /> Featured</label><label className="check"><input disabled={!editable} type="checkbox" checked={d.active !== false} onChange={e => setDrafts(x => ({ ...x, [p.id]: { ...val(p), active: e.target.checked } }))} /> Active</label></td><td>{editable && <button className="outline" onClick={() => save(p)}>Save</button>}</td></tr>; })}</tbody></table></div>{newOpen && <div className="modal-backdrop"><form className="modal" onSubmit={create}><button type="button" className="modal-close" onClick={() => setNewOpen(false)}>×</button><h3>Add product</h3><label>Name<input required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} /></label><label>SKU<input required value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} /></label><label>Category<select required value={newProduct.category_id} onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="two"><label>Price<input required type="number" min="0" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} /></label><label>MRP<input required type="number" min="0" value={newProduct.mrp} onChange={e => setNewProduct({ ...newProduct, mrp: e.target.value })} /></label></div><label>Description<textarea value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} /></label><label>Image URL<input value={newProduct.image_url} onChange={e => setNewProduct({ ...newProduct, image_url: e.target.value })} /></label><label>Opening stock<input type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} /></label><button className="primary wide">Create product</button></form></div>}</Page>; }

function Slots({ slots, refresh, editable }: any) { const save = async (s: any) => { if (!editable) return; const { error } = await supabase.from('delivery_slots').update({ capacity: Number(s.capacity), active: s.active }).eq('id', s.id); if (error) alert(error.message); else refresh(); }; return <Page title="Delivery slots" sub="Keep live capacity and availability aligned with dispatch operations."><div className="slot-grid">{slots.map((s: any) => <div className="slot-card" key={s.id}><span>DELIVERY WINDOW</span><h3>{s.label}</h3><label>Capacity<input disabled={!editable} type="number" min="0" value={s.capacity} onChange={e => { s.capacity = e.target.value; }} onBlur={() => save(s)} /></label><label className="toggle"><input disabled={!editable} type="checkbox" checked={s.active} onChange={e => { s.active = e.target.checked; save(s); }} /> Accepting orders</label>{editable && <button className="outline" onClick={() => save(s)}>Save changes</button>}</div>)}</div></Page>; }

function Team({ members, refresh, rolePermissions, canManageRoles, canManageTeam, onPermissionsSaved }: any) {
  const statuses = ['Active', 'Inactive']; const blank = { name: '', email: '', role: 'Staff', status: 'Active' }; const [open, setOpen] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>(blank); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState(''); const [manageRoles, setManageRoles] = useState(false); const [editingRole, setEditingRole] = useState<Role | null>(null); const [roleDraft, setRoleDraft] = useState<PermissionMap>(rolePermissions);
  useEffect(() => setRoleDraft(rolePermissions), [rolePermissions]);
  const beginAdd = () => { setEditing(null); setForm({ ...blank }); setFormError(''); setOpen(true); }; const beginEdit = (member: any) => { setEditing(member); setForm({ name: member.name, email: member.email, role: member.role, status: member.status }); setFormError(''); setOpen(true); };
  const save = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setFormError(''); const payload = { name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role, status: form.status }; const result = editing ? await supabase.from('team_members').update(payload).eq('id', editing.id) : await supabase.from('team_members').insert(payload); setBusy(false); if (result.error) { setFormError(result.error.message); return; } setOpen(false); await refresh(); };
  const openRole = (selected: Role) => { setEditingRole(selected); setRoleDraft(rolePermissions); }; const updateRolePermission = (area: Area, value: Permission) => setRoleDraft(d => ({ ...d, [editingRole as Role]: { ...d[editingRole as Role], [area]: value } }));
  const saveRole = async () => { if (!editingRole || editingRole === 'Owner') return; setBusy(true); const rows = areas.map(area => ({ role: editingRole, area, permission: roleDraft[editingRole][area] })); const result = await supabase.from('role_permissions').upsert(rows, { onConflict: 'role,area' }); setBusy(false); if (result.error) { setFormError(result.error.message); return; } const next = { ...rolePermissions, [editingRole]: { ...roleDraft[editingRole] } }; onPermissionsSaved(next); setEditingRole(null); setFormError(''); };
  return <Page title="Team" sub="Manage who can access and operate the JabWeMeat dashboard." action={<div className="page-actions"><button className="outline" disabled={!canManageRoles} onClick={() => setManageRoles(true)}><ShieldCheck /> Manage Roles</button><button className="primary" disabled={!canManageTeam} onClick={beginAdd}><Plus /> Add Team Member</button></div>}><div className="table-wrap"><table className="team-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{members.map((member: any) => <tr key={member.id}><td><b>{member.name}</b></td><td>{member.email}</td><td><span className="role-pill">{member.role}</span></td><td><span className={'member-status ' + member.status.toLowerCase()}><i />{member.status}</span></td><td><button className="outline edit-member" disabled={!canManageTeam} onClick={() => beginEdit(member)}><Pencil /> Edit</button></td></tr>)}</tbody></table>{!members.length && <Empty text="No team members yet" />}</div>
    {open && <div className="modal-backdrop"><form className="modal team-modal" onSubmit={save}><button type="button" className="modal-close" onClick={() => setOpen(false)}>×</button><span className="modal-kicker">TEAM ACCESS</span><h3>{editing ? 'Edit Team Member' : 'Add Team Member'}</h3><label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></label><div className="two"><label>Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{roles.map(r => <option key={r}>{r}</option>)}</select></label><label>Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label></div>{formError && <div className="error-banner">{formError}</div>}<button className="primary wide" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save Changes' : 'Add Team Member'}</button></form></div>}
    {manageRoles && <div className="modal-backdrop"><div className="modal role-manager"><button type="button" className="modal-close" onClick={() => { setManageRoles(false); setEditingRole(null); }}>×</button><span className="modal-kicker">ACCESS CONTROL</span><h3>Manage Roles</h3><p className="modal-help">Choose Edit on a role to set its access for each dashboard area. Owner access is permanently locked.</p><div className="role-cards">{roles.map(r => <div className="role-card" key={r}><div><span className="role-pill">{r}</span><p>{r === 'Owner' ? 'Full access to every area.' : 'Configure dashboard access.'}</p><div className="role-summary">{areas.map(area => <span key={area}>{area}: <b>{r === 'Owner' ? 'Full' : rolePermissions[r][area]}</b></span>)}</div></div><button className="outline" disabled={r === 'Owner' || !canManageRoles} onClick={() => openRole(r)}>{r === 'Owner' ? <><LockKeyhole /> Locked</> : <><Pencil /> Edit</>}</button></div>)}</div></div></div>}
    {editingRole && <div className="modal-backdrop role-edit-backdrop"><form className="modal role-editor" onSubmit={e => { e.preventDefault(); saveRole(); }}><button type="button" className="modal-close" onClick={() => setEditingRole(null)}>×</button><span className="modal-kicker">ROLE PERMISSIONS</span><h3>Edit {editingRole}</h3><p className="modal-help">Set exactly one access level for each dashboard area.</p><div className="permission-list">{areas.map(area => <label key={area}><span>{area}</span><select value={roleDraft[editingRole][area]} onChange={e => updateRolePermission(area, e.target.value as Permission)}>{permissionChoices.map(choice => <option key={choice}>{choice}</option>)}</select></label>)}</div>{formError && <div className="error-banner">{formError}</div>}<button className="primary wide" disabled={busy}>{busy ? 'Saving…' : 'Save permissions'}</button></form></div>}
  </Page>;
}

const Page = ({ title, sub, children, action }: any) => <><div className="page-title"><div><h2>{title}</h2><p>{sub}</p></div>{action}</div>{children}</>;
const OrderTable = ({ orders, compact }: any) => <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Value</th><th>Slot</th><th>Status</th></tr></thead><tbody>{orders.slice(0, compact ? 4 : orders.length).map((o: any) => <tr key={o.id}><td><b>{o.order_number}</b></td><td>{o.customer_name}</td><td><b>₹{o.total}</b></td><td>{o.delivery_slots?.label || '—'}</td><td><Status value={o.status} /></td></tr>)}</tbody></table></div>;
const Status = ({ value }: any) => <span className={'status ' + value}>{['delivered', 'verified'].includes(value) ? <CheckCircle2 /> : ['cancelled'].includes(value) ? <XCircle /> : <Clock3 />}{nice(value)}</span>;
const Empty = ({ text }: any) => <div className="empty"><Package /><h3>{text}</h3><p>Live data will appear here as activity comes in.</p></div>;
const Upcoming = ({ title }: any) => <Page title={title} sub="This module is prepared for the backend implementation phase."><Empty text={`${title} module upcoming`} /></Page>;
createRoot(document.getElementById('root')!).render(<App />);
