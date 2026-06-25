import { useState } from 'react'

const saleColumns = [
  ['serialNo', 'S.No'],
  ['customerName', 'Customer Name'],
  ['date', 'Date'],
  ['barcode', 'Barcode'],
  ['quantity', 'Quantity'],
  ['grossWeight', 'Gross Weight'],
  ['stoneWeight', 'Stone Weight'],
  ['rate', 'Rate'],
  ['receivedItemType', 'Received Item Type'],
  ['receivedMetal', 'Received Metal'],
  ['receivedCategory', 'Received Category'],
  ['receivedWeight', 'Received Weight'],
  ['purity', 'Purity (%)'],
]

const maxCompressedWidth = 1600
const compressedQuality = 0.82
const maxUploadBytes = 5 * 1024 * 1024

function AISaleImportPage({ api, onComplete }) {
  const [files, setFiles] = useState([])
  const [rawJson, setRawJson] = useState('')
  const [rows, setRows] = useState([])
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [editingRowIndex, setEditingRowIndex] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const invalidCount = rows.filter((row) => row.status === 'INVALID').length
  const allRowsValid = rows.length > 0 && rows.every((row) => row.status === 'VALID')

  const runImportAction = async (action) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await action()
    } catch (err) {
      setError(err.response?.data?.message || err.message)
      if (err.response?.data?.data?.rows) {
        setRows(err.response.data.data.rows)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFiles = async (event) => {
    const selected = Array.from(event.target.files || [])
    setError('')

    try {
      const compressed = []
      for (const file of selected) {
        compressed.push(await compressImage(file))
      }
      setFiles(compressed)
      setRows([])
      setRawJson('')
      setPreview(null)
      setResult(null)
      setMessage(`${compressed.length} image(s) ready`)
    } catch (err) {
      setFiles([])
      setError(err.message)
    }
  }

  const extractWithAI = () => runImportAction(async () => {
    if (!files.length) {
      throw new Error('Upload at least one sale sheet image')
    }

    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))

    const response = await api.post('/ai/sale-import/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const data = response.data.data
    setRawJson(data.rawJson || '')
    setRows(data.rows || [])
    setPreview(null)
    setResult(null)
    setMessage(`${data.rows?.length || 0} row(s) extracted by ${data.model}`)
  })

  const validateRows = (nextRows = rows) => runImportAction(async () => {
    const response = await api.post('/inventory/bulk-sales/validate', { rows: nextRows })
    setRows(response.data.data.rows)
    setPreview(null)
    setResult(null)
    setMessage(`${response.data.data.validCount} valid, ${response.data.data.invalidCount} invalid`)
  })

  const showConfirmation = () => runImportAction(async () => {
    const response = await api.post('/inventory/bulk-sales/preview', { rows })
    setRows(response.data.data.rows)
    if (!response.data.data.isValid) {
      setPreview(null)
      setMessage(`${response.data.data.validCount} valid, ${response.data.data.invalidCount} invalid`)
      return
    }
    setPreview(response.data.data)
    setResult(null)
    setMessage(`${response.data.data.bills.length} bill(s) ready for confirmation`)
  })

  const createSales = () => runImportAction(async () => {
    if (!window.confirm('Create sales from the validated AI import?')) {
      return
    }

    const response = await api.post('/inventory/bulk-sales/create', { rows })
    setResult(response.data.data)
    setPreview(null)
    setRows([])
    setRawJson('')
    setFiles([])
    setMessage(`${response.data.data.createdCount} sale bill(s) created`)
    await onComplete()
  })

  const openEditRow = (rowIndex) => {
    setEditingRowIndex(rowIndex)
    setEditDraft({ ...rows[rowIndex] })
  }

  const closeEditRow = () => {
    setEditingRowIndex(null)
    setEditDraft(null)
  }

  const saveEditRow = () => {
    if (editingRowIndex === null || !editDraft) {
      return null
    }

    const savedIndex = editingRowIndex
    const nextRows = rows.map((row, index) => (
      index === savedIndex
        ? { ...row, ...editDraft, status: 'PENDING', errors: [], saleItem: null, inventory: null }
        : row
    ))
    setRows(nextRows)
    setPreview(null)
    setResult(null)
    closeEditRow()
    return nextRows
  }

  const revalidateRow = (rowIndex) => {
    validateRows(rows.map((row, index) => (
      index === rowIndex ? { ...row, status: undefined, errors: [] } : row
    )))
  }

  const clearImport = () => {
    setFiles([])
    setRawJson('')
    setRows([])
    setPreview(null)
    setResult(null)
    setEditDraft(null)
    setEditingRowIndex(null)
    setMessage('')
    setError('')
  }

  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>AI Sale Import</h2>
          <button type="button" className="secondary" onClick={clearImport}>Clear</button>
        </div>

        {(message || error) && (
          <div className={`status ${error ? 'error' : 'success'}`}>{error || message}</div>
        )}

        <div className="grid two">
          <label>
            Upload Image
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} />
          </label>
          <div className="ai-upload-summary">
            <strong>{files.length} image(s)</strong>
            <span>{files.map((file) => file.name).join(', ') || 'No files selected'}</span>
          </div>
        </div>

        <div className="filter-actions" style={{ marginTop: '14px' }}>
          <button type="button" onClick={extractWithAI} disabled={loading || files.length === 0}>
            {loading ? 'AI Processing...' : 'Extract With AI'}
          </button>
          <button type="button" className="secondary" onClick={() => validateRows()} disabled={loading || rows.length === 0}>
            Revalidate All
          </button>
          <button type="button" onClick={showConfirmation} disabled={loading || !allRowsValid}>
            Confirm Sale
          </button>
        </div>
      </section>

      {loading && (
        <section className="panel">
          <div className="section-heading">
            <h2>AI Processing</h2>
          </div>
          <p className="empty-state">Reading sale sheet images and preparing rows...</p>
        </section>
      )}

      {rawJson && (
        <section className="panel">
          <div className="section-heading">
            <h2>Generated JSON</h2>
          </div>
          <textarea rows="10" readOnly value={rawJson} />
        </section>
      )}

      {rows.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <h2>Validation Table</h2>
            <span>{rows.length - invalidCount} valid / {invalidCount} invalid</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  {saleColumns.map(([field, label]) => <th key={field}>{label}</th>)}
                  <th>Errors</th>
                  <th>Edit Row</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.rowId || rowIndex} className={row.status === 'VALID' ? 'selected' : ''}>
                    <td><span className={`badge ${(row.status || 'pending').toLowerCase()}`}>{row.status || 'PENDING'}</span></td>
                    {saleColumns.map(([field]) => (
                      <td key={field} className="bulk-value-cell">{row[field] ?? '-'}</td>
                    ))}
                    <td className="bulk-errors">{(row.errors || []).join('; ') || '-'}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="secondary" onClick={() => openEditRow(rowIndex)} disabled={loading}>
                          Edit
                        </button>
                        <button type="button" className="secondary" onClick={() => revalidateRow(rowIndex)} disabled={loading}>
                          Revalidate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {preview?.bills?.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <h2>Confirm Sale</h2>
            <button type="button" onClick={createSales} disabled={loading}>Create Sales</button>
          </div>
          <div className="bulk-preview-list">
            {preview.bills.map((bill) => (
              <article className="bulk-preview-bill" key={bill.serialNo}>
                <h3>Bill {bill.serialNo}: {bill.customerName}</h3>
                <p>{formatDate(bill.date)} | Sold {bill.totals.soldItems} item(s), {bill.totals.soldWeight}g | Received {bill.totals.receivedWeight}g</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Weight</th>
                        <th>Stone</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.saleItems.map((item, index) => (
                        <tr key={`${item.inventoryId}-${index}`}>
                          <td>{item.identifier}</td>
                          <td>{item.stockType}</td>
                          <td>{item.quantity}</td>
                          <td>{item.weight}</td>
                          <td>{item.stoneWeight || 0}</td>
                          <td>{item.rate ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bill.receivedItems.length > 0 && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Received Type</th>
                          <th>Metal</th>
                          <th>Category</th>
                          <th>Weight</th>
                          <th>Purity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.receivedItems.map((item, index) => (
                          <tr key={`${item.itemType}-${item.category}-${index}`}>
                            <td>{item.itemType}</td>
                            <td>{item.metalType}</td>
                            <td>{item.category}</td>
                            <td>{item.weight}</td>
                            <td>{item.purity || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {result?.sales?.length > 0 && (
        <section className="panel">
          <h2>Created Sales</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Sale ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Weight</th>
                  <th>Received Weight</th>
                </tr>
              </thead>
              <tbody>
                {result.sales.map((sale) => (
                  <tr key={sale.saleId}>
                    <td>{sale.serialNo}</td>
                    <td>{sale.saleId}</td>
                    <td>{sale.customerName}</td>
                    <td>{sale.totalItems}</td>
                    <td>{sale.totalWeight}</td>
                    <td>{sale.totalReceivedWeight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editDraft && (
        <div className="modal-backdrop">
          <div className="modal bulk-edit-modal">
            <h2>Edit Row</h2>
            <div className="bulk-edit-grid">
              {saleColumns.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    value={editDraft[field] ?? ''}
                    onChange={(event) => setEditDraft({ ...editDraft, [field]: event.target.value })}
                    autoComplete="off"
                  />
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeEditRow}>Cancel</button>
              <button type="button" onClick={saveEditRow}>Save Row</button>
              <button type="button" onClick={() => {
                const nextRows = saveEditRow()
                if (nextRows) {
                  validateRows(nextRows)
                }
              }}>
                Save & Revalidate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

async function compressImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not an image`)
  }

  if (file.size <= maxUploadBytes && file.type === 'image/webp') {
    return file
  }

  const image = await loadImage(file)
  const scale = Math.min(1, maxCompressedWidth / image.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', compressedQuality)
  })

  if (!blob) {
    throw new Error(`Could not compress ${file.name}`)
  }

  if (blob.size > maxUploadBytes) {
    throw new Error(`${file.name} is still larger than 5 MB after compression`)
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not read ${file.name}`))
    }
    image.src = url
  })
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default AISaleImportPage
