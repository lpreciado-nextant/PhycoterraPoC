import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowRight, Bell, Check, ChevronRight, CircleHelp, ClipboardList, Clock3, Compass, History, LayoutDashboard, PackageCheck, Plus, Search, ShieldCheck, ShoppingCart, SlidersHorizontal, Truck, X } from 'lucide-react'
import { Badge, EmptyState, ErrorNotice, Modal } from './components/ui'
import { errorMessage, loadData, resetData, saveData } from './data/storage'
import { activity, awaitingAction, categories, closedAt, dateLabel, hasHold, initials, journey, managerOf, money, newDraft, nextStep, overdue, people, personSchema, requesters, status, statuses, total, transition, vendors, visibleTo } from './domain/workflow'
import type { Action, Dataset, Draft, Person, Request, Status } from './domain/workflow'
import { RequestForm } from './features/RequestForm'
import { RequestDetail } from './features/RequestDetail'
import { HelpPage } from './features/HelpPage'
import { GuidedTour } from './components/GuidedTour'
import { Journey } from './components/Journey'
import { seedCount, seedData } from './data/seed'
import { tourDialog, tourSteps } from './features/tour'
import type { WorkspaceView } from './features/tour'

type View = WorkspaceView
type Filter = 'All' | Status | 'Overdue' | 'On hold'
const navigation = [
  { title: 'Overview', icon: LayoutDashboard },
  { title: 'Open Requests', icon: ClipboardList },
  { title: 'Approvals', icon: ShieldCheck },
  { title: 'Purchasing', icon: ShoppingCart },
  { title: 'Receiving', icon: PackageCheck },
  { title: 'History', icon: History },
  { title: 'Help', icon: CircleHelp },
] as const
const closedStatuses: Status[] = ['Completed', 'Rejected']
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
    }), 'Request updated.')
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
    }, submit ? 'Request submitted.' : 'Draft saved.')
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
      setToast(`Demo reset. ${seedCount} sample requests restored.`)
      navigate('Overview')
    } catch (error) { setResetError(`Reset failed. ${errorMessage(error)} Check browser storage permissions and try again.`) }
  }
  function navigate(target: View, statusFilter: Filter = 'All') {
    setView(target); setFilter(statusFilter); setSearch(''); setVendor('All'); setCategory('All'); setRequester('All')
  }
  const role = people[persona].role
  const scoped = (data?.requests ?? []).filter(r => visibleTo(r, persona))
  const visibleRequesters = requesters.filter(p => role === 'purchasing' || managerOf(p) === persona)
  const counts = {
    approval: scoped.filter(r => status(r) === 'Pending approval').length,
    purchasing: scoped.filter(r => status(r) === 'Ready to purchase').length,
    overdue: scoped.filter(r => overdue(r)).length,
    holds: scoped.filter(hasHold).length,
    receiving: scoped.filter(r => r.purchase && status(r) !== 'Completed').length,
  }
  const pageItems = scoped.filter(r => {
    const s = status(r)
    if (view === 'Overview' && !awaitingAction(r, persona)) return false
    if (view === 'Open Requests' && activity(r) !== 'Open') return false
    if (view === 'Approvals' && s !== 'Pending approval') return false
    if (view === 'Purchasing' && s !== 'Ready to purchase') return false
    if (view === 'Receiving' && (!r.purchase || s === 'Completed')) return false
    if (view === 'History' && activity(r) !== 'Closed') return false
    if (filter === 'Overdue' ? !overdue(r) : filter === 'On hold' ? !hasHold(r) : filter !== 'All' && s !== filter) return false
    if (category !== 'All' && !r.lines.some(l => l.category === category)) return false
    if (vendor !== 'All' && (r.purchase?.vendor ?? r.vendor) !== vendor) return false
    if (requester !== 'All' && r.requester !== requester) return false
    const query = search.toLowerCase().trim()
    return !query || [r.id, r.title, r.vendor, ...r.lines.map(l => l.description)].some(v => v.toLowerCase().includes(query))
  }).sort((a, b) => view === 'History'
    ? (closedAt(b) ?? '').localeCompare(closedAt(a) ?? '')
    : rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt))
  const shownItems = pageItems
  const showFilters = view !== 'Overview'
  const statusOptions = view === 'History' ? closedStatuses : statuses.filter(s => !closedStatuses.includes(s))
  const notifications = scoped.flatMap(r => r.events.filter(e => e.audience.includes(persona)).map(e => ({ ...e, request: r }))).sort((a, b) => b.at.localeCompare(a.at))
  const recent = scoped.flatMap(r => r.events.map(e => ({ ...e, request: r }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4)
  const selected = dialog?.kind === 'detail' ? data?.requests.find(r => r.id === dialog.id && visibleTo(r, persona)) : undefined
  const activeOrders = scoped.filter(r => r.purchase)
  const greeting = clock.getHours() < 12 ? 'Good morning' : clock.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const cardMetrics = [
    { title: 'Awaiting approval', number: counts.approval, icon: ShieldCheck, tone: 'amber', target: 'Approvals' as View, filter: 'All' as Filter },
    { title: 'Ready to purchase', number: counts.purchasing, icon: ShoppingCart, tone: 'green', target: 'Purchasing' as View, filter: 'All' as Filter },
    { title: 'Overdue deliveries', number: counts.overdue, icon: Truck, tone: 'red', target: 'Receiving' as View, filter: 'Overdue' as Filter },
    { title: 'Inspection holds', number: counts.holds, icon: ClipboardList, tone: 'brown', target: 'Receiving' as View, filter: 'On hold' as Filter },
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
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14} /><strong>{view}</strong></div><div className="topbar-actions"><button ref={tourStartRef} data-tour="tour-start" className="button secondary small tour-launch" disabled={!!loadError || !!tour || !!workspaceDialog} onClick={startTour}><Compass size={16} />Guided walkthrough</button><button className="notification-button" aria-label={`Notifications (${notifications.length})`} onClick={() => setDialog({ kind: 'notifications' })}><Bell size={20} />{notifications.length > 0 && <span className="notification-dot" />}</button><div className="persona" data-tour="personas"><div className="avatar">{initials(persona)}</div><label><span>VIEWING AS</span><select aria-label="Viewing as" value={persona} onChange={e => { const p = personSchema.parse(e.target.value); setPersona(p); setDialog(null); navigate(people[p].role === 'requester' ? 'Open Requests' : 'Overview') }}>{personSchema.options.map(id => <option value={id} key={id}>{people[id].team} – {people[id].name}</option>)}</select></label></div></div></header>
      <main id="main">
        {toast && !tour && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
        {loadError ? <section className="panel recovery"><ErrorNotice message={loadError} /><p>Your existing browser data has not been overwritten. Check storage permissions, or explicitly reset the demo to recover.</p><button className="button primary" onClick={() => setDialog({ kind: 'reset' })}>Reset demo data</button></section> : <>
          <div className="page-heading" data-tour="welcome"><div>{view === 'Overview' && <div className="eyebrow">{dateLabel(clock.toISOString())}</div>}<h1>{view === 'Overview' ? `${greeting}, ${people[persona].name.split(' ')[0]}.` : view === 'Help' ? 'Help & roles' : view}</h1>{view === 'Overview' && <p className="muted">Viewing as {people[persona].team}</p>}{view === 'History' && <p className="muted">Completed and rejected requests.</p>}</div>{people[persona].role === 'requester' && <button className="button primary" data-tour="new-request" onClick={() => openForm()}><Plus size={18} />New request</button>}</div>
          {view === 'Overview' && <>
            <section className="metrics" data-tour="metrics" aria-label="Workflow summary">{cardMetrics.map(({ title, number, icon: Icon, tone, target, filter: f }) => <button className={`metric ${tone}`} key={title} onClick={() => navigate(target, f)}><div className="metric-top"><span>{title}</span><span className="metric-icon"><Icon size={19} /></span></div><div className="metric-bottom"><strong>{String(number).padStart(2, '0')}</strong><ArrowRight size={16} /></div></button>)}</section>
            {(counts.overdue > 0 || counts.holds > 0) && <div className="attention-strip"><span className="attention-icon"><Clock3 size={18} /></span><div><strong>{counts.overdue} overdue {counts.overdue === 1 ? 'delivery' : 'deliveries'} · {counts.holds} inspection {counts.holds === 1 ? 'hold' : 'holds'}</strong></div><button onClick={() => navigate('Receiving')} className="text-button">Review receiving <ArrowRight size={15} /></button></div>}
          </>}
          {view === 'Help' ? <HelpPage persona={persona} /> : <section className="panel request-panel" data-tour={view === 'History' ? 'history' : undefined}>
            <div className="panel-heading"><div><h2>{view === 'Overview' ? 'Awaiting your action' : view === 'Open Requests' ? 'Open purchase requests' : view === 'History' ? 'Request history' : `${view} queue`} <span className="count-pill">{pageItems.length}</span></h2>{view === 'Overview' && <p>Requests where you own the next step.</p>}</div>{view === 'Overview' && <button className="text-button" onClick={() => navigate('Open Requests')}>Open Requests <ArrowRight size={16} /></button>}</div>
            {showFilters && <div className="filters" data-tour="filters">
              <label className="search-field"><Search size={17} /><input type="search" aria-label="Search requests" placeholder="Search request, item, or supplier..." value={search} onChange={e => setSearch(e.target.value)} /></label>
              <label className="filter-field"><SlidersHorizontal size={15} /><select aria-label="Filter by status" value={filter} onChange={e => { const value = e.target.value; if (value === 'All' || value === 'Overdue' || value === 'On hold' || statuses.some(s => s === value)) setFilter(value as Filter) }}><option value="All">All statuses</option>{statusOptions.map(s => <option key={s}>{s}</option>)}{view !== 'History' && <><option>Overdue</option><option>On hold</option></>}</select></label>
              <select aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)}><option value="All">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
              <select aria-label="Filter by supplier" value={vendor} onChange={e => setVendor(e.target.value)}><option value="All">All suppliers</option>{vendors.map(v => <option key={v}>{v}</option>)}</select>
              {role !== 'requester' && view !== 'History' && <select aria-label="Filter by requester" value={requester} onChange={e => setRequester(e.target.value)}><option value="All">All requesters</option>{visibleRequesters.map(p => <option key={p} value={p}>{people[p].name}</option>)}</select>}
            </div>}
            {!shownItems.length ? <EmptyState title="No requests" text={view === 'History' ? 'Completed and rejected requests will appear here.' : view === 'Overview' ? 'Nothing is waiting on you right now.' : 'This queue is empty or your filters exclude all requests.'} />
            : view === 'History' ? <div className="table-scroll"><table className="request-table"><thead><tr><th>Request / requester</th><th>Outcome</th><th>Journey</th><th>Supplier</th><th>Amount (USD)</th><th>Closed on</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
              {shownItems.map(r => <tr key={r.id} data-tour={`request-${r.id}`}>
                <td><span className="request-id">{r.id}</span><button className="request-title" onClick={() => setDialog({ kind: 'detail', id: r.id })}>{r.title}</button><small>{people[r.requester].name}</small></td>
                <td><Badge value={status(r)} />{r.approval?.decision === 'Rejected' && <small>{r.approval.reason}</small>}</td>
                <td><Journey steps={journey(r)} compact /></td>
                <td>{r.purchase?.vendor ?? r.vendor}</td>
                <td className="amount">{money(total(r))}</td>
                <td className="date-cell">{dateLabel(closedAt(r) ?? r.createdAt)}</td>
                <td><button className="icon-button" onClick={() => setDialog({ kind: 'detail', id: r.id })} aria-label={`Open ${r.id}`}><ChevronRight size={18} /></button></td>
              </tr>)}
            </tbody></table></div>
            : <div className="table-scroll"><table className="request-table"><thead><tr><th>Request / requester</th><th>Status / journey</th><th>Next step / owner</th><th>Amount (USD)</th><th>Expected arrival</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>
              {shownItems.map(r => <tr key={r.id} data-tour={`request-${r.id}`}>
                <td><span className="request-id">{r.id}</span><button className="request-title" onClick={() => setDialog({ kind: 'detail', id: r.id })}>{r.title}</button><small>{people[r.requester].name} <span>·</span> {age(r, clock)}</small></td>
                <td><div className="status-stack"><Badge value={status(r)} />{overdue(r) && <Badge value="Overdue" />}{hasHold(r) && status(r) !== 'Inspection hold' && <Badge value="On hold" />}</div><Journey steps={journey(r)} compact /></td>
                <td><span className="next-step-text">{nextStep(r).action}</span><small>{nextStep(r).owner}</small></td>
                <td className="amount">{money(total(r))}</td>
                <td className={overdue(r) ? 'danger-text date-cell' : 'date-cell'}>{r.purchase ? dateLabel(r.purchase.expected) : <span className="muted">Not ordered</span>}</td>
                <td><button className="icon-button" onClick={() => setDialog({ kind: 'detail', id: r.id })} aria-label={`Open ${r.id}`}><ChevronRight size={18} /></button></td>
              </tr>)}
            </tbody></table></div>}
          </section>}
          {view === 'Overview' && <div className="overview-bottom">
            <section className="panel" data-tour="suppliers"><div className="panel-heading"><div><h2>Supplier snapshot</h2><p>Recorded purchases, not invoices or payments.</p></div><span className="section-icon"><ShoppingCart size={18} /></span></div><div className="supplier-list">
              {vendors.map(v => {
                const orders = activeOrders.filter(r => r.purchase?.vendor === v)
                return <div className="supplier-row" key={v}><div className="supplier-avatar">{v.split(' ')[1].slice(0, 1)}</div><div className="supplier-name"><strong>{v}</strong><small>{orders.length} orders{orders.some(r => overdue(r)) ? ` · ${orders.filter(r => overdue(r)).length} overdue` : ''}</small></div><strong>{money(orders.reduce((sum, r) => sum + total(r), 0))}</strong></div>
              })}
            </div></section>
            <section className="panel" data-tour="activity"><div className="panel-heading"><div><h2>Recent activity</h2></div><span className="section-icon"><Clock3 size={18} /></span></div><div className="activity-list">{recent.map(e => <button className="activity-item" key={`${e.request.id}-${e.id}`} onClick={() => setDialog({ kind: 'detail', id: e.request.id })}><span className="activity-icon"><ArrowDownLeft size={17} /></span><span><strong>{e.message}</strong><small>{e.request.id} · {people[e.actor].name} · {dateLabel(e.at)}</small></span><ChevronRight size={15} /></button>)}</div></section>
          </div>}
        </>}
      </main>
    </div>
    {dialog?.kind === 'detail' && selected && <Modal title="Request details" onClose={() => setDialog(null)} wide><RequestDetail key={`${selected.id}-${persona}`} request={selected} persona={persona} onAction={(action, token) => act(selected.id, action, token)} onEdit={() => openForm(selected)} /></Modal>}
    {dialog?.kind === 'form' && <Modal title={dialog.existingId ? 'Edit request' : 'New purchase request'} onClose={() => setDialog(null)} wide><RequestForm key={dialog.token} existing={data?.requests.find(r => r.id === dialog.existingId)} onSave={saveDraft} onCancel={() => setDialog(null)} /></Modal>}
    {dialog?.kind === 'notifications' && <Modal title="Notifications" onClose={() => setDialog(null)}><p className="muted">In-app demo updates only. No external messages.</p><div className="notification-list">{notifications.length ? notifications.map((e, i) => <button className="notification-item" data-tour={i === 0 ? 'notifications' : undefined} key={`${e.request.id}-${e.id}`} onClick={() => setDialog({ kind: 'detail', id: e.request.id })}><Bell size={17} /><span><strong>{e.message}</strong><small>{e.request.id} · {dateLabel(e.at)}</small></span><ChevronRight size={16} /></button>) : <EmptyState title="No updates yet" text="Your workflow updates will appear here." />}</div></Modal>}
    {dialog?.kind === 'reset' && <Modal title="Reset demo data?" onClose={() => setDialog(null)}><div className="stack" data-tour="reset-info"><p>Restore the {seedCount} sample requests? Your demo edits and history will be lost. Other browser data is unaffected.</p>{resetError && <ErrorNotice message={resetError} />}<div className="form-actions"><button className="button secondary" onClick={() => setDialog(null)}>Keep my changes</button><button className="button danger-button" onClick={reset}>Reset demo data</button></div></div></Modal>}
    {tour && tourStep && <GuidedTour key={tourStep.id} step={tourStep} index={tour.index} onMove={moveTour} onExit={exitTour} />}
  </div>
}
