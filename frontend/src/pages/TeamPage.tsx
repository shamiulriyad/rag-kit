import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, Shield, Crown, User, MailWarning } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { useLocalStorage } from '../lib/hooks'
import { usePlan } from '../lib/plan'
import { mockTeam, type TeamMember } from '../lib/appData'
import { initials, relativeTime } from '../lib/format'

const ROLE_ICON = { Owner: Crown, Admin: Shield, Member: User } as const

export default function TeamPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { plan } = usePlan()
  const [members, setMembers] = useLocalStorage<TeamMember[]>(
    'rag-starter.team-members',
    mockTeam.members,
  )
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'Admin' | 'Member'>('Member')

  const active = members.filter((m) => m.status === 'active')
  const pending = members.filter((m) => m.status === 'pending')

  function invite(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      toast('err', 'Enter a valid email address.')
      return
    }
    setMembers((list) => [
      ...list,
      {
        id: `m_${Date.now()}`,
        name: email.split('@')[0].replace(/[._-]+/g, ' '),
        email,
        role,
        status: 'pending',
        joinedAt: new Date().toISOString(),
      },
    ])
    toast('ok', `Invitation queued for ${email} (demo — no email sent).`)
    setEmail('')
  }

  function remove(id: string) {
    setMembers((list) => list.filter((m) => m.id !== id))
    toast('ok', 'Member removed from the team.')
  }

  function changeRole(id: string, next: TeamMember['role']) {
    setMembers((list) => list.map((m) => (m.id === id ? { ...m, role: next } : m)))
  }

  return (
    <div className="page">
      {plan !== 'team' && (
        <div className="secret-note">
          <MailWarning />
          <span>
            Team management is a <strong>Team plan</strong> feature. You're
            previewing it with sample members —{' '}
            <button className="linklike" onClick={() => navigate('/pricing')}>
              switch to Team
            </button>{' '}
            to manage a real workspace once billing is live.
          </span>
        </div>
      )}

      <section className="card">
        <div className="panel-head">
          <h3>{mockTeam.name}</h3>
          <span className="badge">
            {active.length} active · {pending.length} pending
          </span>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {active.map((m) => {
                const RoleIcon = ROLE_ICON[m.role]
                return (
                  <tr key={m.id}>
                    <td>
                      <span className="doc-name">
                        <span className="avatar" style={{ width: 30, height: 30 }}>
                          {initials(m.name)}
                        </span>
                        <span>
                          <span style={{ display: 'block', color: 'var(--text)' }}>
                            {m.name}
                          </span>
                          <span className="list__meta">{m.email}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      {m.role === 'Owner' ? (
                        <span className="pill">
                          <RoleIcon size={13} /> Owner
                        </span>
                      ) : (
                        <Select
                          value={m.role}
                          onChange={(e) =>
                            changeRole(m.id, e.target.value as TeamMember['role'])
                          }
                          style={{ width: 130 }}
                        >
                          <option>Admin</option>
                          <option>Member</option>
                        </Select>
                      )}
                    </td>
                    <td>{relativeTime(m.joinedAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {m.role !== 'Owner' && (
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => remove(m.id)}
                          aria-label={`Remove ${m.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="panel-head">
            <h3>Invite a member</h3>
          </div>
          <form onSubmit={invite} className="stack" style={{ gap: 'var(--sp-4)' }}>
            <Field label="Email address">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label="Role">
              {(id) => (
                <Select
                  id={id}
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'Admin' | 'Member')}
                >
                  <option>Member</option>
                  <option>Admin</option>
                </Select>
              )}
            </Field>
            <Button type="submit">
              <UserPlus size={15} />
              Send invitation
            </Button>
            <span className="field__hint">
              Email delivery is <strong>Coming Soon</strong> — invitations are
              tracked locally for now.
            </span>
          </form>
        </section>

        <section className="card">
          <div className="panel-head">
            <h3>Pending invitations</h3>
          </div>
          {pending.length === 0 ? (
            <p className="muted" style={{ fontSize: '0.86rem' }}>
              No invitations awaiting acceptance.
            </p>
          ) : (
            <div className="list">
              {pending.map((m) => (
                <div className="list__row" key={m.id}>
                  <span className="list__icon">
                    <MailWarning />
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ color: 'var(--text)' }}>
                      {m.email}
                    </div>
                    <div className="list__meta">
                      {m.role} · invited {relativeTime(m.joinedAt)}
                    </div>
                  </div>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => remove(m.id)}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
