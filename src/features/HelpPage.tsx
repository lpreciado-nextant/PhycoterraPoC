import { CircleHelp, Route } from 'lucide-react'
import { initials, people, teams } from '../domain/workflow'
import type { JourneyStep, Person } from '../domain/workflow'
import { Journey } from '../components/Journey'

/** The lifecycle every request follows, with the team that owns each stage. */
const lifecycle: JourneyStep[] = [
  { key: 'request', label: 'Request', owner: 'field', state: 'upcoming', note: 'Create, then submit' },
  { key: 'approval', label: 'Approval', owner: 'manager', state: 'upcoming', note: 'Only at $1,000+' },
  { key: 'purchase', label: 'Purchase', owner: 'janet', state: 'upcoming', note: 'Record PO or card ref' },
  { key: 'receive', label: 'Receive', owner: 'janet', state: 'upcoming', note: 'Partial deliveries OK' },
  { key: 'inspect', label: 'Inspect', owner: 'janet', state: 'upcoming', note: 'Raw materials only' },
  { key: 'complete', label: 'Complete', owner: 'field', state: 'upcoming', note: 'Moves to History' },
]

export function HelpPage({ persona }: { persona: Person }) {
  return <div data-tour="help">
    <section className="help-grid" aria-label="Teams and roles">
      {teams.map(t => <article key={t.team} className={`panel team-card ${t.person === persona ? 'current' : ''}`}>
        <header><div className="avatar">{initials(t.person)}</div><div><h2>{t.team}</h2><small>{people[t.person].name} · {t.summary}</small></div></header>
        <ul>{t.does.map(d => <li key={d}>{d}</li>)}</ul>
        <p className="team-sees"><strong>Sees:</strong> {t.sees}</p>
        {t.person === persona && <small>You are viewing as this team.</small>}
      </article>)}
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h2><Route size={18} />Request lifecycle</h2><p>Every request moves left to right. Each stage has one owning team.</p></div></div>
      <div className="help-section"><div className="journey-guide"><Journey steps={lifecycle} showDates={false} /></div></div>
      <div className="panel-heading"><div><h2><CircleHelp size={18} />Good to know</h2></div></div>
      <div className="help-section"><ul className="help-rules">
        <li><strong>Drafts are private.</strong> Only the person who created a draft can see it. Others see the request once it is submitted.</li>
        <li><strong>Approval threshold.</strong> Requests of $1,000 or more go to Management. Smaller requests go straight to Purchasing. The threshold is illustrative.</li>
        <li><strong>Raw materials are inspected.</strong> They stay on hold after delivery until the Purchasing team records a manual inspection.</li>
        <li><strong>Finished requests move to History.</strong> Completed and rejected requests leave the work queues and are kept in the History tab.</li>
        <li><strong>Switch teams</strong> with <em>Viewing as</em> in the top bar. This is a demo control, not a sign-in.</li>
      </ul></div>
    </section>
  </div>
}
