import { Check, Minus, X } from 'lucide-react'
import { dateLabel, people } from '../domain/workflow'
import type { JourneyStep } from '../domain/workflow'

const stateLabel: Record<JourneyStep['state'], string> = {
  done: 'Done', current: 'Current stage', upcoming: 'Not started', skipped: 'Skipped', rejected: 'Rejected',
}

function Marker({ step }: { step: JourneyStep }) {
  return <span className={`journey-marker ${step.state}`} aria-hidden="true">
    {step.state === 'done' ? <Check size={13} strokeWidth={3} /> : step.state === 'rejected' ? <X size={13} strokeWidth={3} /> : step.state === 'skipped' ? <Minus size={13} strokeWidth={3} /> : null}
  </span>
}

/** The whole request lifecycle: each stage, who owns it, and where the request is now. */
export function Journey({ steps, compact = false, showDates = true }: { steps: JourneyStep[]; compact?: boolean; showDates?: boolean }) {
  if (compact) {
    const current = steps.filter(s => s.state === 'current').map(s => s.label).join(' & ')
    return <ol className="journey-compact" aria-label={current ? `Current stage: ${current}` : 'Request journey'}>
      {steps.map(s => <li key={s.key} className={s.state} title={`${s.label} · ${people[s.owner].name} · ${stateLabel[s.state]}`} />)}
    </ol>
  }
  return <ol className="journey" aria-label="Request journey">
    {steps.map(s => <li key={s.key} className={s.state} aria-current={s.state === 'current' ? 'step' : undefined}>
      <Marker step={s} />
      <div className="journey-text">
        <strong>{s.label}</strong>
        <span className="journey-owner">{people[s.owner].name}</span>
        <small>{people[s.owner].team}</small>
        <small className="journey-state">{s.state === 'current' ? ['Now', s.note].filter(Boolean).join(' · ') : s.note ?? stateLabel[s.state]}{showDates && s.at && s.state !== 'upcoming' ? ` · ${dateLabel(s.at)}` : ''}</small>
      </div>
    </li>)}
  </ol>
}
