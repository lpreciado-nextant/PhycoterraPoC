import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowRight, Bell, Check, ChevronRight, ClipboardList, Clock3, Compass, LayoutDashboard, Leaf, PackageCheck, Plus, RotateCcw, Search, ShieldCheck, ShoppingCart, SlidersHorizontal, Sprout, Truck, X } from 'lucide-react'
import { Badge, EmptyState, ErrorNotice, Modal } from './components/ui'
import { errorMessage, loadData, resetData, saveData } from './data/storage'
import { categories, dateLabel, hasHold, money, newDraft, nextStep, overdue, people, personSchema, status, statuses, total, transition, vendors } from './domain/workflow'
import type { Action, Dataset, Draft, Person, Request, Status } from './domain/workflow'
import { RequestForm } from './features/RequestForm'
import { RequestDetail } from './features/RequestDetail'
import { GuidedTour } from './components/GuidedTour'
import { seedData } from './data/seed'
import { tourDialog, tourSteps } from './features/tour'
import type { WorkspaceView } from './features/tour'

type View = WorkspaceView
type Filter = 'All' | Status | 'Overdue' | 'On hold'
const navigation = [
  { title: 'Overview', icon: LayoutDashboard },
  { title: 'Requests', icon: ClipboardList },
  { title: 'Approvals', icon: ShieldCheck },
  { title: 'Purchasing', icon: ShoppingCart },
  { title: 'Receiving', icon: PackageCheck },
] as const
type Dialog = { kind: 'detail'; id: string } | { kind: 'form'; existingId?: string; id: string; token: string } | { kind: 'notifications' } | { kind: 'reset' } | null
function initialData(): { data: Dataset | null; error: string } {
  try { return { data: loadData(), error: '' } }
  catch (error) { return { data: null, error: `Demo data could not be loaded. ${errorMessage(error)}` } }
}
function rank(r: Request): number {
  if (overdue(r)) return 0
  if (hasHold(r)) return 1
  return statuses.indexOf(status(r)) + 2
}
function age(request: Request, now: Date) {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(request.createdAt).getTime()) / 86400000))
  return days === 0 ? 'Today' : `${days}d ago`
}

export default function App() {
  const [loaded] = useState(initialData)
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setClock(new Date())
    const interval = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [])
  const [savedData, setData] = useState(loaded.data)
  const dataRef = useRef(savedData)
  const [loadError, setLoadError] = useState(loaded.error)
  const [workspacePersona, setPersona] = useState<Person>('janet')
  const [workspaceView, setView] = useState<View>('Overview')
  const [workspaceDialog, setDialog] = useState<Dialog>(null)
  const [workspaceFilter, setFilter] = useState<Filter>('All')
  const [workspaceSearch, setSearch] = useState('')
  const [workspaceCategory, setCategory] = useState('All')
  const [workspaceVendor, setVendor] = useState('All')
  const [workspaceRequester, setRequester] = useState('All')
  const [toast, setToast] = useState('')
  const [resetError, setResetError] = useState('')
  const [tour, setTour] = useState<{ index: number; data: Dataset; scrollX: number; scrollY: number } | null>(null)
  const tourStartRef = useRef<HTMLButtonElement>(null)
  const tourStep = tour ? tourSteps[tour.index] : null
  const data = tour?.data ?? savedData
  const persona = tourStep?.persona ?? workspacePersona
  const view = tourStep?.view ?? workspaceView
  const dialog: Dialog = tourStep ? tourDialog(tourStep) : workspaceDialog
  const filter = tourStep ? tourStep.filter ?? 'All' : workspaceFilter
  const search = tour ? '' : workspaceSearch
  const category = tour ? 'All' : workspaceCategory
  const vendor = tour ? 'All' : workspaceVendor
  const requester = tour ? 'All' : workspaceRequester

  function startTour() {
    setTour({ index: 0, data: seedData(), scrollX: window.scrollX, scrollY: window.scrollY })
  }
  function exitTour() {
    const position = tour
    setTour(null)
    requestAnimationFrame(() => {
      tourStartRef.current?.focus({ preventScroll: true })
      if (position) window.scrollTo({ left: position.scrollX, top: position.scrollY, behavior: 'instant' })
    })
  }
  function moveTour(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= tourSteps.length) throw new Error('Invalid walkthrough step.')
    setTour(current => current ? { ...current, index } : null)
  }

  function commit(change: (data: Dataset) => Dataset, message: string) {
    if (tour) throw new Error('Exit the read-only walkthrough before changing requests.')
    if (!dataRef.current) throw new Error('Recover demo data before making changes.')
    const updated = change(dataRef.current)
    saveData(updated)
    dataRef.current = updated
    setData(updated)
    setToast(message)
  }
  function act(id: string, action: Action, token: string) {
    commit(current => ({
      ...current,
      requests: current.requests.map(r => r.id === id ? transition(r, action, persona, token) : r),
    }), 'Saved to this browser. No external action was taken.')
  }
  function openForm(existing?: Request) {
    const next = Math.max(0, ...(dataRef.current?.requests.map(r => Number(r.id.replace('DEMO-', ''))) ?? [])) + 1
    setDialog({ kind: 'form', existingId: existing?.id, id: existing?.id ?? `DEMO-${String(next).padStart(3, '0')}`, token: crypto.randomUUID() })
  }
  function saveDraft(draft: Draft, submit: boolean) {
    if (dialog?.kind !== 'form') return
    commit(current => {
      const found = current.requests.find(r => r.id === dialog.id)
      if (found && !dialog.existingId) return current
      let updated = found ? transition(found, { type: 'edit', draft }, persona, `${dialog.token}-edit`) : newDraft(draft, persona, dialog.id)
      if (submit) updated = transition(updated, { type: 'submit' }, persona, `${dialog.token}-submit`)
      return { ...current, requests: found ? current.requests.map(r => r.id === updated.id ? updated : r) : [...current.requests, updated] }
    }, submit ? 'Request submitted. The demo approval policy has been applied.' : 'Draft saved to this browser.')
    setDialog({ kind: 'detail', id: dialog.id })
  }
  function reset() {
    try {
      if (tour) throw new Error('Exit the read-only walkthrough before resetting data.')
      const fresh = resetData()
      dataRef.current = fresh
      setData(fresh)
      setLoadError('')
      setResetError('')
      setDialog(null)
      setToast('Demo reset. The 15 fictional scenarios have been restored.')
      navigate('Overview')
    } catch (error) { setResetError(`Reset failed. ${errorMessage(error)} Check browser storage permissions and try again.`) }
  }
  function navigate(target: View, statusFilter: Filter = 'All') {
    setView(target); setFilter(statusFilter); setSearch(''); setVendor('All'); setCategory('All'); setRequester('All')
  }
  const scoped = (data?.requests ?? []).filter(r => people[persona].role !== 'requester' || r.requester === persona)
  const counts = {
    approval: scoped.filter(r => status(r) === 'Pending approval').length,
    purchasing: scoped.filter(r => status(r) === 'Ready to purchase').length,
    overdue: scoped.filter(r => overdue(r)).length,
    holds: scoped.filter(hasHold).length,
    receiving: scoped.filter(r => r.purchase && status(r) !== 'Completed').length,
  }
  const pageItems = scoped.filter(r => {
    const s = status(r)
    if (view === 'Overview' && (s === 'Completed' || s === 'Rejected')) return false
    if (view === 'Approvals' && s !== 'Pending approval') return false
    if (view === 'Purchasing' && s !== 'Ready to purchase') return false
    if (view === 'Receiving' && (!r.purchase || s === 'Completed')) return false
    if (filter === 'Overdue' ? !overdue(r) : filter === 'On hold' ? !hasHold(r) : filter !== 'All' && s !== filter) return false
    if (category !== 'All' && !r.lines.some(l => l.category === category)) return false
    if (vendor !== 'All' && (r.purchase?.vendor ?? r.vendor) !== vendor) return false
    if (requester !== 'All' && r.requester !== requester) return false
    const query = search.toLowerCase().trim()
    return !query || [r.id, r.title, r.vendor, ...r.lines.map(l => l.description)].some(v => v.toLowerCase().includes(query))
  }).sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt))
  const notifications = scoped.flatMap(r => r.events.filter(e => e.audience.includes(persona)).map(e => ({ ...e, request: r }))).sort((a, b) => b.at.localeCompare(a.at))
  const recent = scoped.flatMap(r => r.events.map(e => ({ ...e, request: r }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4)
  const selected = dialog?.kind === 'detail' ? data?.requests.find(r => r.id === dialog.id) : undefined
  const activeOrders = scoped.filter(r => r.purchase)
  const greeting = clock.getHours() < 12 ? 'Good morning' : clock.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const descriptions: Record<View, string> = {
    Overview: 'A clear view of what needs you, from request to receipt.',
    Requests: people[persona].role === 'requester' ? 'Your requests, progress, and next steps in one place.' : 'One place for every request and every handoff.',
    Approvals: 'Review the details. Make the next step clear.',
    Purchasing: 'Approved and ready for purchasing. Nothing is sent to suppliers.',
    Receiving: 'Record what arrived. Keep outstanding items and inspection holds visible.',
  }
  const cardMetrics = [
    { title: 'Awaiting approval', number: counts.approval, icon: ShieldCheck, tone: 'amber', note: 'Manager review needed', target: 'Approvals' as View, filter: 'All' as Filter },
    { title: 'Ready to purchase', number: counts.purchasing, icon: ShoppingCart, tone: 'green', note: 'Cleared for the next step', target: 'Purchasing' as View, filter: 'All' as Filter },
    { title: 'Overdue deliveries', number: counts.overdue, icon: Truck, tone: 'red', note: 'A supplier follow-up is due', target: 'Receiving' as View, filter: 'Overdue' as Filter },
    { title: 'Inspection holds', number: counts.holds, icon: ClipboardList, tone: 'brown', note: 'Human review before release', target: 'Receiving' as View, filter: 'On hold' as Filter },
  ]

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to workspace</a>
    <aside className="sidebar">
      <div className="brand"><strong>PhycoTerra</strong><span>PURCHASING WORKSPACE</span></div>
      <div className="sidebar-content">
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ title, icon: Icon }) => {
            const count = title === 'Approvals' ? counts.approval : title === 'Purchasing' ? counts.purchasing : title === 'Receiving' ? counts.receiving : null
            return <button key={title} className={`nav-item ${view === title ? 'active' : ''}`} onClick={() => navigate(title)} aria-current={view === title ? 'page' : undefined}><Icon size={19} /><span>{title}</span>{count !== null && <span className="nav-count">{count}</span>}</button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="policy-card"><Sprout size={24} /><strong>Clear steps.<br />Smoother seasons.</strong><p>Under $1,000: no approval.<br />$1,000+: manager review.</p><span>Illustrative demo policy</span></div>
          <button className="reset-button" onClick={() => { setResetError(''); setDialog({ kind: 'reset' }) }}><RotateCcw size={15} />Reset demo data</button>
          <div className="local-label"><span />Stored in this browser only</div>
        </div>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14} /><strong>{view}</strong></div><div className="topbar-actions"><button ref={tourStartRef} data-tour="tour-start" className="button secondary small tour-launch" disabled={!!loadError || !!tour || !!workspaceDialog} onClick={startTour}><Compass size={16} />Guided walkthrough</button><span className="demo-pill"><span />{tour ? 'Tour · temporary samples' : 'Demo · synthetic data'}</span><button className="notification-button" aria-label={`Notifications (${notifications.length})`} onClick={() => setDialog({ kind: 'notifications' })}><Bell size={20} />{notifications.length > 0 && <span className="notification-dot" />}</button><div className="persona" data-tour="personas"><div className="avatar">{persona === 'janet' ? 'J' : persona === 'manager' ? 'M' : 'R'}</div><label><span>VIEWING AS</span><select aria-label="Demo persona" value={persona} onChange={e => { const p = personSchema.parse(e.target.value); setPersona(p); setDialog(null); navigate(people[p].role === 'requester' ? 'Requests' : 'Overview') }}>{Object.entries(people).map(([id, person]) => <option value={id} key={id}>{person.name}</option>)}</select></label></div></div></header>
      <main id="main">
        {toast && !tour && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
        {loadError ? <section className="panel recovery"><ErrorNotice message={loadError} /><p>Your existing browser data has not been overwritten. Check storage permissions, or explicitly reset the demo to recover.</p><button className="button primary" onClick={() => setDialog({ kind: 'reset' })}>Reset demo data</button></section> : <>
          <div className="page-heading" data-tour="welcome"><div><div className="eyebrow">{view === 'Overview' ? `${dateLabel(clock.toISOString())} / OPERATIONS AT A GLANCE` : 'PURCHASING WORKSPACE'}</div><h1>{view === 'Overview' ? `${greeting}, ${people[persona].short}.` : view}</h1><p>{descriptions[view]}</p></div>{people[persona].role === 'requester' ? <button className="button primary" data-tour="new-request" onClick={() => openForm()}><Plus size={18} />New request</button> : <div className="heading-note"><Leaf size={17} /><span>Every request.<br /><strong>A clear next step.</strong></span></div>}</div>
          {view === 'Overview' && <>
            <section className="metrics" data-tour="metrics" aria-label="Workflow summary">{cardMetrics.map(({ title, number, icon: Icon, tone, note, target, filter: f }) => <button className={`metric ${tone}`} key={title} onClick={() => navigate(target, f)}><div className="metric-top"><span>{title}</span><span className="metric-icon"><Icon size={19} /></span></div><strong>{String(number).padStart(2, '0')}</strong><div className="metric-bottom"><span>{note}</span><ArrowRight size={16} /></div></button>)}</section>
            {(counts.overdue > 0 || counts.holds > 0) && <div className="attention-strip"><span className="attention-icon"><Clock3 size={18} /></span><div><strong>A few things need your attention</strong><span>{counts.overdue} overdue {counts.overdue === 1 ? 'delivery' : 'deliveries'} and {counts.holds} inspection {counts.holds === 1 ? 'hold' : 'holds'}. Keep the next handoff moving.</span></div><button onClick={() => navigate('Receiving')} className="text-button">Review receiving <ArrowRight size={15} /></button></div>}
          </>}
          <section className="panel request-panel">
            <div className="panel-heading"><div><h2>{view === 'Overview' ? 'Your work queue' : view === 'Requests' ? 'Purchase requests' : `${view} queue`} <span className="count-pill">{pageItems.length}</span></h2><p>{view === 'Overview' ? 'Exceptions first, then the next actions that keep things moving.' : 'Select a request to view its details and available actions.'}</p></div>{view === 'Overview' && <button className="text-button" onClick={() => navigate('Requests')}>View all requests <ArrowRight size={16} /></button>}</div>
            <div className="filters" data-tour="filters">
              <label className="search-field"><Search size={17} /><input type="search" aria-label="Search requests" placeholder="Search request, item, or supplier..." value={search} onChange={e => setSearch(e.target.value)} /></label>
              <label className="filter-field"><SlidersHorizontal size={15} /><select aria-label="Filter by status" value={filter} onChange={e => { const value = e.target.value; if (value === 'All' || value === 'Overdue' || value === 'On hold' || statuses.some(s => s === value)) setFilter(value as Filter) }}><option value="All">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}<option>Overdue</option><option>On hold</option></select></label>
              <select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option value="All">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
              <select aria-label="Filter by supplier" value={vendor} onChange={e => setVendor(e.target.value)}><option value="All">All suppliers</option>{vendors.map(v => <option key={v}>{v}</option>)}</select>
              {people[persona].role !== 'requester' && <select aria-label="Filter by requester" value={requester} onChange={e => setRequester(e.target.value)}><option value="All">All requesters</option><option value="field">Field Programs</option><option value="operations">Operations</option></select>}
            </div>
            {pageItems.length ? <div className="table-scroll"><table className="request-table"><thead><tr><th>Request / requester</th><th>Status</th><th>Next step / owner</th><th>Amount</th><th>Expected arrival</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
              {pageItems.map(r => <tr key={r.id} data-tour={`request-${r.id}`}>
                <td><span className="request-id">{r.id}</span><button className="request-title" onClick={() => setDialog({ kind: 'detail', id: r.id })}>{r.title}</button><small>{people[r.requester].short} <span>·</span> {age(r, clock)}</small></td>
                <td><div className="status-stack"><Badge value={status(r)} />{overdue(r) && <Badge value="Overdue" />}{hasHold(r) && status(r) !== 'Inspection hold' && <Badge value="On hold" />}</div></td>
                <td><span className="next-step-text">{nextStep(r).action}</span><small>{nextStep(r).owner}</small></td>
                <td className="amount">{money(total(r))}</td>
                <td className={overdue(r) ? 'danger-text date-cell' : 'date-cell'}>{r.purchase ? dateLabel(r.purchase.expected) : <span className="muted">Not ordered</span>}</td>
                <td><button className="icon-button" onClick={() => setDialog({ kind: 'detail', id: r.id })} aria-label={`Open ${r.id}`}><ChevronRight size={18} /></button></td>
              </tr>)}
            </tbody></table></div> : <EmptyState title="Nothing in this queue" text="You're all caught up here, or no requests match your filters." />}
            <div className="table-footer"><span>{pageItems.length} {pageItems.length === 1 ? 'request' : 'requests'} · {people[persona].role === 'requester' ? 'Your requests only' : 'All demo requesters'}</span><span>Amounts in USD, excluding tax & freight</span></div>
          </section>
          {view === 'Overview' && <div className="overview-bottom">
            <section className="panel" data-tour="suppliers"><div className="panel-heading"><div><h2>Supplier snapshot</h2><p>Recorded purchases, not invoices or payments.</p></div><span className="section-icon"><ShoppingCart size={18} /></span></div><div className="supplier-list">
              {vendors.map(v => {
                const orders = activeOrders.filter(r => r.purchase?.vendor === v)
                return <div className="supplier-row" key={v}><div className="supplier-avatar">{v.split(' ')[1].slice(0, 1)}</div><div className="supplier-name"><strong>{v}</strong><small>Fictional supplier · {orders.length} orders{orders.some(r => overdue(r)) ? ` · ${orders.filter(r => overdue(r)).length} overdue` : ''}</small></div><strong>{money(orders.reduce((sum, r) => sum + total(r), 0))}</strong></div>
              })}
            </div></section>
            <section className="panel" data-tour="activity"><div className="panel-heading"><div><h2>Recent activity</h2><p>Every handoff has a history.</p></div><span className="section-icon"><Clock3 size={18} /></span></div><div className="activity-list">{recent.map(e => <button className="activity-item" key={`${e.request.id}-${e.id}`} onClick={() => setDialog({ kind: 'detail', id: e.request.id })}><span className="activity-icon"><ArrowDownLeft size={17} /></span><span><strong>{e.message}</strong><small>{e.request.id} · {people[e.actor].short} · {dateLabel(e.at)}</small></span><ChevronRight size={15} /></button>)}</div></section>
          </div>}
          <footer className="workspace-footer"><span><Sprout size={15} />Built for clear handoffs and smoother seasons.</span><p>Business context inspired by PhycoTerra's public website. All purchasing records, suppliers, prices, and material examples are fictional. Do not enter real confidential data.</p><button className="text-button mobile-reset" onClick={() => { setResetError(''); setDialog({ kind: 'reset' }) }}><RotateCcw size={14} />Reset demo</button></footer>
        </>}
      </main>
    </div>
    {dialog?.kind === 'detail' && selected && <Modal title="Request details" onClose={() => setDialog(null)} wide><RequestDetail key={`${selected.id}-${persona}`} request={selected} persona={persona} onAction={(action, token) => act(selected.id, action, token)} onEdit={() => openForm(selected)} /></Modal>}
    {dialog?.kind === 'form' && <Modal title={dialog.existingId ? 'Edit request' : 'New purchase request'} onClose={() => setDialog(null)} wide><RequestForm key={dialog.token} existing={data?.requests.find(r => r.id === dialog.existingId)} onSave={saveDraft} onCancel={() => setDialog(null)} /></Modal>}
    {dialog?.kind === 'notifications' && <Modal title="Your demo notifications" onClose={() => setDialog(null)}><p className="muted">Simulated in-app updates for {people[persona].name}. No email, text, or Teams messages are sent.</p><div className="notification-list">{notifications.length ? notifications.map((e, i) => <button className="notification-item" data-tour={i === 0 ? 'notifications' : undefined} key={`${e.request.id}-${e.id}`} onClick={() => setDialog({ kind: 'detail', id: e.request.id })}><Bell size={17} /><span><strong>{e.message}</strong><small>{e.request.id} · {dateLabel(e.at)}</small></span><ChevronRight size={16} /></button>) : <EmptyState title="No updates yet" text="Your workflow updates will appear here." />}</div></Modal>}
    {dialog?.kind === 'reset' && <Modal title="Reset demo data?" onClose={() => setDialog(null)}><div className="stack" data-tour="reset-info"><p>This replaces this app's local requests and history with the 15 original fictional scenarios. Your demo edits will be lost. Other browser data is not affected.</p>{resetError && <ErrorNotice message={resetError} />}<div className="form-actions"><button className="button secondary" onClick={() => setDialog(null)}>Keep my changes</button><button className="button danger-button" onClick={reset}>Reset demo data</button></div></div></Modal>}
    {tour && tourStep && <GuidedTour key={tourStep.id} step={tourStep} index={tour.index} onMove={moveTour} onExit={exitTour} />}
  </div>
}
