import { useEffect, useState } from 'react'
import '../styles/Categories.css'

function CategoriesPage({ categories, loading, onUpdate, onDelete }) {
  const [filteredCategories, setFilteredCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [metalTypeFilter, setMetalTypeFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sortBy, setSortBy] = useState('metalType')

  useEffect(() => {
    filterAndSortCategories()
  }, [categories, searchTerm, metalTypeFilter, sortBy])

  const filterAndSortCategories = () => {
    let filtered = [...categories]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(search) ||
          cat.categoryCode.toLowerCase().includes(search)
      )
    }

    // Apply metal type filter
    if (metalTypeFilter) {
      filtered = filtered.filter((cat) => cat.metalType === metalTypeFilter)
    }

    // Apply sorting
    if (sortBy === 'metalType') {
      filtered.sort((a, b) => a.metalType.localeCompare(b.metalType) || a.name.localeCompare(b.name))
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'code') {
      filtered.sort((a, b) => a.categoryCode.localeCompare(b.categoryCode))
    }

    setFilteredCategories(filtered)
  }

  const handleEditClick = (category) => {
    setEditingId(category._id)
    setEditName(category.name)
    setError('')
    setMessage('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setError('')
  }

  const handleSaveEdit = async (id) => {
    const trimmedName = editName.trim()

    if (!trimmedName) {
      setError('Category name cannot be empty')
      return
    }

    const category = categories.find((c) => c._id === id)
    if (trimmedName.toUpperCase() === category.name) {
      setMessage('No changes made')
      setEditingId(null)
      return
    }

    try {
      setError('')
      setMessage('')
      await onUpdate(id, { name: trimmedName })
      setEditingId(null)
      setEditName('')
      setMessage('Category updated successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update category')
    }
  }

  const handleDelete = async (id) => {
    const category = categories.find((c) => c._id === id)

    if (!window.confirm(`Delete category "${category.name}"? All associated stock items will also be deleted. This action cannot be undone.`)) {
      return
    }

    try {
      setError('')
      setMessage('')
      const result = await onDelete(id)
      const deletedCount = result?.deletedInventoryCount || 0
      const message = deletedCount > 0 
        ? `Category deleted successfully. ${deletedCount} stock item(s) were also deleted.`
        : 'Category deleted successfully'
      setMessage(message)
      setTimeout(() => setMessage(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete category')
    }
  }

  const metalTypes = ['GOLD', 'SILVER', 'OTHERS']

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Manage Categories</h2>
        <p>View, edit, and delete product categories</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="categories-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="filter-controls">
          <select value={metalTypeFilter} onChange={(e) => setMetalTypeFilter(e.target.value)} disabled={loading}>
            <option value="">All Metal Types</option>
            {metalTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} disabled={loading}>
            <option value="metalType">Sort by Metal Type</option>
            <option value="name">Sort by Name</option>
            <option value="code">Sort by Code</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading categories...</div>
      ) : filteredCategories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted-text)' }}>
          {categories.length === 0 ? 'No categories available' : 'No categories match your filters'}
        </div>
      ) : (
        <div className="categories-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Metal Type</th>
                <th>Name</th>
                <th>Code</th>
                <th>Stock Types</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category._id} className={editingId === category._id ? 'editing' : ''}>
                  <td className="metal-type-cell">
                    <span className={`metal-badge metal-${category.metalType.toLowerCase()}`}>
                      {category.metalType}
                    </span>
                  </td>
                  <td className="name-cell">
                    {editingId === category._id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="edit-input"
                        autoFocus
                      />
                    ) : (
                      <span>{category.name}</span>
                    )}
                  </td>
                  <td className="code-cell">
                    <code>{category.categoryCode}</code>
                  </td>
                  <td className="stock-types-cell">
                    {category.stockTypes && category.stockTypes.length > 0 ? (
                      <div className="stock-types">
                        {category.stockTypes.map((type) => (
                          <span key={type} className="stock-badge">
                            {type}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="date-cell">{new Date(category.createdAt).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    {editingId === category._id ? (
                      <>
                        <button
                          className="btn-small btn-success"
                          onClick={() => handleSaveEdit(category._id)}
                          disabled={loading}
                        >
                          Save
                        </button>
                        <button
                          className="btn-small btn-secondary"
                          onClick={handleCancelEdit}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn-small btn-edit"
                          onClick={() => handleEditClick(category)}
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-small btn-delete"
                          onClick={() => handleDelete(category._id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="categories-info">
        <p>
          Showing <strong>{filteredCategories.length}</strong> of <strong>{categories.length}</strong> categories
        </p>
      </div>
    </section>
  )
}

export default CategoriesPage
