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
    loadRateHistory({ metalType: activeTab, fromDate, toDate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const loadRateHistory = async (filters = {}) => {
    try {
      setLoading(true)
      setError('')

      const query = new URLSearchParams()
      query.set('metalType', filters.metalType || activeTab)

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

  const handleApplyFilters = (event) => {
    event.preventDefault()
    loadRateHistory({ metalType: activeTab, fromDate, toDate })
  }

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
    loadRateHistory({ metalType: activeTab })
  }

  const formatDateTime = (value) => {
    if (!value) {
      return '-'
    }

    const date = new Date(value)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const time = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })

    return `${day}/${month}/${year} ${time}`
  }

  const getValue = (row, key) => {
    const value = Number(row?.[key] || 0)
    return value > 0 ? `₹${value.toLocaleString('en-IN')}` : '-'
  }

  const selectedLabel = activeTab === 'GOLD' ? 'Gold' : 'Silver'

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Rate History</h2>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '24px' }}>
        View gold and silver buy/sell rates recorded from stock and sale transactions
      </p>

      {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      <form onSubmit={handleApplyFilters} className="inline-form compact" style={{ marginBottom: '24px' }}>
        <label style={{ flex: 1 }}>
          From Date
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} disabled={loading} />
        </label>
        <label style={{ flex: 1 }}>
          To Date
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} disabled={loading} />
        </label>
        <button type="submit" disabled={loading}>
          Apply Filters
        </button>
        <button type="button" className="secondary" onClick={handleClearFilters} disabled={loading}>
          Clear
        </button>
      </form>

      <div className="rate-tabs">
        <button
          type="button"
          className={`rate-tab ${activeTab === 'GOLD' ? 'active' : ''}`}
          onClick={() => setActiveTab('GOLD')}
          disabled={loading}
        >
          Gold
        </button>
        <button
          type="button"
          className={`rate-tab ${activeTab === 'SILVER' ? 'active' : ''}`}
          onClick={() => setActiveTab('SILVER')}
          disabled={loading}
        >
          Silver
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-text)' }}>Loading rate history...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted-text)' }}>No rate history found</div>
      ) : (
        <div className="rate-history-container">
          <div className="rate-section">
            <h3>{selectedLabel} Rate History</h3>
            <table className="rate-table">
              <thead>
                <tr>
                  <th>Date and Time</th>
                  <th>{selectedLabel} Bought</th>
                  <th>{selectedLabel} Sold</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="rate-datetime">{formatDateTime(row.dateTime)}</td>
                    <td className="rate-value">{getValue(row, activeTab === 'GOLD' ? 'goldBought' : 'silverBought')}</td>
                    <td className="rate-value">{getValue(row, activeTab === 'GOLD' ? 'goldSold' : 'silverSold')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--muted-text)' }}>
        <p>Showing <strong>{history.length}</strong> total rate records</p>
      </div>
    </section>
  )
}

export default RateHistoryPage
