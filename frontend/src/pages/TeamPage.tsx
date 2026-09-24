import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Trash2, Shield, Crown, User, MailWarning } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { useToast } from '../components/ui/Toast'
import { usePlan } from '../lib/plan'
import {
  ApiError,
  createWorkspace,
  inviteWorkspaceMember,
  listWorkspaceMembers,
  listWorkspaces,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  type WorkspaceMember as TeamMember,
  type WorkspaceSummary,
} from '../services/api'
import { initials, relativeTime } from '../lib/format'

const ROLE_ICON = { Owner: Crown, Admin: Shield, Member: User } as const

export default function TeamPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { plan } = usePlan()
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'Admin' | 'Member'>('Member')
  const [wsName, setWsName] = useState('')

  const fail = (err: unknown, fallback: string) =>
    toast('err', err instanceof ApiError ? err.message : fallback)

  useEffect(() => {
    let cancelled = false
    listWorkspaces()
      .then(async (list) => {
        if (cancelled) return
        const ws = list[0] ?? null
        setWorkspace(ws)
        if (ws) setMembers(await listWorkspaceMembers(ws.id))
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const active = members.filter((m) => m.status === 'active')
  const pending = members.filter((m) => m.status === 'pending')

  async function create(e: FormEvent) {
    e.preventDefault()
    try {
      const ws = await createWorkspace(wsName.trim())
      setWorkspace(ws)
      setMembers(await listWorkspaceMembers(ws.id))
      toast('ok', 'Team workspace created.')
    } catch (err) {
      fail(err, 'Could not create the workspace.')
    }
  }

  async function invite(e: FormEvent) {
    e.preventDefault()
    if (!workspace) return
    if (!email.includes('@')) {
      toast('err', 'Enter a valid email address.')
      return
    }
    try {
      const m = await inviteWorkspaceMember(workspace.id, email.trim(), role)
      setMembers((list) => [...list, m])
      toast('ok', m.status === 'active' ? `${m.email} was added to the team.` : `Invitation saved for ${m.email}.`)
      setEmail('')
    } catch (err) {
      fail(err, 'Could not send the invitation.')
    }
  }

  async function remove(id: string) {
    if (!workspace) return
    try {
      await removeWorkspaceMember(workspace.id, id)
      setMembers((list) => list.filter((m) => m.id !== id))
      toast('ok', 'Member removed from the team.')
    } catch (err) {
      fail(err, 'Could not remove this member.')
    }
  }

  async function changeRole(id: string, next: TeamMember['role']) {
    if (!workspace) return
    try {
      const updated = await updateWorkspaceMemberRole(workspace.id, id, next)
      setMembers((list) => list.map((m) => (m.id === id ? updated : m)))
    } catch (err) {
      fail(err, 'Could not change the role.')
    }
  }

  return (
    <div className="page">
      {plan !== 'team' && (
        <div className="secret-note">
          <MailWarning />
          <span>
            Team workspaces are a <strong>Team plan</strong> feature.{' '}
            <button className="linklike" onClick={() => navigate('/pricing')}>
              See plans
            </button>
          </span>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading team…</p>
      ) : !workspace ? (
        <section className="card">
          <div className="panel-head">
            <h3>Create your team workspace</h3>
          </div>
          <form onSubmit={create} className="stack" style={{ gap: 'var(--sp-4)' }}>
            <Field label="Workspace name">
              {(id) => (
                <Input id={id} placeholder="Acme Team" value={wsName} onChange={(e) => setWsName(e.target.value)} />
              )}
            </Field>
            <Button type="submit" disabled={wsName.trim().length < 2}>
              Create workspace
            </Button>
          </form>
        </section>
      ) : (
        <>
      <section className="card">
        <div className="panel-head">
          <h3>{workspace.name}</h3>
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
                    <td>{relativeTime(m.createdAt)}</td>
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
              Email delivery is <strong>Coming Soon</strong>. If the person already has an
              account they are added right away; otherwise the invitation stays pending.
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
                      {m.role} · invited {relativeTime(m.createdAt)}
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
        </>
      )}
    </div>
  )
}
