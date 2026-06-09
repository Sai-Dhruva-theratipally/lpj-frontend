import { useEffect, useState } from 'react'
import '../styles/PastBills.css'

function PastBillsPage({ api }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [bills, setBills] = useState([])
  const [selectedBill, setSelectedBill] = useState(null)
  const [billDetails, setBillDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [selectedReceivedItems, setSelectedReceivedItems] = useState([])
  const [returnLoading, setReturnLoading] = useState(false)

  // Fetch bill suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchTerm.trim()) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      try {
        const response = await api.get('/inventory/bills/search', {
          params: { search: searchTerm, limit: 10 },
        })
        setSuggestions(response.data.data || [])
        setShowSuggestions(true)
      } catch (err) {
        console.error('Error fetching bills:', err)
        setSuggestions([])
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, api])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await api.get('/inventory/bills/search', {
        params: { search: searchTerm },
      })
      setBills(response.data.data || [])
      if ((response.data.data || []).length === 0) {
        setMessage('No bills found')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch bills')
    } finally {
      setLoading(false)
    }
  }

  const handleBillSelect = async (bill) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get(`/inventory/bills/${bill.saleId}`)
      setBillDetails(response.data.data)
      setSelectedItems([])
      setSelectedReceivedItems([])
    } catch (err) {
      console.error('Error fetching bill details:', err)
      setError(err.response?.data?.message || 'Failed to fetch bill details')
      setBillDetails(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionSelect = async (suggestion) => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get(`/inventory/bills/${suggestion.saleId}`)
      setBillDetails(response.data.data)
      setBills([suggestion])
      setSelectedBill(suggestion.saleId)
      setSearchTerm('')
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedItems([])
      setSelectedReceivedItems([])
    } catch (err) {
      console.error('Error fetching bill details:', err)
      setError(err.response?.data?.message || 'Failed to fetch bill details')
      setBillDetails(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleItemSelection = (index) => {
    setSelectedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const toggleReceivedItemSelection = (index) => {
    setSelectedReceivedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const handleReturnItems = async () => {
    if (selectedItems.length === 0 && selectedReceivedItems.length === 0) {
      setError('Please select at least one item to return or cancel')
      return
    }

    setReturnLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await api.post('/inventory/bills/return', {
        saleId: billDetails.saleId,
        itemIndicesToReturn: selectedItems,
        receivedItemIndicesToCancel: selectedReceivedItems,
      })

      const successMessage = response.data?.data?.message || response.data?.message || 'Items processed successfully'
      setMessage(successMessage)
      setBillDetails(null)
      setBills([])
      setSelectedItems([])
      setSelectedReceivedItems([])
      setSearchTerm('')
    } catch (err) {
      console.error('Error processing items:', err)
      setError(err.response?.data?.message || 'Failed to process items')
    } finally {
      setReturnLoading(false)
    }
  }

  const backToBills = () => {
    setBillDetails(null)
    setSelectedItems([])
    setSelectedReceivedItems([])
  }

  const statusLabel = (status) => {
    if (status === 'RETURNED') return 'Returned'
    if (status === 'PARTIALLY_RETURNED') return 'Partially Returned'
    return 'Active'
  }

  const closePopup = () => {
    setMessage('')
    setError('')
  }

  return (
    <div className="past-bills-container">
      <div className="past-bills-header">
        <h1>View Past Bills</h1>
        <p>Search bills by bill number, customer name, or category</p>
      </div>

      {(message || error) && (
        <div className="popup-backdrop" role="presentation" onClick={closePopup}>
          <div
            className={`feedback-popup ${error ? 'feedback-popup-error' : 'feedback-popup-success'}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-popup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="feedback-popup-title">{error ? 'Action Failed' : 'Success'}</h2>
            <p>{error || message}</p>
            <button type="button" className="btn btn-primary" onClick={closePopup}>
              OK
            </button>
          </div>
        </div>
      )}

      {!billDetails ? (
        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search bill number, customer, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm && setShowSuggestions(true)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button onClick={handleSearch} disabled={loading} className="btn btn-primary">
              {loading ? 'Searching...' : 'Search'}
            </button>

            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className="suggestion-main">{suggestion.saleId}</div>
                    <div className="suggestion-sub">
                      {suggestion.customer} • {suggestion.date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {bills.length > 0 && (
            <div className="bills-list">
              <h3>Search Results ({bills.length})</h3>
              <div className="bills-table">
                <div className="bills-table-header">
                  <div className="col-billid">Bill #</div>
                  <div className="col-customer">Customer</div>
                  <div className="col-date">Date</div>
                  <div className="col-status">Status</div>
                  <div className="col-items">Sold Items</div>
                  <div className="col-weight">Weight (g)</div>
                  <div className="col-received">Received (g)</div>
                  <div className="col-action">Action</div>
                </div>

                {bills.map((bill, index) => (
                  <div key={index} className="bills-table-row">
                    <div className="col-billid">{bill.saleId}</div>
                    <div className="col-customer">{bill.customer}</div>
                    <div className="col-date">{bill.date}</div>
                    <div className="col-status">
                      <span className={`bill-status ${String(bill.status || 'ACTIVE').toLowerCase()}`}>
                        {statusLabel(bill.status)}
                      </span>
                    </div>
                    <div className="col-items">{bill.soldItems}</div>
                    <div className="col-weight">{bill.totalWeight}</div>
                    <div className="col-received">{bill.receivedWeight}</div>
                    <div className="col-action">
                      <button
                        onClick={() => handleBillSelect(bill)}
                        disabled={loading}
                        className="btn-view"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bill-details-section">
          <div className="details-header">
            <button onClick={backToBills} className="btn btn-secondary">
              ← Back to Bills
            </button>
            <h2>{billDetails.saleId}</h2>
            <span className={`bill-status ${String(billDetails.status || 'ACTIVE').toLowerCase()}`}>
              {statusLabel(billDetails.status)}
            </span>
          </div>

          <div className="bill-info">
            <div className="info-item">
              <label>Customer Name:</label>
              <span>{billDetails.customerName}</span>
            </div>
            <div className="info-item">
              <label>Date:</label>
              <span>{billDetails.date}</span>
            </div>
          </div>

          <div className="bill-items">
            <h3>Sold Items ({billDetails.soldItems.length})</h3>
            {billDetails.soldItems.length > 0 ? (
              <div className="items-table">
                <div className="items-table-header">
                  <div className="col-select">Select</div>
                  <div className="col-type">Type</div>
                  <div className="col-identifier">Item</div>
                  <div className="col-metal">Metal</div>
                  <div className="col-category">Category</div>
                  <div className="col-qty">Qty</div>
                  <div className="col-weight">Weight (g)</div>
                  <div className="col-stone">Stone (g)</div>
                  <div className="col-seller">Seller</div>
                </div>

                {billDetails.soldItems.map((item, index) => (
                  <div key={index} className={`items-table-row ${item.isReturned ? 'returned-item' : ''}`}>
                    <div className="col-select">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(index)}
                        onChange={() => toggleItemSelection(index)}
                        disabled={item.isReturned}
                      />
                    </div>
                    <div className="col-type">{item.stockType}</div>
                    <div className="col-identifier">{item.identifier}</div>
                    <div className="col-metal">{item.metalType}</div>
                    <div className="col-category">{item.category}</div>
                    <div className="col-qty">{item.quantity}</div>
                    <div className="col-weight">{item.weight}</div>
                    <div className="col-stone">{item.stoneWeight}</div>
                    <div className="col-seller">{item.seller}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-items">No sold items in this bill</div>
            )}
          </div>

          {billDetails.receivedItems.length > 0 && (
            <div className="received-items">
              <h3>Received Items ({billDetails.receivedItems.length})</h3>
              <div className="items-table">
                <div className="items-table-header">
                  <div className="col-select">Select</div>
                  <div className="col-type">Type</div>
                  <div className="col-metal">Metal</div>
                  <div className="col-category">Category</div>
                  <div className="col-weight">Weight (g)</div>
                  <div className="col-purity">Purity</div>
                </div>

                {billDetails.receivedItems.map((item, index) => (
                  <div key={index} className={`items-table-row ${item.isCancelled ? 'cancelled-item' : ''}`}>
                    <div className="col-select">
                      <input
                        type="checkbox"
                        checked={selectedReceivedItems.includes(index)}
                        onChange={() => toggleReceivedItemSelection(index)}
                        disabled={item.isCancelled}
                      />
                    </div>
                    <div className="col-type">{item.itemType.replace('_', ' ')}</div>
                    <div className="col-metal">{item.metalType}</div>
                    <div className="col-category">{item.category}</div>
                    <div className="col-weight">{item.weight}</div>
                    <div className="col-purity">{item.purity || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bill-totals">
            <h3>Bill Summary</h3>
            <div className="totals-grid">
              <div className="total-item">
                <label>Total Sold Items:</label>
                <span>{billDetails.totals.soldItems}</span>
              </div>
              <div className="total-item">
                <label>Total Sold Weight:</label>
                <span>{billDetails.totals.soldWeight}g</span>
              </div>
              <div className="total-item">
                <label>Total Stone Weight:</label>
                <span>{billDetails.totals.soldStoneWeight}g</span>
              </div>
              <div className="total-item">
                <label>Total Received Items:</label>
                <span>{billDetails.totals.receivedItems}</span>
              </div>
              <div className="total-item">
                <label>Total Received Weight:</label>
                <span>{billDetails.totals.receivedWeight}g</span>
              </div>
            </div>
          </div>

          {(billDetails.soldItems.length > 0 || billDetails.receivedItems.length > 0) && (
            <div className="return-section">
              <h3>Return or Cancel Items</h3>
              <p className="info-text">
                {selectedItems.length} sold item(s) selected for return{selectedReceivedItems.length > 0 && `, ${selectedReceivedItems.length} received item(s) selected for cancel`}
                {!selectedItems.length && selectedReceivedItems.length > 0 && `, ${selectedReceivedItems.length} received item(s) selected for cancel`}
                {(billDetails.soldItems.some(item => item.isReturned) || billDetails.receivedItems.some(item => item.isCancelled)) && (
                  <span className="returned-note"> (Items marked with * are already returned/cancelled)</span>
                )}
              </p>
              <button
                onClick={handleReturnItems}
                disabled={(selectedItems.length === 0 && selectedReceivedItems.length === 0) || returnLoading}
                className="btn btn-danger"
              >
                {returnLoading ? 'Processing...' : 'Process Selected Items'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PastBillsPage
