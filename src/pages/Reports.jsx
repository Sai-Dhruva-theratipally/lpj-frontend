import { useMemo, useState } from 'react'

const reportSections = {
  stock: {
    label: 'Stock',
    endpoint: '/reports/stock',
    types: [
      ['daily-stock-addition', 'Daily Stock Addition'],
      ['seller-wise-stock', 'Seller-wise Stock'],
      ['metal-wise-stock', 'Metal-wise Stock'],
      ['category-wise-stock', 'Category-wise Stock'],
      ['tag-vs-tray-stock', 'Tag vs Tray Stock'],
    ],
  },
  sales: {
    label: 'Sales',
    endpoint: '/reports/sales',
    types: [
      ['daily-sales', 'Daily Sales'],
      ['customer-wise-sales', 'Customer-wise Sales'],
      ['category-wise-sales', 'Category-wise Sales'],
      ['metal-wise-sales', 'Gold vs Silver Sales'],
      ['tag-vs-tray-sales', 'Tag vs Tray Sales'],
      ['monthly-sales-summary', 'Monthly Sales Summary'],
      ['cancelled-sales', 'Cancelled Sales'],
    ],
  },
  inventory: {
    label: 'Inventory',
    endpoint: '/reports/inventory',
    types: [
      ['current-inventory', 'Current Inventory'],
      ['available-stock', 'Available Stock'],
      ['sold-stock', 'Sold Stock'],
      ['stone-weight', 'Stone Weight'],
    ],
  },
}

const emptyFilters = {
  section: 'stock',
  reportType: 'daily-stock-addition',
  fromDate: '',
  toDate: '',
  metalType: '',
  category: '',
  seller: '',
  customer: '',
  stockType: '',
}

function ReportsPage({ api }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const selectedSection = reportSections[filters.section]
  const columns = useMemo(() => buildColumns(report?.rows || []), [report])

  const updateFilter = (key, value) => {
    if (key === 'section') {
      setFilters({
        ...filters,
        section: value,
        reportType: reportSections[value].types[0][0],
      })
      setReport(null)
      return
    }

    setFilters({ ...filters, [key]: value })
  }

  const buildQuery = () => {
    const query = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== 'section' && value) {
        query.set(key, value)
      }
    })
    return query.toString()
  }

  const generateReport = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.get(`${selectedSection.endpoint}?${buildQuery()}`)
      setReport(response.data.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async () => {
    setDownloading(true)
    setError('')

    try {
      const response = await api.get(`${selectedSection.endpoint}/pdf?${buildQuery()}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${filters.reportType}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Reports</h2>
      </div>

      <form onSubmit={generateReport} className="report-filters">
        <label>
          Section
          <select value={filters.section} onChange={(event) => updateFilter('section', event.target.value)}>
            {Object.entries(reportSections).map(([key, section]) => (
              <option key={key} value={key}>{section.label}</option>
            ))}
          </select>
        </label>
        <label>
          Report Type
          <select value={filters.reportType} onChange={(event) => updateFilter('reportType', event.target.value)}>
            {selectedSection.types.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          From Date
          <input type="date" value={filters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} />
        </label>
        <label>
          To Date
          <input type="date" value={filters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} />
        </label>
        <label>
          Metal
          <select value={filters.metalType} onChange={(event) => updateFilter('metalType', event.target.value)}>
            <option value="">Any</option>
            <option value="GOLD">Gold</option>
            <option value="SILVER">Silver</option>
          </select>
        </label>
        <label>
          Stock Type
          <select value={filters.stockType} onChange={(event) => updateFilter('stockType', event.target.value)}>
            <option value="">Any</option>
            <option value="TAG">Tag</option>
            <option value="TRAY">Tray</option>
          </select>
        </label>
        <label>
          Category
          <input value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} />
        </label>
        <label>
          Seller
          <input value={filters.seller} onChange={(event) => updateFilter('seller', event.target.value)} />
        </label>
        <label>
          Customer
          <input value={filters.customer} onChange={(event) => updateFilter('customer', event.target.value)} />
        </label>
        <div className="report-actions">
          <button disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</button>
          <button type="button" className="secondary" onClick={downloadPdf} disabled={downloading}>
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </form>

      {error && <div className="status error">{error}</div>}

      {report && (
        <>
          <div className="summary">
            <div><strong>Total Quantity:</strong> {report.totals.quantity}</div>
            <div><strong>Total Gross Weight:</strong> {report.totals.grossWeight}</div>
            <div><strong>Total Stone Weight:</strong> {report.totals.stoneWeight}</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{formatHeader(column)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, index) => (
                  <tr key={`${report.reportType}-${index}`}>
                    {columns.map((column) => (
                      <td key={column}>{formatCell(row[column])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.rows.length === 0 && <p className="empty-state">No records found</p>}
        </>
      )}
    </section>
  )
}

function buildColumns(rows) {
  if (!rows.length) {
    return ['message']
  }

  const preferred = [
    'date',
    'saleDate',
    'cancelledAt',
    'month',
    'transactionId',
    'saleId',
    'seller',
    'customer',
    'stockType',
    'identifier',
    'tagId',
    'metalType',
    'category',
    'categoryCode',
    'quantity',
    'grossWeight',
    'stoneWeight',
    'transactionCount',
    'reason',
  ]
  const keys = new Set(rows.flatMap((row) => Object.keys(row)))
  return preferred.filter((key) => keys.has(key))
}

function formatHeader(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
}

function formatCell(value) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  return String(value)
}

export default ReportsPage
