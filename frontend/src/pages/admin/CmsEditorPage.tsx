import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatusBadge from '../../components/admin/StatusBadge'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import PermissionGuard from '../../components/admin/PermissionGuard'
import { ErrorState, LoadingSkeleton } from '../../components/admin/states'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { useToast } from '../../components/ui/Toast'
import { useAdmin } from '../../lib/admin'
import { useAsync } from '../../lib/adminHooks'
import { relativeTime } from '../../lib/format'
import { adminApi, CMS_TYPES, type AdminCmsDetail } from '../../services/adminApi'

const EMPTY = { type: 'blog', slug: '', title: '', summary: '', body: '' }

/** Content is plain text (blank line = new paragraph). The preview renders it as text nodes only,
 *  and the API rejects markup, so there is nothing here that can run script. */
function Preview({ title, summary, body }: { title: string; summary: string; body: string }) {
  return (
    <article className="cms-preview">
      <h2>{title || 'Untitled'}</h2>
      {summary && <p className="muted">{summary}</p>}
      {body
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </article>
  )
}

export default function CmsEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAdmin()
  const canEdit = can('cms.manage')

  const [form, setForm] = useState(EMPTY)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restore, setRestore] = useState<number | null>(null)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)

  const item = useAsync<AdminCmsDetail | null>(() => (id ? adminApi.cmsItem(id) : Promise.resolve(null)), [id])
  const d = item.data

  useEffect(() => {
    if (d) setForm({ type: d.type, slug: d.slug, title: d.title, summary: d.summary, body: d.body })
  }, [d])

  if (!isNew && item.error && !d) return <ErrorState message={item.error} onRetry={item.reload} />
  if (!isNew && !d) return <LoadingSkeleton lines={8} height={18} />

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const dirty = d ? form.title !== d.title || form.summary !== d.summary || form.body !== d.body || form.slug !== d.slug : true

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (isNew) {
        const created = await adminApi.createCms(form)
        toast('ok', 'Draft created.')
        navigate(`/admin/cms/${created.id}`, { replace: true })
      } else {
        await adminApi.updateCms(id!, form)
        toast('ok', 'Saved as a new version.')
        item.reload()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    setBusy(true)
    try {
      await adminApi.publishCms(id!)
      toast('ok', 'Published.')
      item.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="apage">
      <section className="acard">
        <div className="uhead">
          <div>
            <h2>{isNew ? 'New content' : d!.title}</h2>
            {d && (
              <div className="uhead__meta">
                <StatusBadge status={d.status} label={d.status === 'published' ? 'Published' : 'Draft'} />
                <span>v{d.version}</span>
                <span>Author {d.author}</span>
                <span>Updated {relativeTime(d.updatedAt)} by {d.updatedBy}</span>
              </div>
            )}
          </div>
          <PermissionGuard permission="cms.manage">
            <div className="rowactions">
              <Button onClick={save} loading={busy} disabled={!dirty || !form.title.trim()}>
                {isNew ? 'Create draft' : 'Save'}
              </Button>
              {d && d.status === 'draft' && (
                <Button variant="secondary" onClick={publish} disabled={busy || dirty}>
                  Publish
                </Button>
              )}
              {d && d.status === 'published' && (
                <Button variant="secondary" onClick={() => setConfirmUnpublish(true)} disabled={busy}>
                  Unpublish
                </Button>
              )}
            </div>
          </PermissionGuard>
        </div>
        {d && dirty && canEdit && <p className="muted" style={{ marginTop: 8 }}>Save your changes before publishing.</p>}
        {error && (
          <p className="field__error" role="alert" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
      </section>

      <div className="atabs" role="tablist" aria-label="Editor">
        {(['edit', 'preview'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {t === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      {tab === 'preview' ? (
        <section className="acard">
          <Preview title={form.title} summary={form.summary} body={form.body} />
        </section>
      ) : (
        <section className="acard cms-form">
          <Field label="Type">
            {(fid) => (
              <Select id={fid} value={form.type} onChange={set('type')} disabled={!isNew || !canEdit}>
                {CMS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Title">
            {(fid) => <Input id={fid} value={form.title} maxLength={200} onChange={set('title')} disabled={!canEdit} />}
          </Field>
          <Field label="Slug" hint="Lowercase letters, numbers and dashes. Generated from the title if left empty.">
            {(fid) => <Input id={fid} value={form.slug} maxLength={120} onChange={set('slug')} disabled={!canEdit} />}
          </Field>
          <Field label="Summary">
            {(fid) => <Textarea id={fid} rows={2} value={form.summary} maxLength={500} onChange={set('summary')} disabled={!canEdit} />}
          </Field>
          <Field label="Body" hint="Plain text. Leave a blank line between paragraphs. HTML and scripts are rejected.">
            {(fid) => <Textarea id={fid} rows={14} value={form.body} maxLength={20000} onChange={set('body')} disabled={!canEdit} />}
          </Field>
        </section>
      )}

      {d && (
        <section className="acard">
          <h3>Version history</h3>
          <ul className="alist">
            {d.versions.map((v) => (
              <li key={v.version}>
                <div>
                  <strong>
                    v{v.version}
                    {v.version === d.version ? ' (current)' : ''} · {v.title}
                  </strong>
                  <span>
                    {v.editedBy} · {relativeTime(v.at)}
                  </span>
                </div>
                <PermissionGuard permission="cms.manage">
                  {v.version !== d.version && (
                    <Button variant="secondary" size="sm" onClick={() => setRestore(v.version)}>
                      Restore
                    </Button>
                  )}
                </PermissionGuard>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={restore !== null}
        title={`Restore version ${restore}?`}
        description="The old content is copied into a new version. Nothing is lost, and the current version stays in the history."
        confirmLabel="Restore"
        onClose={() => setRestore(null)}
        onConfirm={async () => {
          await adminApi.restoreCms(id!, restore!)
          toast('ok', 'Version restored.')
          item.reload()
        }}
      />
      <ConfirmDialog
        open={confirmUnpublish}
        title="Unpublish this content?"
        description="It is removed from the public site and goes back to draft. This is recorded in the audit log."
        confirmLabel="Unpublish"
        danger
        onClose={() => setConfirmUnpublish(false)}
        onConfirm={async () => {
          await adminApi.unpublishCms(id!)
          toast('ok', 'Unpublished.')
          item.reload()
        }}
      />
    </div>
  )
}
