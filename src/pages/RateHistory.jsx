import { useEffect, useState } from 'react'
import '../styles/RateHistory.css'

function RateHistoryPage({ api }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('GOLD')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    loadRateHistory()
  }, [])

  const loadRateHistory = async (filters = {}) => {
    try {
      setLoading(true)
      setError('')

      const query = new URLSearchParams()
      if (filters.fromDate) query.set('fromDate', filters.fromDate)
      if (filters.toDate) query.set('toDate', filters.toDate)

      const response = await api.get(`/manual-rates/history?${query.toString()}`)
      setHistory(response.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load rate history')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = (e) => {
    e.preventDefault()
    loadRateHistory({ fromDate, toDate })
  }

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
    loadRateHistory({})
  }

  const getFilteredRates = (rateType) => {
    return history.filter((rate) => rate.metalType === activeTab && rate.rateType === rateType).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  const formatDateTime = (date) => {
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    return `${day}/${month}/${year} ${time}`
  }

  const buyRates = getFilteredRates('BUY')
  const sellRates = getFilteredRates('SELL')

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Rate History</h2>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '24px' }}>View manual gold and silver rates over time</p>

      {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Filters */}
      <form onSubmit={handleApplyFilters} className="inline-form compact" style={{ marginBottom: '24px' }}>
        <label style={{ flex: 1 }}>
          From Date
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={loading} />
        </label>
        <label style={{ flex: 1 }}>
          To Date
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={loading} />
        </label>
        <button type="submit" disabled={loading}>
          Apply Filters
        </button>
        <button type="button" className="secondary" onClick={handleClearFilters} disabled={loading}>
          Clear
        </button>
      </form>

      {/* Metal Type Tabs */}
      <div className="rate-tabs">
        <button
          className={`rate-tab ${activeTab === 'GOLD' ? 'active' : ''}`}
          onClick={() => setActiveTab('GOLD')}
          disabled={loading}
        >
          Gold
        </button>
        <button
          className={`rate-tab ${activeTab === 'SILVER' ? 'active' : ''}`}
          onClick={() => setActiveTab('SILVER')}
          disabled={loading}
        >
          Silver
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-text)' }}>Loading rate history...</div>
      ) : buyRates.length === 0 && sellRates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-text)' }}>No rate history found</div>
      ) : (
        <div className="rate-history-container">
          {/* Buy Rates */}
          <div className="rate-section">
            <h3>Buy Rate</h3>
            {buyRates.length === 0 ? (
              <div style={{ color: 'var(--muted-text)', padding: '16px', textAlign: 'center' }}>No buy rates recorded</div>
            ) : (
              <table className="rate-table">
                <thead>
                  <tr>
                    <th>Rate</th>
                    <th>Date/Time</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {buyRates.map((rate, index) => (
                    <tr key={`${rate._id}-${index}`}>
                      <td className="rate-value">₹{rate.rate.toLocaleString('en-IN')}</td>
                      <td className="rate-datetime">{formatDateTime(rate.createdAt)}</td>
                      <td className="rate-source">
                        <span className={`source-badge source-${rate.source.toLowerCase()}`}>{getSourceLabel(rate.source)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sell Rates */}
          <div className="rate-section">
            <h3>Sell Rate</h3>
            {sellRates.length === 0 ? (
              <div style={{ color: 'var(--muted-text)', padding: '16px', textAlign: 'center' }}>No sell rates recorded</div>
            ) : (
              <table className="rate-table">
                <thead>
                  <tr>
                    <th>Rate</th>
                    <th>Date/Time</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {sellRates.map((rate, index) => (
                    <tr key={`${rate._id}-${index}`}>
                      <td className="rate-value">₹{rate.rate.toLocaleString('en-IN')}</td>
                      <td className="rate-datetime">{formatDateTime(rate.createdAt)}</td>
                      <td className="rate-source">
                        <span className={`source-badge source-${rate.source.toLowerCase()}`}>{getSourceLabel(rate.source)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--muted-text)' }}>
        <p>Showing <strong>{history.length}</strong> total rate records</p>
      </div>
    </section>
  )
}

function getSourceLabel(source) {
  const labels = {
    stock_transaction: 'Stock',
    sale_transaction: 'Sale',
    manual_entry: 'Manual',
  }
  return labels[source.toLowerCase()] || source
}

export default RateHistoryPage
