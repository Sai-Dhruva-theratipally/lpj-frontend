import { useEffect, useMemo, useState } from 'react'

const emptyForm = {
  title: '',
  description: '',
  file: null,
}

function DocumentsPage({ api }) {
  const [documents, setDocuments] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Clear messages on component unmount
  useEffect(() => {
    return () => {
      setMessage('')
      setError('')
    }
  }, [])

  const endpoint = useMemo(() => {
    const query = search.trim()
    return query ? `/documents/search?q=${encodeURIComponent(query)}` : '/documents'
  }, [search])

  const loadDocuments = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get(endpoint)
      setDocuments(response.data.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadDocuments()
    }, search.trim() ? 250 : 0)

    return () => window.clearTimeout(timeoutId)
  }, [endpoint])
  /* eslint-enable react-hooks/exhaustive-deps */

  const uploadDocument = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!form.file) {
      setError('Please select a JPG, PNG or PDF file')
      return
    }

    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('description', form.description)
    formData.append('document', form.file)

    setUploading(true)
    setUploadProgress(0)

    try {
      await api.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) {
            return
          }

          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
        },
      })
      setForm(emptyForm)
      event.target.reset()
      setMessage('Document uploaded successfully')
      await loadDocuments()
      setTimeout(() => setMessage(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const deleteDocument = async (document) => {
    if (!window.confirm(`Delete "${document.title}"?`)) {
      return
    }

    setError('')
    setMessage('')

    try {
      await api.delete(`/documents/${document._id}`)
      setDocuments((current) => current.filter((item) => item._id !== document._id))
      setMessage('Document deleted successfully')
      setTimeout(() => setMessage(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    }
  }

  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Document Vault</h2>
        </div>
        <p style={{ color: 'var(--muted-text)', marginBottom: '20px', fontSize: '14px' }}>
          Store shop documents, bills, invoices and receipts securely.
        </p>

        <form onSubmit={uploadDocument} className="form document-upload-form">
          <label>
            Title
            <input
              required
              maxLength="160"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Gold supplier invoice"
            />
          </label>
          <label>
            Description
            <textarea
              rows="3"
              maxLength="1000"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Optional notes"
            />
          </label>
          <label>
            File
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })}
            />
          </label>
          <button disabled={uploading || !form.title.trim()}>{uploading ? `Uploading ${uploadProgress}%` : 'Upload Document'}</button>
        </form>
      </section>

      {(message || error) && <div className={`status ${error ? 'error' : 'success'}`}>{error || message}</div>}

      <section className="panel">
        <div className="section-heading document-heading">
          <h2>Saved Documents</h2>
          <label className="document-search">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or description"
            />
          </label>
        </div>

        {loading && <p className="empty-state">Loading documents...</p>}

        {!loading && documents.length === 0 && (
          <p className="empty-state">{search.trim() ? 'No matching documents found.' : 'No documents uploaded yet.'}</p>
        )}

        {!loading && documents.length > 0 && (
          <div className="document-grid">
            {documents.map((document) => (
              <article className="document-card" key={document._id}>
                <div className="document-preview">
                  {document.fileType === 'IMAGE' ? (
                    <img src={document.cloudinaryUrl} alt={document.title} />
                  ) : (
                    <div className="pdf-preview">PDF</div>
                  )}
                </div>
                <div className="document-card-body">
                  <h3>{document.title}</h3>
                  <p>{document.description || 'No description'}</p>
                  <small>Uploaded: {formatDocumentDate(document.uploadedAt)}</small>
                </div>
                <div className="document-actions">
                  <button type="button" onClick={() => window.open(document.cloudinaryUrl, '_blank', 'noopener,noreferrer')}>
                    View
                  </button>
                  <button type="button" className="secondary" onClick={() => deleteDocument(document)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function formatDocumentDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export default DocumentsPage
