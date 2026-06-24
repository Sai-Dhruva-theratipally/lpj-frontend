import { useEffect, useState } from 'react'
import '../styles/Sales.css'

function SalesPage({ api }) {
  const [formData, setFormData] = useState({
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    receivedItems: [],
  })
  const [oldItemForm, setOldItemForm] = useState({
    itemType: 'OLD_ORNAMENT',
    metalType: 'GOLD',
    category: '',
    weight: '',
    purity: '',
  })
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)

  // Clear messages on component unmount
  useEffect(() => {
    return () => {
      setMessage('')
      setError('')
    }
  }, [])

  // Fetch suggestions on search input change
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchInput.trim()) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      try {
        const response = await api.get('/inventory/suggestions', {
          params: { search: searchInput, limit: 10 },
        })
        setSuggestions(response.data.data || [])
        setShowSuggestions(true)
      } catch (err) {
        console.error('Error fetching suggestions:', err)
        setSuggestions([])
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(timeoutId)
  }, [searchInput, api])

  const handleSearchSelect = async (suggestion) => {
    try {
      setLookupLoading(true)
      setError('')

      // Get full inventory details
      const response = await api.get(`/inventory/lookup/${suggestion.value}`)
      const inventory = response.data.data

      // Check if item already in cart
      const itemExists = formData.items.some((item) => item.inventoryId === inventory.inventoryId)
      if (itemExists) {
        setError('This item is already in the cart')
        setLookupLoading(false)
        return
      }

      // Add to items
      const newItem = {
        inventoryId: inventory.inventoryId,
        identifier: inventory.identifier,
        stockType: inventory.stockType,
        category: inventory.category,
        categoryCode: inventory.categoryCode,
        metalType: inventory.metalType,
        quantity: inventory.stockType === 'TAG' ? 1 : 1,
        weight: inventory.stockType === 'TAG' ? inventory.weight : inventory.weight,
        grossWeight: inventory.grossWeight,
        stoneWeight: inventory.stoneWeight || 0,
        rate: '',
        sellerName: inventory.sellerName,
        status: inventory.status,
        available: inventory.available,
      }

      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }))

      setSearchInput('')
      setSuggestions([])
      setShowSuggestions(false)
      setMessage(`Added ${suggestion.displayText} to cart`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add item')
    } finally {
      setLookupLoading(false)
    }
  }

  const handleQuantityChange = (index, quantity) => {
    const newQuantity = Math.max(1, parseInt(quantity) || 1)
    setFormData((prev) => {
      const newItems = [...prev.items]
      newItems[index].quantity = newQuantity
      return { ...prev, items: newItems }
    })
  }

  const handleWeightChange = (index, weight) => {
    const newWeight = Math.max(0, parseFloat(weight) || 0)
    setFormData((prev) => {
      const newItems = [...prev.items]
      newItems[index].weight = newWeight
      return { ...prev, items: newItems }
    })
  }

  const handleStoneWeightChange = (index, stoneWeight) => {
    const newStoneWeight = Math.max(0, parseFloat(stoneWeight) || 0)
    setFormData((prev) => {
      const newItems = [...prev.items]
      newItems[index].stoneWeight = newStoneWeight
      return { ...prev, items: newItems }
    })
  }

  const removeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const handleAddOldItem = (e) => {
    e.preventDefault()
    setError('')

    if (!oldItemForm.category.trim()) {
      setError('Category is required for old item')
      return
    }

    if (!oldItemForm.weight || parseFloat(oldItemForm.weight) <= 0) {
      setError('Weight is required and must be greater than 0')
      return
    }

    const newOldItem = {
      itemType: oldItemForm.itemType,
      metalType: oldItemForm.metalType,
      category: oldItemForm.category.toUpperCase(),
      weight: parseFloat(oldItemForm.weight),
      purity: oldItemForm.purity.toUpperCase(),
    }

    setFormData((prev) => ({
      ...prev,
      receivedItems: [...prev.receivedItems, newOldItem],
    }))

    setOldItemForm({
      itemType: 'OLD_ORNAMENT',
      metalType: 'GOLD',
      category: '',
      weight: '',
      purity: '',
    })

    setMessage('Old item added successfully')
  }

  const removeOldItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      receivedItems: prev.receivedItems.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!formData.customerName.trim()) {
      setError('Customer name is required')
      return
    }

    if (formData.items.length === 0 && formData.receivedItems.length === 0) {
      setError('Add at least one item to the sale')
      return
    }

    setLoading(true)

    try {
      // Prepare payload - only include relevant fields for each item
      const payload = {
        customerName: formData.customerName,
        date: formData.date,
        items: formData.items.map((item) => ({
          inventoryId: item.inventoryId,
          identifier: item.identifier,
          ...(item.stockType === 'TRAY' && {
            quantity: item.quantity,
            weight: item.weight,
            stoneWeight: item.stoneWeight,
          }),
          rate: item.rate,
        })),
        ...(formData.receivedItems.length > 0 && {
          receivedItems: formData.receivedItems,
        }),
      }

      await api.post('/inventory/sale-transactions', payload)
      setMessage('Sale completed successfully!')
      setFormData({
        customerName: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        receivedItems: [],
      })
      setSearchInput('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete sale')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = () => {
    const soldItemsWeight = formData.items.reduce((sum, item) => sum + (item.weight || 0), 0)
    const soldItemsStoneWeight = formData.items.reduce((sum, item) => sum + (item.stoneWeight || 0), 0)
    const receivedItemsWeight = formData.receivedItems.reduce((sum, item) => sum + (item.weight || 0), 0)

    return {
      items: formData.items.length,
      weight: soldItemsWeight.toFixed(3),
      stoneWeight: soldItemsStoneWeight.toFixed(3),
      receivedItems: formData.receivedItems.length,
      receivedWeight: receivedItemsWeight.toFixed(3),
    }
  }

  const totals = calculateTotals()

  const closePopup = () => {
    setMessage('')
    setError('')
  }

  return (
    <div className="sales-container">
      <div className="sales-header">
        <h1>Create Sale</h1>
        <p>Enter barcode, tag code, tray code, or category name to add items</p>
      </div>

      {(message || error) && (
        <div className="popup-backdrop" role="presentation" onClick={closePopup}>
          <div
            className={`feedback-popup ${error ? 'feedback-popup-error' : 'feedback-popup-success'}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sales-feedback-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="sales-feedback-title">{error ? 'Action Failed' : 'Success'}</h2>
            <p>{error || message}</p>
            <button type="button" className="btn btn-primary" onClick={closePopup}>
              OK
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="sales-form">
        {/* Customer Name */}
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="customerName">Customer Name *</label>
            <input
              id="customerName"
              type="text"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Sale Date *</label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Search / Add Item */}
        <div className="form-section">
          <label htmlFor="search">Add Item (Barcode / Tag Code / Tray Code / Category)</label>
          <div className="search-container">
            <input
              id="search"
              type="text"
              placeholder="Start typing to search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => searchInput && setShowSuggestions(true)}
              disabled={lookupLoading}
              className="search-input"
            />
            {lookupLoading && <span className="search-loading">Loading...</span>}

            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSearchSelect(suggestion)}
                  >
                    <div className="suggestion-main">{suggestion.displayText}</div>
                    <div className="suggestion-sub">
                      {suggestion.type === 'TAG' ? `Tag #${suggestion.tagId}` : suggestion.trayCode}
                      {suggestion.metalType && ` • ${suggestion.metalType}`}
                      {suggestion.quantity && ` • Qty: ${suggestion.quantity}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showSuggestions && searchInput && suggestions.length === 0 && (
              <div className="suggestions-empty">No items found</div>
            )}
          </div>
        </div>

        {/* Sale Items */}
        {formData.items.length > 0 && (
          <div className="form-section">
            <div className="items-header">
              <h3>Sale Items ({formData.items.length})</h3>
              <span className="items-summary">
                Total Weight: {totals.weight}g | Stone: {totals.stoneWeight}g
              </span>
            </div>

            <div className="items-table">
              <div className="items-table-header">
                <div className="col-identifier">Item</div>
                <div className="col-type">Type</div>
              <div className="col-category">Category</div>
              <div className="col-quantity">Qty</div>
              <div className="col-weight">Weight (g)</div>
              <div className="col-stone">Stone (g)</div>
              <div className="col-rate">Rate</div>
              <div className="col-action">Action</div>
            </div>

              {formData.items.map((item, index) => (
                <div key={index} className="items-table-row">
                  <div className="col-identifier">
                    {item.stockType === 'TAG' ? `Tag #${item.identifier}` : item.identifier}
                  </div>
                  <div className="col-type">{item.stockType}</div>
                  <div className="col-category">{item.category}</div>
                  <div className="col-quantity">
                    {item.stockType === 'TRAY' ? (
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        className="input-small"
                      />
                    ) : (
                      <span>{item.quantity}</span>
                    )}
                  </div>
                  <div className="col-weight">
                    {item.stockType === 'TRAY' ? (
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.weight}
                        onChange={(e) => handleWeightChange(index, e.target.value)}
                        className="input-small"
                      />
                    ) : (
                      <span>{item.weight}</span>
                    )}
                  </div>
                  <div className="col-stone">
                    {item.stockType === 'TRAY' ? (
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.stoneWeight}
                        onChange={(e) => handleStoneWeightChange(index, e.target.value)}
                        className="input-small"
                      />
                    ) : (
                      <span>{item.stoneWeight}</span>
                    )}
                  </div>
                  <div className="col-rate">
                    {item.metalType && item.metalType !== 'OTHERS' ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate}
                        onChange={(e) =>
                          setFormData((prev) => {
                            const newItems = [...prev.items]
                            newItems[index].rate = e.target.value
                            return { ...prev, items: newItems }
                          })
                        }
                        className="input-small"
                        placeholder="Optional"
                      />
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                  <div className="col-action">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="btn-remove"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-section">
          <h3>Add Old Item (For Return/Exchange)</h3>
          <div className="old-item-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="itemType">Item Type</label>
                <select
                  id="itemType"
                  value={oldItemForm.itemType}
                  onChange={(e) => setOldItemForm({ ...oldItemForm, itemType: e.target.value })}
                  className="input-field"
                >
                  <option value="OLD_ORNAMENT">Old Ornament</option>
                  <option value="RAW_METAL">Raw Metal</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="metalType">Metal Type</label>
                <select
                  id="metalType"
                  value={oldItemForm.metalType}
                  onChange={(e) => setOldItemForm({ ...oldItemForm, metalType: e.target.value })}
                  className="input-field"
                >
                  <option value="GOLD">Gold</option>
                  <option value="SILVER">Silver</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="oldCategory">Category / Name *</label>
                <input
                  id="oldCategory"
                  type="text"
                  placeholder="e.g., Ring, Bangle, Gold Bar"
                  value={oldItemForm.category}
                  onChange={(e) => setOldItemForm({ ...oldItemForm, category: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="oldWeight">Weight (g) *</label>
                <input
                  id="oldWeight"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={oldItemForm.weight}
                  onChange={(e) => setOldItemForm({ ...oldItemForm, weight: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="purity">Purity</label>
                <input
                  id="purity"
                  type="text"
                  placeholder="e.g., 916, 925"
                  value={oldItemForm.purity}
                  onChange={(e) => setOldItemForm({ ...oldItemForm, purity: e.target.value })}
                  className="input-field"
                />
              </div>

              <button
                type="button"
                onClick={handleAddOldItem}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-end' }}
              >
                Add Old Item
              </button>
            </div>
          </div>

          {formData.receivedItems.length > 0 && (
            <div className="old-items-list">
              <h4>Received Items ({formData.receivedItems.length})</h4>
              <div className="items-table">
                <div className="items-table-header">
                  <div className="col-type">Type</div>
                  <div className="col-metal">Metal</div>
                  <div className="col-category">Category</div>
                  <div className="col-weight">Weight (g)</div>
                  <div className="col-purity">Purity</div>
                  <div className="col-action">Action</div>
                </div>

                {formData.receivedItems.map((item, index) => (
                  <div key={index} className="items-table-row">
                    <div className="col-type">{item.itemType.replace('_', ' ')}</div>
                    <div className="col-metal">{item.metalType}</div>
                    <div className="col-category">{item.category}</div>
                    <div className="col-weight">{item.weight}</div>
                    <div className="col-purity">{item.purity || '-'}</div>
                    <div className="col-action">
                      <button
                        type="button"
                        onClick={() => removeOldItem(index)}
                        className="btn-remove"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={loading || (formData.items.length === 0 && formData.receivedItems.length === 0)}
            className="btn btn-primary"
          >
            {loading
              ? 'Processing...'
              : `Complete Sale (${formData.items.length} sold + ${formData.receivedItems.length} received)`}
          </button>
          {(formData.items.length > 0 || formData.receivedItems.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  customerName: formData.customerName,
                  date: formData.date,
                  items: [],
                  receivedItems: [],
                })
                setSearchInput('')
              }}
              className="btn btn-secondary"
            >
              Clear All
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default SalesPage
