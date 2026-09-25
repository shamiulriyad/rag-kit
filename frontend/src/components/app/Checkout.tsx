import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CreditCard, Smartphone, ShieldCheck, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { PLANS, type PlanId } from '../../lib/plan'

/* Checkout for plan upgrades. There is no payment provider connected yet, so this
   is a simulated checkout: it validates the form like a real one, but nothing is
   charged and card / wallet details never leave the browser or get stored. Every
   "upgrade" button opens it via useCheckout().open(plan, onPaid) and runs onPaid
   (the plan activation) only after the payment step succeeds. */

type Method = 'card' | 'bkash' | 'nagad' | 'rocket'

const WALLETS: Record<Exclude<Method, 'card'>, { label: string; color: string }> = {
  bkash: { label: 'bKash', color: '#e2136e' },
  nagad: { label: 'Nagad', color: '#f6921e' },
  rocket: { label: 'Rocket', color: '#8c3494' },
}

// Approximate display rate only - there is no live FX feed. Adjust as needed.
const USD_TO_BDT = 122

const bdt = (usd: number) => Math.round(usd * USD_TO_BDT)

type OnPaid = () => Promise<void> | void

interface CheckoutApi {
  open: (plan: PlanId, onPaid: OnPaid) => void
}

const CheckoutContext = createContext<CheckoutApi | null>(null)

export function useCheckout(): CheckoutApi {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error('useCheckout must be used inside <CheckoutProvider>')
  return ctx
}

function luhnOk(digits: string): boolean {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

function validateCard(f: { name: string; number: string; expiry: string; cvc: string }) {
  const errors: Partial<Record<'name' | 'number' | 'expiry' | 'cvc', string>> = {}
  const digits = f.number.replace(/\s/g, '')
  if (f.name.trim().length < 2) errors.name = 'Enter the name on the card.'
  if (!/^\d{13,19}$/.test(digits) || !luhnOk(digits)) errors.number = 'Enter a valid card number.'
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(f.expiry)
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) {
    errors.expiry = 'Use MM/YY.'
  } else {
    const now = new Date()
    const exp = new Date(2000 + Number(m[2]), Number(m[1]), 1) // first day after expiry month
    if (exp <= now) errors.expiry = 'This card has expired.'
  }
  if (!/^\d{3,4}$/.test(f.cvc)) errors.cvc = '3 or 4 digits.'
  return errors
}

function CheckoutModal({
  plan,
  onClose,
  onPaid,
}: {
  plan: PlanId
  onClose: () => void
  onPaid: OnPaid
}) {
  const p = PLANS[plan]
  const [method, setMethod] = useState<Method>('card')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [wallet, setWallet] = useState('')
  const [txn, setTxn] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function pay() {
    setFailure('')
    let found: Record<string, string> = {}
    if (method === 'card') {
      found = validateCard({ name, number, expiry, cvc })
    } else {
      if (!/^01[3-9]\d{8}$/.test(wallet.replace(/[\s-]/g, ''))) {
        found.wallet = 'Enter a valid mobile number, e.g. 01712345678.'
      }
      if (!/^[A-Za-z0-9]{8,12}$/.test(txn.trim())) {
        found.txn = 'Enter the transaction ID (8-12 letters/digits).'
      }
    }
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      await new Promise((r) => setTimeout(r, 1200)) // simulated gateway round-trip
      await onPaid()
      onClose()
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Payment could not be completed.')
      setBusy(false)
    }
  }

  const walletInfo = method === 'card' ? null : WALLETS[method]
  const amountBdt = bdt(p.priceMonthly)

  return (
    <div className="modal-scrim" onClick={() => !busy && onClose()}>
      <div
        className="modal modal--checkout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn--ghost btn--sm modal__close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h3 id="checkout-title">Upgrade to {p.name}</h3>
        <div className="checkout__total">
          <span>{p.name} plan · billed monthly</span>
          <strong>
            {method === 'card' ? `$${p.priceMonthly}.00` : `৳${amountBdt.toLocaleString('en-US')}`}
          </strong>
        </div>

        <div className="checkout__methods" role="tablist" aria-label="Payment method">
          <button
            type="button"
            role="tab"
            aria-selected={method === 'card'}
            className={method === 'card' ? 'is-active' : ''}
            onClick={() => setMethod('card')}
          >
            <CreditCard size={16} /> Card
          </button>
          {(Object.keys(WALLETS) as (keyof typeof WALLETS)[]).map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={method === w}
              className={method === w ? 'is-active' : ''}
              onClick={() => setMethod(w)}
            >
              <Smartphone size={16} /> {WALLETS[w].label}
            </button>
          ))}
        </div>

        {method === 'card' ? (
          <div className="checkout__form">
            <Field label="Name on card" error={errors.name}>
              {(id) => (
                <Input
                  id={id}
                  autoComplete="cc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
            <Field label="Card number" error={errors.number}>
              {(id) => (
                <Input
                  id={id}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  maxLength={23}
                  value={number}
                  onChange={(e) =>
                    setNumber(
                      e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 19)
                        .replace(/(.{4})/g, '$1 ')
                        .trim(),
                    )
                  }
                />
              )}
            </Field>
            <div className="checkout__row">
              <Field label="Expiry" error={errors.expiry}>
                {(id) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={expiry}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                    }}
                  />
                )}
              </Field>
              <Field label="CVC" error={errors.cvc}>
                {(id) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                )}
              </Field>
            </div>
          </div>
        ) : (
          <div className="checkout__form">
            <p className="checkout__steps" style={{ borderColor: walletInfo!.color }}>
              Send <b>৳{amountBdt.toLocaleString('en-US')}</b> (${p.priceMonthly} at ৳
              {USD_TO_BDT}/USD, approximate) via <b>{walletInfo!.label}</b> Payment, then enter
              your number and the transaction ID from the confirmation SMS.
            </p>
            <Field label={`${walletInfo!.label} number`} error={errors.wallet}>
              {(id) => (
                <Input
                  id={id}
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  maxLength={14}
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                />
              )}
            </Field>
            <Field label="Transaction ID" error={errors.txn}>
              {(id) => (
                <Input
                  id={id}
                  placeholder="e.g. 9BK4X2LMQ7"
                  maxLength={12}
                  value={txn}
                  onChange={(e) => setTxn(e.target.value.toUpperCase())}
                />
              )}
            </Field>
          </div>
        )}

        {failure && <div className="field__error">{failure}</div>}

        <p className="checkout__note">
          <ShieldCheck size={14} />
          Demo checkout: no payment gateway is connected, nothing is charged, and payment
          details are not sent or stored.
        </p>

        <div className="modal__actions">
          <Button block onClick={pay} disabled={busy}>
            {busy
              ? 'Processing…'
              : method === 'card'
                ? `Pay $${p.priceMonthly}.00`
                : `Pay ৳${amountBdt.toLocaleString('en-US')} with ${walletInfo!.label}`}
          </Button>
          <Button variant="ghost" block onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ plan: PlanId; onPaid: OnPaid } | null>(null)

  const open = useCallback((plan: PlanId, onPaid: OnPaid) => {
    setState({ plan, onPaid })
  }, [])
  const close = useCallback(() => setState(null), [])
  const api = useMemo(() => ({ open }), [open])

  return (
    <CheckoutContext.Provider value={api}>
      {children}
      {state && <CheckoutModal plan={state.plan} onPaid={state.onPaid} onClose={close} />}
    </CheckoutContext.Provider>
  )
}
