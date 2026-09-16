import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, ShoppingBag, Package, Users, ReceiptText, Truck, Search, Bell,
  Menu, ArrowUpRight, IndianRupee, Clock3, AlertTriangle, Plus,
  CheckCircle2, XCircle, LogOut, Mail, RefreshCw, UserRoundCog, Pencil, ShieldCheck,
  LockKeyhole, ArrowLeft, MapPin, CreditCard, ClipboardList, UserCheck, MessageSquare,
  History, Scale, Box, Eye, CalendarClock, Download, FileCheck, WalletCards
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
const statuses = ['new', 'confirmed', 'preparing', 'ready_for_dispatch', 'out_for_delivery', 'delivered', 'cancelled', 'failed', 'returned_undelivered'];
const nextStatuses: Record<string, string[]> = { new: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['ready_for_dispatch', 'cancelled'], ready_for_dispatch: ['out_for_delivery', 'cancelled'], out_for_delivery: ['delivered', 'failed', 'returned_undelivered'], failed: ['out_for_delivery', 'returned_undelivered'], delivered: [], cancelled: [], returned_undelivered: [] };
const lockedStatuses = ['out_for_delivery', 'delivered', 'failed', 'returned_undelivered', 'cancelled'];
const one = (value: any) => Array.isArray(value) ? value[0] : value;
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
      supabase.from('products').select('*').order('created_at'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('orders').select('*,delivery_slots(id,label,start_time,end_time),payments(id,status,method,transaction_id),order_assignments(executive_id,delivery_executives(id,name,mobile,area)),order_items(id,product_name,quantity,ordered_weight,ordered_weight_unit,order_item_preparation(actual_weight))').order('created_at', { ascending: false }),
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
        {tab === 'Orders' && <Orders orders={orders} refresh={loadAll} editable={canEdit('Orders')} fullAccess={role === 'Owner' || role === 'Admin'} slots={slots} />}
        {tab === 'Inventory' && <Inventory products={products} categories={categories} refresh={loadAll} editable={canEdit('Inventory')} />}
        {tab === 'Delivery slots' && <Slots slots={slots} refresh={loadAll} editable={canEdit('Delivery slots')} />}
        {tab === 'Team' && <Team members={team} refresh={loadAll} rolePermissions={rolePermissions} canManageRoles={role === 'Owner' || role === 'Admin'} canManageTeam={role === 'Owner' || role === 'Admin'} onPermissionsSaved={editRolePermissions} />}
        {tab === 'Customers' && <Customers />}{tab === 'Invoices' && <Upcoming title="Invoices" />}
      </section></main></div>;
}

const Metric = ({ icon: Icon, label, value, note, tone }: any) => <div className="metric"><span className={tone}><Icon /></span><p><small>{label}</small><b>{value}</b><i>{note}</i></p></div>;
function Overview({ active, value, products, carts, low, orders, onTab, profileName, canInventoryEdit, canOrdersView }: any) { return <><div className="welcome"><div><span>RANCHI OPERATIONS · LIVE</span><h2>Good afternoon, {profileName.split(/\s+/)[0]}.</h2><p>Here’s what is happening with JabWeMeat today.</p></div>{canInventoryEdit && <button className="primary" onClick={() => onTab('Inventory')}><Plus /> Manage products</button>}</div><div className="metrics"><Metric icon={ShoppingBag} label="Live orders" value={active} note="Needs attention in pipeline" tone="green" /><Metric icon={IndianRupee} label="Today’s COD value" value={`₹${value.toLocaleString('en-IN')}`} note="From live orders" tone="gold" /><Metric icon={Package} label="Active SKUs" value={products} note={`${low} low-stock items`} tone="blue" /><Metric icon={ShoppingBag} label="Abandoned carts" value={carts} note="Active baskets" tone="rose" /></div><div className="grid"><Panel title="Live order pipeline" action={canOrdersView ? 'View all orders' : undefined} onAction={canOrdersView ? () => onTab('Orders') : undefined}><div className="pipeline">{[['new', 'New'], ['confirmed', 'Confirmed'], ['preparing', 'Preparing'], ['out_for_delivery', 'Out for delivery']].map(([a, b], i) => <div key={a}><span className={`dot d${i}`} /><p><b>{orders.filter((o: any) => o.status === a).length}</b><small>{b}</small></p></div>)}</div><OrderTable orders={orders.slice(0, 5)} compact /></Panel><Panel title="Attention needed" action={canInventoryEdit ? 'Manage inventory' : undefined} onAction={canInventoryEdit ? () => onTab('Inventory') : undefined}><div className="alerts"><div><AlertTriangle /><p><b>{low} products are running low</b><small>Review stock before the next slot opens.</small></p></div><div><Clock3 /><p><b>{orders.filter((o: any) => o.status === 'new').length} new orders need confirmation</b><small>Keep today’s slots moving.</small></p></div><div><ShoppingBag /><p><b>{carts} abandoned carts</b><small>Active baskets available for recovery.</small></p></div></div></Panel></div></>; }
const Panel = ({ title, action, onAction, children }: any) => <article className="panel"><div className="panel-head"><h3>{title}</h3>{action && <button onClick={onAction}>{action}<ArrowUpRight /></button>}</div>{children}</article>;

function Orders({ orders, refresh, editable, fullAccess, slots }: any) {
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>({ items: [], payments: [], assignments: [], notes: [], timeline: [], executives: [], refunds: [], proofs: [] });
  const [detailBusy, setDetailBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<any>({ date: 'all', status: 'all', payment: 'all', slot: 'all', area: 'all', executive: 'all', orderType: 'all', paymentMethod: 'all' });
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');

  const loadDetail = async (order: any) => {
    setSelected(order); setDetailBusy(true); setActionError('');
    const [items, payments, assignments, notes, timeline, executives] = await Promise.all([
      supabase.from('order_items').select('*,order_item_preparation(*)').eq('order_id', order.id).order('id'),
      supabase.from('payments').select('*').eq('order_id', order.id).order('created_at'),
      supabase.from('order_assignments').select('*,delivery_executives(*)').eq('order_id', order.id),
      supabase.from('order_internal_notes').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
      supabase.from('order_timeline').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
      supabase.from('delivery_executives').select('*').eq('active', true).order('name'),
      supabase.from('refund_requests').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
      supabase.from('delivery_proofs').select('*').eq('order_id', order.id).order('created_at', { ascending: false })
    ]);
    const failed = [items, payments, assignments, notes, timeline, executives, refunds, proofs].find(x => x.error);
    if (failed?.error) setActionError(failed.error.message);
    setDetail({ items: items.data || [], payments: payments.data || [], assignments: assignments.data || [], notes: notes.data || [], timeline: timeline.data || [], executives: executives.data || [], refunds: refunds.data || [], proofs: proofs.data || [] });
    setDetailBusy(false);
  };
  const rpc = async (name: string, args: any) => { setActionError(''); const result = await supabase.rpc(name, args); if (result.error) { setActionError(result.error.message); return false; } await refresh(); if (selected) await loadDetail(selected); return true; };
  const reasonForLockedEdit = (label: string) => {
    if (!selected || !lockedStatuses.includes(selected.status)) return '';
    if (!fullAccess) { setActionError(`${label} is locked once an order is out for delivery.`); return null; }
    const reason = window.prompt(`Admin override: explain why ${label.toLowerCase()} must change.`)?.trim();
    if (!reason) { setActionError('An override reason is required.'); return null; }
    return reason;
  };
  const changeStatus = async (order: any, value: string) => {
    if (!editable || value === order.status) return;
    const ordinary = (nextStatuses[order.status] || []).includes(value);
    let reason = '';
    if (value === 'cancelled') {
      reason = window.prompt('Cancellation reason (Customer Requested, Payment Failed, Item Unavailable, Delivery Issue, Duplicate Order, Operational Issue, or Other with explanation):')?.trim() || '';
      if (!reason) { setActionError('A cancellation reason is required.'); return; }
    } else if (!ordinary) {
      if (!fullAccess) { setActionError('That transition is not allowed.'); return; }
      reason = window.prompt(`Override ${nice(order.status)} → ${nice(value)}. Enter the required audit reason:`)?.trim() || '';
      if (!reason) { setActionError('An override reason is required.'); return; }
    }
    const ok = await rpc('set_order_status', { p_order_id: order.id, p_new_status: value, p_override_reason: reason || null });
    if (ok && selected?.id === order.id) setSelected({ ...order, status: value });
  };
  const addNote = async () => { if (!note.trim()) return; if (await rpc('add_order_internal_note', { p_order_id: selected.id, p_note: note.trim() })) setNote(''); };
  const assign = async (executiveId: string) => { if (!executiveId) return; const reason = reasonForLockedEdit('Assignment'); if (reason === null) return; await rpc('assign_order_executive', { p_order_id: selected.id, p_executive_id: executiveId, p_override_reason: reason || null }); };
  const savePrep = async (item: any, draft: any) => { const reason = reasonForLockedEdit('Preparation'); if (reason === null) return; await rpc('update_order_item_preparation', { p_order_item_id: item.id, p_actual_weight: draft.actual_weight ? Number(draft.actual_weight) : null, p_prepared: !!draft.prepared, p_weighed: !!draft.weighed, p_packed: !!draft.packed, p_label_attached: !!draft.label_attached, p_override_reason: reason || null }); };

  const now = Date.now();
  const slotMoment = (o: any, end = false) => { const time = (end ? o.delivery_slots?.end_time : o.delivery_slots?.start_time) || '00:00'; return new Date(`${o.delivery_date}T${String(time).slice(0, 8)}+05:30`).getTime(); };
  const live = (o: any) => !['delivered', 'cancelled', 'returned_undelivered'].includes(o.status);
  const approaching = orders.filter((o: any) => live(o) && slotMoment(o) > now && slotMoment(o) - now <= 60 * 60 * 1000);
  const overdue = orders.filter((o: any) => live(o) && slotMoment(o, true) < now);
  const paidUnconfirmed = orders.filter((o: any) => one(o.payments)?.status === 'Paid' && o.status === 'new');
  const readyUnassigned = orders.filter((o: any) => o.status === 'ready_for_dispatch' && !one(o.order_assignments));
  const paymentFailed = orders.filter((o: any) => one(o.payments)?.status === 'Failed');
  const deliveryFailed = orders.filter((o: any) => ['failed', 'returned_undelivered'].includes(o.status));
  const weightDifferences = orders.filter((o: any) => (o.order_items || []).some((item: any) => { const packed = one(item.order_item_preparation)?.actual_weight; return packed != null && item.ordered_weight != null && Math.abs(Number(packed) - Number(item.ordered_weight)) > 0.001; }));
  const unique = (key: string) => Array.from(new Set(orders.map((o: any) => key.split('.').reduce((v: any, k) => v?.[k], o)).filter(Boolean))) as string[];
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const filtered = orders.filter((o: any) => {
    const haystack = [o.order_number, o.customer_name, o.mobile, JSON.stringify(o.address || {}), one(o.payments)?.transaction_id].join(' ').toLowerCase();
    const created = new Date(o.created_at).getTime();
    const dateOK = filters.date === 'all' || (filters.date === 'today' && created >= dayStart.getTime()) || (filters.date === '7d' && created >= now - 7 * 86400000) || String(o.delivery_date) === filters.date;
    return haystack.includes(query.trim().toLowerCase()) && dateOK
      && (filters.status === 'all' || o.status === filters.status)
      && (filters.payment === 'all' || one(o.payments)?.status === filters.payment)
      && (filters.slot === 'all' || o.slot_id === filters.slot)
      && (filters.area === 'all' || o.area === filters.area)
      && (filters.executive === 'all' || (filters.executive === 'unassigned' ? !one(o.order_assignments) : one(o.order_assignments)?.executive_id === filters.executive))
      && (filters.orderType === 'all' || o.order_type === filters.orderType)
      && (filters.paymentMethod === 'all' || o.payment_method === filters.paymentMethod);
  });
  const setFilter = (name: string, value: string) => setFilters((f: any) => ({ ...f, [name]: value }));
  const countStatuses = ['new', 'confirmed', 'preparing', 'ready_for_dispatch', 'out_for_delivery', 'delivered', 'cancelled'];
  const statusCounts = countStatuses.map(status => ({ status, count: orders.filter((o: any) => o.status === status).length }));

  if (selected) return <OrderDetails order={selected} detail={detail} busy={detailBusy} editable={editable} fullAccess={fullAccess} actionError={actionError} onBack={() => { setSelected(null); setActionError(''); }} onStatus={changeStatus} onAssign={assign} onPrep={savePrep} onRefreshDetail={() => selected && loadDetail(selected)} note={note} setNote={setNote} onAddNote={addNote} />;

  return <Page title="Order management" sub="Control fulfilment from confirmation through final delivery." action={fullAccess ? <button className="outline" onClick={() => { const cols=['order_number','created_at','customer_name','mobile','status','total','payment_method','delivery_date','area']; const csv=[cols.join(','), ...filtered.map((o:any)=>cols.map(k=>JSON.stringify(o[k] ?? '')).join(','))].join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='jabwemeat-orders.csv'; a.click(); URL.revokeObjectURL(a.href); }}><Download /> Export CSV</button> : undefined}>
    {(approaching.length > 0 || overdue.length > 0 || paidUnconfirmed.length > 0 || readyUnassigned.length > 0 || paymentFailed.length > 0 || deliveryFailed.length > 0 || weightDifferences.length > 0) && <div className="ops-alerts">
      {overdue.length > 0 && <button onClick={() => setFilter('status', 'all')} className="overdue"><AlertTriangle /><span><b>{overdue.length} delivery slot{overdue.length === 1 ? '' : 's'} overdue</b><small>Active orders have passed their delivery window.</small></span></button>}
      {approaching.length > 0 && <button onClick={() => setFilter('status', 'all')}><CalendarClock /><span><b>{approaching.length} delivery slot{approaching.length === 1 ? '' : 's'} approaching</b><small>Delivery starts within the next hour.</small></span></button>}
      {paidUnconfirmed.length > 0 && <button onClick={() => setFilter('status', 'new')} className="overdue"><CreditCard /><span><b>{paidUnconfirmed.length} paid order{paidUnconfirmed.length === 1 ? '' : 's'} not confirmed</b><small>Payment was received but confirmation is pending.</small></span></button>}
      {readyUnassigned.length > 0 && <button onClick={() => setFilter('status', 'ready_for_dispatch')}><UserCheck /><span><b>{readyUnassigned.length} ready order{readyUnassigned.length === 1 ? '' : 's'} unassigned</b><small>Assign a delivery executive before dispatch.</small></span></button>}
      {paymentFailed.length > 0 && <button onClick={() => setFilter('payment', 'Failed')} className="overdue"><XCircle /><span><b>{paymentFailed.length} payment{paymentFailed.length === 1 ? '' : 's'} failed</b><small>Payment action is required.</small></span></button>}
      {deliveryFailed.length > 0 && <button onClick={() => setFilter('status', 'all')} className="overdue"><Truck /><span><b>{deliveryFailed.length} delivery exception{deliveryFailed.length === 1 ? '' : 's'}</b><small>Failed or undelivered orders need attention.</small></span></button>}
      {weightDifferences.length > 0 && <button onClick={() => setFilter('status', 'all')}><Scale /><span><b>{weightDifferences.length} weight difference{weightDifferences.length === 1 ? '' : 's'}</b><small>Actual packed weight differs from ordered weight.</small></span></button>}
    </div>}
    <div className="status-cards"><button className={filters.status === 'all' ? 'active' : ''} onClick={() => setFilter('status', 'all')}><small>All orders</small><b>{orders.length}</b></button>{statusCounts.map(x => <button key={x.status} className={filters.status === x.status ? 'active' : ''} onClick={() => setFilter('status', x.status)}><small>{nice(x.status)}</small><b>{x.count}</b></button>)}</div>
    <div className="order-filters"><label className="order-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Order, customer, mobile, address or transaction ID" /></label><select value={filters.date} onChange={e => setFilter('date', e.target.value)}><option value="all">All dates</option><option value="today">Today</option><option value="7d">Last 7 days</option></select><select value={filters.status} onChange={e => setFilter('status', e.target.value)}><option value="all">All statuses</option>{statuses.map(x => <option key={x} value={x}>{nice(x)}</option>)}</select><select value={filters.payment} onChange={e => setFilter('payment', e.target.value)}><option value="all">All payment states</option>{Array.from(new Set(orders.map((o: any) => one(o.payments)?.status).filter(Boolean))).map((x: any) => <option key={x}>{x}</option>)}</select><select value={filters.slot} onChange={e => setFilter('slot', e.target.value)}><option value="all">All slots</option>{slots.map((x: any) => <option key={x.id} value={x.id}>{x.label}</option>)}</select><select value={filters.area} onChange={e => setFilter('area', e.target.value)}><option value="all">All areas</option>{unique('area').map(x => <option key={x}>{x}</option>)}</select><select value={filters.executive} onChange={e => setFilter('executive', e.target.value)}><option value="all">All executives</option><option value="unassigned">Unassigned</option>{Array.from(new Map(orders.map((o: any) => [one(o.order_assignments)?.executive_id, one(o.order_assignments)?.delivery_executives]).filter((x: any) => x[0])).values()).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={filters.orderType} onChange={e => setFilter('orderType', e.target.value)}><option value="all">All order types</option>{unique('order_type').map(x => <option key={x}>{x}</option>)}</select><select value={filters.paymentMethod} onChange={e => setFilter('paymentMethod', e.target.value)}><option value="all">All payment methods</option>{unique('payment_method').map(x => <option key={x}>{x}</option>)}</select></div>
    <div className="filter-result"><b>{filtered.length}</b> of {orders.length} orders</div>
    <div className="table-wrap order-list"><table><thead><tr><th>Order / placed</th><th>Customer</th><th>Delivery</th><th>Items</th><th>Total</th><th>Payment</th><th>Executive</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((o: any) => <tr key={o.id}><td><b>{o.order_number}</b><small>{new Date(o.created_at).toLocaleString('en-IN')}</small><em>{o.order_type || 'Standard'}</em></td><td><b>{o.customer_name}</b><small>{o.mobile}</small></td><td><b>{o.delivery_slots?.label || '—'}</b><small>{new Date(`${o.delivery_date}T00:00:00`).toLocaleDateString('en-IN')} · {o.area || o.pincode}</small></td><td><b>{o.order_items?.reduce((n: number, x: any) => n + Number(x.quantity || 0), 0) || 0}</b><small>{o.order_items?.map((x: any) => x.product_name).join(', ') || '—'}</small></td><td><b>₹{Number(o.total).toLocaleString('en-IN')}</b></td><td><span className="payment-pill">{one(o.payments)?.status || 'Pending'}</span><small>{o.payment_method}</small></td><td>{one(o.order_assignments)?.delivery_executives?.name || <span className="muted">Unassigned</span>}</td><td><Status value={o.status} /></td><td><button className="view-order" onClick={() => loadDetail(o)}><Eye /> View</button></td></tr>)}</tbody></table>{!filtered.length && <Empty text="No matching orders" />}</div>
  </Page>;
}

function OrderDetails({ order, detail, busy, editable, fullAccess, actionError, onBack, onStatus, onAssign, onPrep, note, setNote, onAddNote, onRefreshDetail }: any) {
  const payment = detail.payments[0]; const assignment = detail.assignments[0];
  const address = order.address || {}; const addressText = [address.line1, address.line2, address.landmark, address.city, address.state, order.pincode].filter(Boolean).join(', ');
  const allowed = editable ? (fullAccess ? statuses : [order.status, ...(nextStatuses[order.status] || [])]) : [order.status];
  const locked = lockedStatuses.includes(order.status);
  return <div className="order-detail"><button className="back-link" onClick={onBack}><ArrowLeft /> Back to orders</button><div className="detail-hero"><div><span>ORDER DETAILS</span><h2>{order.order_number}</h2><p>Placed {new Date(order.created_at).toLocaleString('en-IN')} · {order.order_type || 'Standard'} order</p></div><div className="detail-status"><Status value={order.status} /><select disabled={!editable} value={order.status} onChange={e => onStatus(order, e.target.value)}>{allowed.map((s: string) => <option key={s} value={s}>{nice(s)}</option>)}</select></div></div>
    {actionError && <div className="error-banner detail-error">{actionError}</div>}{locked && <div className="lock-banner"><LockKeyhole /><span><b>Sensitive operations are locked.</b> {fullAccess ? 'Admin/Owner changes require an explicit audited reason.' : 'Only Admin or Owner can override this lock.'}</span></div>}{busy && <div className="sync-note">Loading complete order record…</div>}
    <div className="detail-summary"><article><Users /><div><small>Customer</small><b>{order.customer_name}</b><span>{order.mobile}</span><span>{order.email}</span></div></article><article><MapPin /><div><small>Delivery</small><b>{new Date(`${order.delivery_date}T00:00:00`).toLocaleDateString('en-IN')} · {order.delivery_slots?.label}</b><span>{addressText || order.area || order.pincode}</span><span>{order.area}</span></div></article><article><CreditCard /><div><small>Payment</small><b>{payment?.method || order.payment_method} · {payment?.status || 'Pending'}</b><span>₹{Number(payment?.amount ?? order.total).toLocaleString('en-IN')}</span><span>{payment?.transaction_id ? `Txn: ${payment.transaction_id}` : 'No transaction ID'}</span></div></article><article><UserCheck /><div><small>Delivery executive</small><b>{assignment?.delivery_executives?.name || 'Unassigned'}</b>{assignment?.delivery_executives?.mobile && <span>{assignment.delivery_executives.mobile}</span>}{editable && <select value={assignment?.executive_id || ''} onChange={e => onAssign(e.target.value)}><option value="">Choose executive…</option>{detail.executives.map((x: any) => <option key={x.id} value={x.id}>{x.name}{x.area ? ` · ${x.area}` : ''}</option>)}</select>}</div></article></div>
    <div className="detail-grid"><section className="detail-main"><article className="detail-card"><div className="detail-card-head"><h3><FileCheck /> Refund request & status</h3><span>Only Owner/Admin can create or change refund decisions.</span></div><RefundPanel order={order} refunds={detail.refunds} enabled={fullAccess} onSaved={onRefreshDetail} /></article><article className="detail-card"><div className="detail-card-head"><h3><WalletCards /> Delivery proof & COD collection</h3><span>Record proof of delivery and COD collection after handover.</span></div><ProofPanel order={order} proofs={detail.proofs} enabled={fullAccess} onSaved={onRefreshDetail} /></article><article className="detail-card"><div className="detail-card-head"><h3><ClipboardList /> Items & preparation</h3><span>All four checks and actual weight are required for dispatch.</span></div><div className="prep-list">{detail.items.map((item: any) => <PrepItem key={item.id} item={item} editable={editable && (!locked || fullAccess)} onSave={onPrep} />)}</div><div className="totals"><span>Subtotal <b>₹{Number(order.subtotal).toLocaleString('en-IN')}</b></span><span>Discount <b>− ₹{Number(order.discount || 0).toLocaleString('en-IN')}</b></span><span>Delivery <b>₹{Number(order.delivery_charge || 0).toLocaleString('en-IN')}</b></span><strong>Total <b>₹{Number(order.total).toLocaleString('en-IN')}</b></strong></div></article><article className="detail-card"><div className="detail-card-head"><h3><MessageSquare /> Internal notes</h3><span>Visible only to authorised operations users.</span></div>{editable && <div className="note-compose"><textarea value={note} maxLength={2000} onChange={e => setNote(e.target.value)} placeholder="Add an operational note…" /><button className="primary" disabled={!note.trim()} onClick={onAddNote}>Add note</button></div>}<div className="note-list">{detail.notes.map((x: any) => <div key={x.id}><p>{x.note}</p><small>{x.created_by_email || 'System'} · {new Date(x.created_at).toLocaleString('en-IN')}</small></div>)}{!detail.notes.length && <p className="muted">No internal notes yet.</p>}</div></article></section><aside className="timeline-card"><h3><History /> Timeline</h3><div className="timeline">{detail.timeline.map((x: any) => <div key={x.id}><i /><p><b>{x.message}</b>{x.from_status && x.to_status && <span>{nice(x.from_status)} → {nice(x.to_status)}</span>}{x.override_reason && <em>Override: {x.override_reason}</em>}<small>{x.actor_email || 'System'} · {new Date(x.created_at).toLocaleString('en-IN')}</small></p></div>)}{!detail.timeline.length && <p className="muted">No timeline events.</p>}</div></aside></div>
  </div>;
}

function RefundPanel({ order, refunds, enabled, onSaved }: any) { const [status, setStatus] = useState('Requested'); const [amount, setAmount] = useState(String(order.total || '')); const [reason, setReason] = useState(''); const latest = refunds[0]; const save = async () => { const payload = { order_id: order.id, amount: Number(amount || 0), reason: reason.trim() || null, status }; const result = latest ? await supabase.from('refund_requests').update(payload).eq('id', latest.id) : await supabase.from('refund_requests').insert(payload); if (result.error) alert(result.error.message); else { setReason(''); onSaved(); } }; return <div className="ops-form"><div className="ops-record"><b>{latest ? nice(latest.status) : 'No refund requested'}</b>{latest?.amount != null && <span>₹{Number(latest.amount).toLocaleString('en-IN')}</span>}</div>{enabled && <div className="ops-controls"><select value={status} onChange={e => setStatus(e.target.value)}><option>Requested</option><option>Approved</option><option>Rejected</option><option>Processed</option></select><input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Refund amount" /><input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" /><button className="outline" onClick={save}>{latest ? 'Update refund' : 'Create request'}</button></div>}{!enabled && <small className="muted">Owner/Admin access is required to manage refunds.</small>}</div>; }
function ProofPanel({ order, proofs, enabled, onSaved }: any) { const latest = proofs[0]; const [proofUrl, setProofUrl] = useState(latest?.proof_url || ''); const [cod, setCod] = useState(String(latest?.cod_collected ?? (order.payment_method === 'COD' ? order.total : 0))); const [status, setStatus] = useState(latest?.status || 'Pending'); const save = async () => { const payload = { order_id: order.id, proof_url: proofUrl.trim() || null, cod_collected: Number(cod || 0), status }; const result = latest ? await supabase.from('delivery_proofs').update(payload).eq('id', latest.id) : await supabase.from('delivery_proofs').insert(payload); if (result.error) alert(result.error.message); else onSaved(); }; return <div className="ops-form"><div className="ops-record"><b>{latest ? nice(latest.status) : 'No delivery proof recorded'}</b><span>COD collected: ₹{Number(latest?.cod_collected || 0).toLocaleString('en-IN')}</span></div>{enabled && <div className="ops-controls"><select value={status} onChange={e => setStatus(e.target.value)}><option>Pending</option><option>Collected</option><option>Failed</option></select><input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="Proof URL (photo/signature)" /><input type="number" min="0" value={cod} onChange={e => setCod(e.target.value)} placeholder="COD collected" /><button className="outline" onClick={save}>{latest ? 'Update proof' : 'Save proof'}</button></div>}{!enabled && <small className="muted">Owner/Admin access is required to record delivery proof or COD.</small>}</div>; }

function PrepItem({ item, editable, onSave }: any) {
  const source = item.order_item_preparation?.[0] || { actual_weight: '', prepared: false, weighed: false, packed: false, label_attached: false };
  const [draft, setDraft] = useState<any>({ ...source });
  useEffect(() => setDraft({ ...source }), [source.actual_weight, source.prepared, source.weighed, source.packed, source.label_attached]);
  const set = (key: string, value: any) => setDraft((d: any) => ({ ...d, [key]: value }));
  const complete = draft.prepared && draft.weighed && draft.packed && draft.label_attached && Number(draft.actual_weight) > 0;
  const ordered = Number(item.ordered_weight || 0); const actual = Number(draft.actual_weight || 0); const variance = actual && ordered ? actual - ordered : 0;
  return <div className={'prep-item ' + (complete ? 'complete' : '')}><div className="prep-product"><Box /><div><b>{item.product_name}</b><span>{item.sku} · Qty {item.quantity}</span></div><strong>₹{Number(item.line_total).toLocaleString('en-IN')}</strong></div><div className="weight-fields"><label><Scale /> Ordered weight<input disabled value={item.ordered_weight ? `${item.ordered_weight} ${item.ordered_weight_unit || 'g'}` : 'Not recorded'} /></label><label><Scale /> Actual weight (g)<input disabled={!editable} type="number" min="0" step="0.001" value={draft.actual_weight ?? ''} onChange={e => set('actual_weight', e.target.value)} /></label></div>{variance !== 0 && <div className="weight-variance"><AlertTriangle /> Weight difference: {variance > 0 ? '+' : ''}{variance.toFixed(3)} g — retain the original order amount and flag for payment/refund review.</div>}<div className="prep-checks">{[['prepared','Prepared'],['weighed','Weighed'],['packed','Packed'],['label_attached','Label attached']].map(([key,label]) => <label key={key}><input disabled={!editable} type="checkbox" checked={!!draft[key]} onChange={e => set(key, e.target.checked)} />{label}</label>)}</div>{editable && <button className="outline prep-save" onClick={() => onSave(item, draft)}>Save preparation</button>}</div>;
}

function Inventory({ products, refresh, editable }: any) {
  const sample = [
    { id: 'sample-1', name: 'Chicken Curry Cut', sku: 'JWM-CHK-001', stock: 18, unit: 'KG', minimum: 10, updated: '2025-02-14T10:30:00Z' },
    { id: 'sample-2', name: 'Mutton Boneless', sku: 'JWM-MUT-002', stock: 4, unit: 'KG', minimum: 8, updated: '2025-02-14T09:15:00Z' },
    { id: 'sample-3', name: 'Eggs (Farm Fresh)', sku: 'JWM-EGG-003', stock: 0, unit: 'PCS', minimum: 12, updated: '2025-02-13T17:45:00Z' }
  ];
  const rows = (products || []).length ? products.map((p: any) => ({ ...p, unit: p.unit || p.stock_unit || 'PCS', minimum: Number(p.low_stock_threshold ?? p.minimum_stock ?? 0), updated: p.updated_at || p.created_at })) : sample;
  const [selected, setSelected] = useState<any>(null); const [history, setHistory] = useState<any[]>([]); const [adjustment, setAdjustment] = useState(''); const [reason, setReason] = useState(''); const [modalError, setModalError] = useState(''); const [busy, setBusy] = useState(false);
  const open = async (product: any) => { if (String(product.id).startsWith('sample-')) return; setSelected(product); setAdjustment(''); setReason(''); setModalError(''); const result = await supabase.from('inventory_adjustments').select('*').eq('product_id', product.id).order('created_at', { ascending: false }).limit(25); if (result.error) setModalError(result.error.message); setHistory(result.data || []); };
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (!selected || !editable) return; const quantity = Number(adjustment); if (!adjustment.trim() || !Number.isInteger(quantity) || quantity === 0) { setModalError('Enter a non-zero whole-number adjustment quantity.'); return; } if (!reason.trim()) { setModalError('A reason is required.'); return; } setBusy(true); setModalError(''); const result = await supabase.rpc('adjust_inventory_stock', { p_product_id: selected.id, p_adjustment_quantity: quantity, p_reason: reason.trim() }); if (result.error) { setModalError(result.error.message); setBusy(false); return; } setBusy(false); setSelected(null); await refresh(); };
  const status = (stock: number, minimum: number) => stock <= 0 ? 'Out of Stock' : stock <= minimum ? 'Low Stock' : 'In Stock';
  return <Page title="Inventory" sub="Monitor current stock levels across the catalogue.">
    <div className="table-wrap basic-inventory"><table><thead><tr><th>Product name</th><th>SKU</th><th>Current stock</th><th>Unit</th><th>Minimum stock</th><th>Status</th><th>Last updated</th><th>View</th></tr></thead><tbody>
      {rows.map((p: any) => { const stock = Number(p.stock || 0), minimum = Number(p.minimum || 0), state = status(stock, minimum); return <tr key={p.id || p.sku}><td><b>{p.name}</b></td><td>{p.sku || '—'}</td><td>{stock}</td><td>{String(p.unit).toUpperCase()}</td><td>{minimum}</td><td><span className={`status ${state === 'In Stock' ? 'in-stock' : state === 'Out of Stock' ? 'out-of-stock' : ''}`}>{state}</span></td><td>{p.updated ? new Date(p.updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td><td><button className="view-order" disabled={String(p.id).startsWith('sample-')} onClick={() => open(p)}><Eye /> View</button></td></tr>; })}
    </tbody></table></div>
    {selected && <div className="modal-backdrop"><form className="modal inventory-modal" onSubmit={save}><button type="button" className="modal-close" onClick={() => setSelected(null)}>×</button><span className="modal-kicker">INVENTORY ADJUSTMENT</span><h3>{selected.name}</h3><p className="modal-help">Current stock: <b>{Number(selected.stock || 0)} {selected.unit || selected.stock_unit || 'PCS'}</b></p><label>Adjustment quantity<input type="number" step="1" required value={adjustment} onChange={e => setAdjustment(e.target.value)} placeholder="e.g. 5 or -2" disabled={!editable || busy} /></label><label>Reason<textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this stock changing?" disabled={!editable || busy} /></label>{modalError && <div className="error-banner">{modalError}</div>}{editable && <button className="primary wide" disabled={busy}>{busy ? 'Saving…' : 'Save adjustment'}</button>}<h4>Adjustment history</h4><div className="table-wrap inventory-history"><table><thead><tr><th>Who</th><th>Date & time</th><th>Previous</th><th>Adjustment</th><th>New</th><th>Reason</th></tr></thead><tbody>{history.length ? history.map((item: any) => <tr key={item.id || item.created_at}><td>{item.adjusted_by || '—'}</td><td>{item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : '—'}</td><td>{item.previous_quantity}</td><td className={Number(item.adjustment_quantity) > 0 ? 'quantity-positive' : 'quantity-negative'}>{Number(item.adjustment_quantity) > 0 ? '+' : ''}{item.adjustment_quantity}</td><td>{item.new_quantity}</td><td>{item.reason}</td></tr>) : <tr><td colSpan={6} className="muted">No adjustments recorded yet.</td></tr>}</tbody></table></div></form></div>}
  </Page>;
}

function Slots({ slots, refresh, editable }: any) { const save = async (s: any) => { if (!editable) return; const { error } = await supabase.from('delivery_slots').update({ capacity: Number(s.capacity), active: s.active }).eq('id', s.id); if (error) alert(error.message); else refresh(); }; return <Page title="Delivery slots" sub="Keep live capacity and availability aligned with dispatch operations."><div className="slot-grid">{slots.map((s: any) => <div className="slot-card" key={s.id}><span>DELIVERY WINDOW</span><h3>{s.label}</h3><label>Capacity<input disabled={!editable} type="number" min="0" value={s.capacity} onChange={e => { s.capacity = e.target.value; }} onBlur={() => save(s)} /></label><label className="toggle"><input disabled={!editable} type="checkbox" checked={s.active} onChange={e => { s.active = e.target.checked; save(s); }} /> Accepting orders</label>{editable && <button className="outline" onClick={() => save(s)}>Save changes</button>}</div>)}</div></Page>; }

function Customers() {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    const { data, error: loadError } = await supabase.from('customer_directory').select('*').order('last_order_at', { ascending: false, nullsFirst: false });
    // The directory is a derived view added by the customers migration. Keep the module usable
    // while that migration is being applied (or when an empty staging database is connected).
    setRows(loadError ? [] : (data || []));
    if (loadError) setError(loadError.message);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const open = async (customer: any) => {
    setSelected(customer); setDetail(null); setDetailLoading(true);
    const orderSelect = 'id,order_number,created_at,total,payment_method,status,delivery_date,email,mobile,payments(status,method)';
    const queries = [
      customer.id ? supabase.from('orders').select(orderSelect).eq('user_id', customer.id) : null,
      customer.email ? supabase.from('orders').select(orderSelect).eq('email', customer.email) : null,
      customer.mobile ? supabase.from('orders').select(orderSelect).eq('mobile', customer.mobile) : null,
      customer.id ? supabase.from('addresses').select('*').eq('user_id', customer.id).order('is_default', { ascending: false }) : null
    ].filter(Boolean) as any[];
    const results = await Promise.all(queries);
    const orders = results.slice(0, customer.id ? 3 : 2).flatMap(result => result.data || []);
    const uniqueOrders = Array.from(new Map(orders.map((order: any) => [order.id, order])).values())
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const addressesResult = customer.id ? results[results.length - 1] : { data: [] };
    setDetail({ orders: uniqueOrders, addresses: addressesResult.data || [] });
    setDetailLoading(false);
  };

  const filtered = rows.filter(c => [c.name, c.mobile, c.email].join(' ').toLowerCase().includes(query.toLowerCase()));
  if (selected) {
    if (detailLoading || !detail) return <Page title="Customer detail" sub="Account, saved addresses and preserved order history."><button className="outline" onClick={() => setSelected(null)}>← Back to customers</button><div className="empty-state"><RefreshCw /> Loading customer details…</div></Page>;
    const orders = detail.orders || [];
    const totalOrders = Number(selected.total_orders ?? orders.length);
    const totalSpent = Number(selected.total_spent ?? orders.filter((o: any) => o.status !== 'cancelled').reduce((sum: number, o: any) => sum + Number(o.total || 0), 0));
    return <Page title="Customer detail" sub="Account, saved addresses and preserved order history.">
      <button className="outline" onClick={() => { setSelected(null); setDetail(null); }}>← Back to customers</button>
      <div className="detail-summary customer-summary">
        <article><Users /><div><small>Customer</small><b>{selected.name || 'Unnamed customer'}</b><span>{selected.mobile || '—'}</span><span>{selected.email || '—'}</span></div></article>
        <article><ClipboardList /><div><small>Summary</small><b>{totalOrders} total orders</b><span>₹{totalSpent.toLocaleString('en-IN')} total spent</span><span>Last order: {selected.last_order_at ? new Date(selected.last_order_at).toLocaleDateString('en-IN') : '—'}</span></div></article>
        <article><ShieldCheck /><div><small>Account status</small><b>{selected.active ? 'Active' : 'Inactive'}</b><span>{selected.email_verified ? 'Email verified' : 'Email not verified'}</span><span>{selected.mobile_verified ? 'Mobile verified' : 'Mobile not verified'}</span></div></article>
      </div>
      <div className="customer-detail-grid">
        <Panel title="Saved addresses" ><div className="customer-addresses">{detail.addresses.length ? detail.addresses.map((a: any) => <p key={a.id}><b>{a.label || 'Address'}</b>{a.is_default && <span className="muted"> · Default</span>}<br />{a.recipient_name}, {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}</p>) : <p className="muted">No saved addresses</p>}</div></Panel>
        <Panel title="Order history">{orders.length ? <div className="table-wrap customer-orders"><table><thead><tr><th>ID</th><th>Date</th><th>Amount</th><th>Payment status</th><th>Order status</th><th>Delivery status</th></tr></thead><tbody>{orders.map((o: any) => { const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments; const paymentStatus = payment?.status || (o.payment_method === 'COD' ? 'COD' : 'Pending'); const deliveryStatus = o.status === 'delivered' ? 'Delivered' : o.status === 'out_for_delivery' ? 'Out for delivery' : o.status === 'failed' || o.status === 'returned_undelivered' ? 'Delivery exception' : 'Not dispatched'; return <tr key={o.id}><td><b>{o.order_number}</b></td><td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '—'}</td><td>₹{Number(o.total || 0).toLocaleString('en-IN')}</td><td>{paymentStatus}</td><td><Status value={o.status} /></td><td>{deliveryStatus}</td></tr>; })}</tbody></table></div> : <p className="muted">No orders found for this customer.</p>}</Panel>
      </div>
    </Page>;
  }

  return <Page title="Customers" sub="Derived from accounts and orders; order history is preserved.">
    <label className="order-search customer-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, mobile or email" /></label>
    {error && <div className="error-banner customer-error">Unable to load customers: {error} <button onClick={load}>Retry</button></div>}
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Total Orders</th><th>Total Spent</th><th>Last Order Date</th><th>Status</th><th>View Customer</th></tr></thead><tbody>{filtered.map(c => <tr key={`${c.id || c.email}-${c.mobile}`}><td><b>{c.name || 'Unnamed customer'}</b></td><td>{c.mobile || '—'}</td><td>{c.email || '—'}</td><td>{Number(c.total_orders || 0)}</td><td>₹{Number(c.total_spent || 0).toLocaleString('en-IN')}</td><td>{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-IN') : '—'}</td><td><span className={'member-status ' + (c.active ? 'active' : 'inactive')}><i />{c.active ? 'Active' : 'Inactive'}</span></td><td><button className="view-order" onClick={() => open(c)}><Eye /> View Customer</button></td></tr>)}</tbody></table>{loading ? <div className="empty-state"><RefreshCw /> Loading customers…</div> : !filtered.length && !error && <Empty text={query ? 'No customers match your search' : 'No customers yet'} />}</div>
  </Page>;
}
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
