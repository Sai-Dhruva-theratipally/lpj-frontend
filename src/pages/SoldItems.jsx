import { useEffect, useState } from 'react'
import '../styles/SoldItems.css'

const emptyFilters = {
  sortOrder: 'desc',
  metalType: '',
  category: '',
  customer: '',
  seller: '',
  tagId: '',
  fromDate: '',
  toDate: '',
  minCost: '',
  maxCost: '',
}

function SoldItemsPage({ api }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSoldItems(emptyFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSoldItems = async (appliedFilters = filters) => {
    try {
      setLoading(true)
      setError('')

      const query = new URLSearchParams()
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, value)
        }
      })

      const response = await api.get(`/inventory/sold-items?${query.toString()}`)
      const rows = response.data.data || []
      setItems(rows)
      setSelectedItem((current) => {
        if (current && rows.some((row) => row.id === current.id)) {
          return rows.find((row) => row.id === current.id) || null
        }

        return rows[0] || null
      })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load sold items')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = (event) => {
    event.preventDefault()
    loadSoldItems(filters)
  }

  const handleClearFilters = () => {
    setFilters(emptyFilters)
    loadSoldItems(emptyFilters)
  }

  const formatDate = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    return `${date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })} ${date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })}`
  }

  const formatMoney = (value) => {
    const number = Number(value || 0)
    return number > 0 ? `Rs. ${number.toLocaleString('en-IN')}` : '-'
  }

  return (
    <section className="panel sold-items-page">
      <div className="section-heading">
        <h2>Sold Items</h2>
        <button type="button" className="secondary" onClick={() => loadSoldItems(filters)} disabled={loading}>
          Refresh
        </button>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '20px', fontSize: '14px' }}>
        Browse sold inventory items. Returned items and cancelled bills disappear from this list automatically.
      </p>

      {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

      <form onSubmit={handleApplyFilters} className="sold-items-filters">
        <label>
          Sort By Date
          <select value={filters.sortOrder} onChange={(event) => setFilters({ ...filters, sortOrder: event.target.value })}>
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </label>
        <label>
          Metal
          <select value={filters.metalType} onChange={(event) => setFilters({ ...filters, metalType: event.target.value })}>
            <option value="">Any</option>
            <option value="GOLD">Gold</option>
            <option value="SILVER">Silver</option>
            <option value="OTHERS">Others</option>
          </select>
        </label>
        <label>
          Category
          <input value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} />
        </label>
        <label>
          Customer
          <input value={filters.customer} onChange={(event) => setFilters({ ...filters, customer: event.target.value })} />
        </label>
        <label>
          Seller
          <input value={filters.seller} onChange={(event) => setFilters({ ...filters, seller: event.target.value })} />
        </label>
        <label>
          Tag / Code
          <input value={filters.tagId} onChange={(event) => setFilters({ ...filters, tagId: event.target.value })} />
        </label>
        <label>
          From Date
          <input type="date" value={filters.fromDate} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} />
        </label>
        <label>
          To Date
          <input type="date" value={filters.toDate} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} />
        </label>
        <label>
          Min Cost
          <input type="number" min="0" step="0.01" value={filters.minCost} onChange={(event) => setFilters({ ...filters, minCost: event.target.value })} />
        </label>
        <label>
          Max Cost
          <input type="number" min="0" step="0.01" value={filters.maxCost} onChange={(event) => setFilters({ ...filters, maxCost: event.target.value })} />
        </label>
        <div className="filter-actions">
          <button type="submit" disabled={loading}>{loading ? 'Applying...' : 'Apply Filters'}</button>
          <button type="button" className="secondary" onClick={handleClearFilters} disabled={loading}>
            Clear
          </button>
        </div>
      </form>

      <div className="sold-items-layout">
        <div className="sold-items-table-wrap">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date Sold</th>
                  <th>Customer</th>
                  <th>Metal</th>
                  <th>Category</th>
                  <th>Item</th>
                  <th>Rate Bought</th>
                  <th>Rate Sold</th>
                  <th>Weight</th>
                  <th>Stone</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={selectedItem?.id === item.id ? 'selected-row' : ''}
                    onClick={() => setSelectedItem(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <td>{formatDate(item.dateSold)}</td>
                    <td>{item.customerName}</td>
                    <td>{item.metalType}</td>
                    <td>{item.category}</td>
                    <td>{item.tagId || item.trayCode || item.saleId}</td>
                    <td>{formatMoney(item.rateBought)}</td>
                    <td>{formatMoney(item.rateSold)}</td>
                    <td>{Number(item.weight || 0).toFixed(3)}</td>
                    <td>{Number(item.stoneWeight || 0).toFixed(3)}</td>
                    <td>{formatMoney(item.soldAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && !loading && <p className="empty-state">No sold items found</p>}
        </div>

        <aside className="sold-item-details">
          <h3>Item Details</h3>
          {selectedItem ? (
            <dl className="details-grid">
              <dt>Customer</dt>
              <dd>{selectedItem.customerName}</dd>
              <dt>Seller</dt>
              <dd>{selectedItem.sellerName || '-'}</dd>
              <dt>Bill</dt>
              <dd>{selectedItem.saleId}</dd>
              <dt>Metal</dt>
              <dd>{selectedItem.metalType}</dd>
              <dt>Category</dt>
              <dd>{selectedItem.category}</dd>
              <dt>Tag / Code</dt>
              <dd>{selectedItem.tagId || selectedItem.trayCode || '-'}</dd>
              <dt>Date Bought</dt>
              <dd>{formatDateTime(selectedItem.dateBought)}</dd>
              <dt>Date Sold</dt>
              <dd>{formatDateTime(selectedItem.dateSold)}</dd>
              <dt>Rate Bought</dt>
              <dd>{formatMoney(selectedItem.rateBought)}</dd>
              <dt>Rate Sold</dt>
              <dd>{formatMoney(selectedItem.rateSold)}</dd>
              <dt>Weight</dt>
              <dd>{Number(selectedItem.weight || 0).toFixed(3)} g</dd>
              <dt>Stone Weight</dt>
              <dd>{Number(selectedItem.stoneWeight || 0).toFixed(3)} g</dd>
              <dt>Qty</dt>
              <dd>{selectedItem.quantity}</dd>
              <dt>Amount</dt>
              <dd>{formatMoney(selectedItem.soldAmount)}</dd>
            </dl>
          ) : (
            <p className="empty-state">Select a sold item to see details</p>
          )}
        </aside>
      </div>
    </section>
  )
}

export default SoldItemsPage
