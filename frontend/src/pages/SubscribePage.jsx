import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './SubscribePage.css'

const BILLING_CYCLES = [
  { key: 'monthly',   label: 'Monthly',   discount: null },
  { key: 'quarterly', label: 'Quarterly', discount: '17% off' },
  { key: 'yearly',    label: 'Yearly',    discount: '37% off' },
]

export default function SubscribePage() {
  const navigate = useNavigate()

  const [modules,       setModules]       = useState([])
  const [selected,      setSelected]      = useState([])
  const [billingCycle,  setBillingCycle]  = useState('monthly')
  const [loading,       setLoading]       = useState(true)
  const [paying,        setPaying]        = useState(false)
  const [error,         setError]         = useState('')

  // Load module pricing from API
  useEffect(() => {
    api.get('/subscriptions/plans')
      .then(res => {
        setModules(res.data.data)
        // Pre-select core modules
        const core = res.data.data
          .filter(m => ['members','attendance','payments','memberships'].includes(m.module))
          .map(m => m.module)
        setSelected(core)
      })
      .catch(() => setError('Failed to load pricing. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleModule = (moduleName) => {
    setSelected(prev =>
      prev.includes(moduleName)
        ? prev.filter(m => m !== moduleName)
        : [...prev, moduleName]
    )
  }

  const totalAmount = modules
    .filter(m => selected.includes(m.module))
    .reduce((sum, m) => sum + m.pricing[billingCycle], 0)

  const handleSubscribe = async () => {
    if (!selected.length) {
      setError('Please select at least one module')
      return
    }

    setError('')
    setPaying(true)

    try {
      // 1. Create Razorpay order on backend
      const { data } = await api.post('/subscriptions/checkout', {
        billingCycle,
        modules: selected,
      })

      const { orderId, amount, currency, subscriptionId, razorpayKey } = data.data

      // 2. Load Razorpay checkout script dynamically
      await loadRazorpayScript()

      // 3. Open Razorpay payment modal
      const options = {
        key:         razorpayKey,
        amount,
        currency,
        name:        'FitSync',
        description: `${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} Subscription`,
        order_id:    orderId,
        handler: async (response) => {
          try {
            // 4. Verify payment on backend
            await api.post('/subscriptions/verify', {
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              subscriptionId,
            })
            // 5. Redirect to dashboard
            navigate('/admin/dashboard', { replace: true })
            window.location.reload() // reload to refresh auth context with new plan
          } catch {
            setError('Payment received but verification failed. Contact support.')
            setPaying(false)
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        prefill: {
          name:  '',  // will be filled from user context in real app
          email: '',
        },
        theme: { color: '#111111' },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        setError(`Payment failed: ${response.error.description}`)
        setPaying(false)
      })
      rzp.open()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
      setPaying(false)
    }
  }

  return (
    <div className="subscribe-page">
      <div className="subscribe-container">

        {/* Header */}
        <div className="subscribe-header">
          <div className="subscribe-logo">
            <svg viewBox="0 0 48 48" fill="currentColor" width="28" height="28">
              <rect x="4"  y="19" width="6"  height="10" rx="2" opacity="0.9" />
              <rect x="10" y="14" width="5"  height="20" rx="2.5" />
              <rect x="15" y="17" width="4"  height="14" rx="2" opacity="0.85" />
              <rect x="19" y="21" width="10" height="6"  rx="3" />
              <rect x="29" y="17" width="4"  height="14" rx="2" opacity="0.85" />
              <rect x="33" y="14" width="5"  height="20" rx="2.5" />
              <rect x="38" y="19" width="6"  height="10" rx="2" opacity="0.9" />
            </svg>
            <span>FitSync</span>
          </div>
          <h1>Choose Your Plan</h1>
          <p>Select the modules your gym needs. Pay only for what you use.</p>
        </div>

        {error && (
          <div className="subscribe-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Billing cycle toggle */}
        <div className="billing-toggle">
          {BILLING_CYCLES.map(c => (
            <button
              key={c.key}
              className={`billing-btn ${billingCycle === c.key ? 'active' : ''}`}
              onClick={() => setBillingCycle(c.key)}
            >
              {c.label}
              {c.discount && <span className="billing-discount">{c.discount}</span>}
            </button>
          ))}
        </div>

        {/* Module grid */}
        {loading ? (
          <div className="subscribe-loading">
            <div className="spinner" />
            <p>Loading plans...</p>
          </div>
        ) : (
          <div className="modules-grid">
            {modules.map(m => {
              const isSelected = selected.includes(m.module)
              return (
                <div
                  key={m.module}
                  className={`module-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleModule(m.module)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && toggleModule(m.module)}
                >
                  <div className="module-card-top">
                    <div className="module-check">
                      {isSelected
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>
                      }
                    </div>
                    <div className="module-price">
                      ₹{m.pricing[billingCycle]}
                      <span>/{billingCycle === 'monthly' ? 'mo' : billingCycle === 'quarterly' ? 'qtr' : 'yr'}</span>
                    </div>
                  </div>
                  <p className="module-label">{m.label}</p>
                  <p className="module-desc">{m.description}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary footer */}
        <div className="subscribe-footer">
          <div className="subscribe-summary">
            <span className="summary-modules">
              {selected.length} module{selected.length !== 1 ? 's' : ''} selected
            </span>
            <div className="summary-total">
              <span className="summary-label">Total</span>
              <span className="summary-amount">₹{totalAmount.toLocaleString('en-IN')}</span>
              <span className="summary-cycle">
                /{billingCycle === 'monthly' ? 'month' : billingCycle === 'quarterly' ? 'quarter' : 'year'}
              </span>
            </div>
          </div>

          <button
            className="subscribe-btn"
            onClick={handleSubscribe}
            disabled={paying || !selected.length || loading}
          >
            {paying
              ? <><span className="spinner-sm" /> Processing...</>
              : `Subscribe · ₹${totalAmount.toLocaleString('en-IN')}`
            }
          </button>

          <p className="subscribe-note">
            Secure payment via Razorpay · Cancel anytime · No hidden fees
          </p>
        </div>

      </div>
    </div>
  )
}

// ── Load Razorpay script dynamically ──────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const script = document.createElement('script')
    script.src    = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}
