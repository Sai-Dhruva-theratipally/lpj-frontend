import axios from 'axios'
import { useEffect, useMemo, useRef, useState } from 'react'
import DocumentsPage from './pages/Documents'
import PastBillsPage from './pages/PastBills'
import ReportsPage from './pages/Reports'
import { printZpl } from './services/zebraBrowserPrint'
import './App.css'

const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000/api`

const emptyStockHeader = {
  sellerName: '',
  date: getTodayInputDate(),
}

const emptyStockItem = {
  metalType: 'GOLD',
  stockType: 'TAG',
  categoryInput: '',
  category: '',
  categoryCode: '',
  quantity: 1,
  weight: '',
  stoneWeight: 0,
}

const emptySaleHeader = {
  customerName: '',
  date: getTodayInputDate(),
}

const emptySaleEntry = {
  identifier: '',
  inventoryId: '',
  stockType: '',
  category: '',
  metalType: '',
  quantity: 1,
  weight: '',
  stoneWeight: 0,
  availableQuantity: 0,
  availableWeight: 0,
  availableStoneWeight: 0,
  available: false,
}

const emptyReceivedItem = {
  itemType: 'RAW_METAL',
  metalType: 'GOLD',
  category: '',
  weight: '',
  purity: '',
}

const emptyTagFilters = {
  search: '',
  metalType: '',
  category: '',
  sellerName: '',
  status: '',
  date: '',
}

const emptyManualTagPrint = {
  category: '',
  code: '',
  quantity: 1,
}

const emptyReprintTagFilters = {
  tagCode: '',
  metalType: 'GOLD',
  category: '',
  status: '',
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('lpj_token') || '')
  const [page, setPage] = useState('home')
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' })
  const [stockHeader, setStockHeader] = useState(emptyStockHeader)
  const [stockItem, setStockItem] = useState(emptyStockItem)
  const [stockItems, setStockItems] = useState([])
  const [editingStockIndex, setEditingStockIndex] = useState(null)
  const [showStockConfirm, setShowStockConfirm] = useState(false)
  const [saleHeader, setSaleHeader] = useState(emptySaleHeader)
  const [saleEntry, setSaleEntry] = useState(emptySaleEntry)
  const [saleItems, setSaleItems] = useState([])
  const [saleReceivedItem, setSaleReceivedItem] = useState(emptyReceivedItem)
  const [saleReceivedItems, setSaleReceivedItems] = useState([])
  const [showSaleConfirm, setShowSaleConfirm] = useState(false)
  const [manualTagPrint, setManualTagPrint] = useState(emptyManualTagPrint)
  const [tagFilters, setTagFilters] = useState(emptyTagFilters)
  const [reprintTagFilters, setReprintTagFilters] = useState(emptyReprintTagFilters)
  const [reprintTags, setReprintTags] = useState([])
  const [trays, setTrays] = useState([])
  const [tags, setTags] = useState([])
  const [categories, setCategories] = useState([])
  const [sellers, setSellers] = useState([])
  const [customers, setCustomers] = useState([])
  const [resetPassword, setResetPassword] = useState('')
  const [resetStockForm, setResetStockForm] = useState({ password: '', stockType: 'TAG' })
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [metalRates, setMetalRates] = useState(null)
  const [metalRatesLoading, setMetalRatesLoading] = useState(false)
  const [metalRatesError, setMetalRatesError] = useState('')
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!message && !error) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setMessage('')
      setError('')
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [message, error])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const api = useMemo(() => {
    return axios.create({
      baseURL: API_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  }, [token])

  const request = async (path, options = {}) => {
    const response = await api.request({ url: path, ...options })
    return response.data
  }

  const runAction = async (action, successMessage) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      await action()
      setMessage(successMessage)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTrays = async () => {
    const data = await request('/inventory/trays?limit=100')
    setTrays(data.data.items)
  }

  const loadTags = async (filters = tagFilters) => {
    const query = new URLSearchParams({ limit: '100' })

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        query.set(key, value)
      }
    })

    const data = await request(`/inventory/tags?${query.toString()}`)
    setTags(data.data.items)
  }

  const loadReprintTags = async (filters = reprintTagFilters) => {
    if (!filters.metalType) {
      throw new Error('Metal is required')
    }

    if (!filters.category) {
      throw new Error('Category is required')
    }

    const query = new URLSearchParams({
      limit: '100',
      metalType: filters.metalType,
      category: filters.category,
    })

    if (filters.status) {
      query.set('status', filters.status)
    }

    const data = await request(`/inventory/tags?${query.toString()}`)
    setReprintTags(data.data.items)
  }

  const loadSellers = async () => {
    const data = await request('/sellers')
    setSellers(data.data)
  }

  const loadCategories = async () => {
    const data = await request('/categories')
    setCategories(data.data)
  }

  const loadCustomers = async () => {
    const data = await request('/reports/lookups/customers')
    setCustomers(data.data)
  }

  const loadMetalRates = async () => {
    setMetalRatesLoading(true)
    setMetalRatesError('')

    try {
      const data = await request('/metal-rates')
      setMetalRates(data)
    } catch (err) {
      setMetalRatesError(err.response?.data?.message || err.message)
    } finally {
      setMetalRatesLoading(false)
    }
  }

  const updateMetalRates = async () => {
    setMetalRatesLoading(true)
    setMetalRatesError('')
    setError('')
    setMessage('')

    try {
      const data = await request('/metal-rates/update', { method: 'POST' })
      setMetalRates(data)
      setMessage('Metal rates updated')
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message
      setMetalRatesError(errorMessage)
      setError(errorMessage)
    } finally {
      setMetalRatesLoading(false)
    }
  }

  const refreshData = async () => {
    await Promise.all([loadTrays(), loadTags(), loadSellers(), loadCategories(), loadCustomers()])
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!token) {
      return
    }

    Promise.all([refreshData(), loadMetalRates()]).catch((err) => setError(err.response?.data?.message || err.message))
  }, [token])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Helper function to convert Date object to YYYY-MM-DD format
  const formatDateToInputValue = (dateObj) => {
    return dateObj.toISOString().slice(0, 10)
  }

  // Reset stock form with today's date when navigating to add-stock page
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (page === 'add-stock') {
      newStockEntry()
    }
  }, [page])

  // Reset sale form with current date when navigating to sales page
  useEffect(() => {
    if (page === 'sales') {
      setSaleHeader({
        customerName: '',
        date: formatDateToInputValue(currentDateTime),
      })
      setSaleEntry(emptySaleEntry)
      setSaleItems([])
      setSaleReceivedItem(emptyReceivedItem)
      setSaleReceivedItems([])
    }
  }, [page])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const ensureSeller = async (sellerName) => {
    const trimmedName = sellerName?.trim()

    if (!trimmedName) {
      throw new Error('Seller name is required')
    }

    const existingSeller = findLookup(sellers, trimmedName)

    if (existingSeller) {
      return existingSeller
    }

    if (!window.confirm(`Create new seller "${trimmedName}"?`)) {
      throw new Error('Select an existing seller or confirm new seller creation.')
    }

    const data = await request('/sellers', {
      method: 'POST',
      data: { name: trimmedName },
    })
    const seller = data.data
    setSellers((current) => mergeLookupItem(current, seller))
    setStockHeader((current) => ({ ...current, sellerName: seller.name }))
    return seller
  }

  const ensureCategory = async (category, stockType) => {
    const trimmedInput = category.categoryInput?.trim()

    if (!trimmedInput) {
      throw new Error('Category or tray value is required')
    }

    const existingCategory = findCategory(categories, trimmedInput, stockType, category.metalType)

    if (existingCategory) {
      return existingCategory
    }

    if (!window.confirm(`Create new ${stockType === 'TRAY' ? 'tray category' : 'category'} "${trimmedInput}"?`)) {
      throw new Error('Select an existing category or confirm new category creation.')
    }

    const categoryCode = window.prompt(`Enter category code for "${trimmedInput}"`)
    const trimmedCode = categoryCode?.trim()

    if (!trimmedCode) {
      throw new Error('Category code is required for new category')
    }

    const duplicateCode = categories.find(
      (item) => item.categoryCode?.toLowerCase() === trimmedCode.toLowerCase(),
    )

    if (duplicateCode) {
      throw new Error(`Category code already exists for ${duplicateCode.name}`)
    }

    const data = await request('/categories', {
      method: 'POST',
      data: {
        name: trimmedInput,
        stockType,
        metalType: category.metalType,
        categoryCode: trimmedCode,
      },
    })
    const createdCategory = data.data
    setCategories((current) => mergeCategoryItem(current, createdCategory))
    setStockItem((current) => ({
      ...current,
      categoryInput: createdCategory.categoryCode || createdCategory.name,
      category: createdCategory.name,
      categoryCode: createdCategory.categoryCode,
      metalType: createdCategory.metalType,
    }))
    return createdCategory
  }

  const ensureCustomer = async (customerName) => {
    const trimmedName = customerName?.trim()

    if (!trimmedName) {
      throw new Error('Customer name is required')
    }

    const existingCustomer = findLookup(customers, trimmedName)

    if (existingCustomer) {
      return existingCustomer
    }

    if (!window.confirm(`Create new customer "${trimmedName}"?`)) {
      throw new Error('Select an existing customer or confirm new customer creation.')
    }

    const customer = { name: trimmedName }
    setCustomers((current) => mergeLookupItem(current, customer))
    setSaleHeader((current) => ({ ...current, customerName: customer.name }))
    return customer
  }

  const login = (event) => {
    event.preventDefault()
    runAction(async () => {
      const data = await request('/auth/login', {
        method: 'POST',
        data: loginForm,
      })

      localStorage.setItem('lpj_token', data.data.token)
      setToken(data.data.token)
    }, 'Logged in successfully')
  }

  const logout = () => {
    localStorage.removeItem('lpj_token')
    setToken('')
    setPage('home')
    setTrays([])
    setTags([])
    setCategories([])
    setSellers([])
    setCustomers([])
  }

  function newStockEntry() {
    setStockHeader({
      sellerName: '',
      date: formatDateToInputValue(currentDateTime),
    })
    setStockItem(emptyStockItem)
    setStockItems([])
    setEditingStockIndex(null)
  }

  const metalTypeRef = useRef(null)

  const addStockItemToList = (event) => {
    event.preventDefault()
    runAction(async () => {
      const seller = await ensureSeller(stockHeader.sellerName)
      const category = await ensureCategory(stockItem, stockItem.stockType)
      const grossWeight = Number(stockItem.weight)
      const stoneWeight = Number(stockItem.stoneWeight || 0)

      if (!Number.isFinite(grossWeight) || grossWeight <= 0) {
        throw new Error('Gross weight must be greater than 0')
      }

      if (!Number.isFinite(stoneWeight) || stoneWeight < 0) {
        throw new Error('Stone weight must be greater than or equal to 0')
      }

      const item = {
        ...stockItem,
        categoryInput: stockItem.categoryInput,
        category: category.name,
        categoryCode: category.categoryCode,
        metalType: category.metalType,
        quantity: Number(stockItem.quantity),
        weight: grossWeight,
        stoneWeight,
        sellerName: seller.name,
        date: stockHeader.date,
      }

      if (editingStockIndex === null) {
        setStockItems((current) => [...current, item])
      } else {
        setStockItems((current) => current.map((currentItem, index) => (index === editingStockIndex ? item : currentItem)))
        setEditingStockIndex(null)
      }

      setStockItem({ ...emptyStockItem, metalType: stockItem.metalType, stockType: stockItem.stockType })
      
      // Focus back to Metal Type field for keyboard optimization
      setTimeout(() => {
        if (metalTypeRef.current) {
          metalTypeRef.current.focus()
        }
      }, 0)
    }, editingStockIndex === null ? 'Item added to stock list' : 'Stock list item updated')
  }

  const editStockItem = (index) => {
    const item = stockItems[index]
    setStockItem({
      stockType: item.stockType,
      metalType: item.metalType,
      categoryInput: item.categoryCode || item.category,
      category: item.category,
      categoryCode: item.categoryCode,
      quantity: item.quantity,
      weight: item.weight,
      stoneWeight: item.stoneWeight ?? 0,
    })
    setEditingStockIndex(index)
  }

  const removeStockItem = (index) => {
    setStockItems((current) => current.filter((item, itemIndex) => itemIndex !== index))

    if (editingStockIndex === index) {
      setEditingStockIndex(null)
      setStockItem(emptyStockItem)
    }
  }

  const prepareStockFinalSubmit = () => {
    runAction(async () => {
      const seller = await ensureSeller(stockHeader.sellerName)
      setStockHeader((current) => ({ ...current, sellerName: seller.name }))
      setShowStockConfirm(true)
    }, '')
  }

  const confirmStockSave = () => {
    runAction(async () => {
      const seller = await ensureSeller(stockHeader.sellerName)
      const data = await request('/inventory/stock-transactions', {
        method: 'POST',
        data: {
          ...stockHeader,
          sellerName: seller.name,
          items: stockItems.map((stockListItem) => ({
            stockType: stockListItem.stockType,
            metalType: stockListItem.metalType,
            categoryInput: stockListItem.categoryCode || stockListItem.categoryInput || stockListItem.category,
            category: stockListItem.category,
            categoryCode: stockListItem.categoryCode,
            quantity: stockListItem.quantity,
            weight: stockListItem.weight,
            stoneWeight: stockListItem.stoneWeight ?? 0,
          })),
        },
      })
      const tagPrintItems = (data.data.items || [])
        .filter((item) => item.stockType === 'TAG')
        .map((item) => ({ ...item, sellerName: item.sellerName || data.data.sellerName || seller.name }))
      newStockEntry()
      setShowStockConfirm(false)
      await refreshData()

      if (tagPrintItems.length > 0 && window.confirm(`Print ${tagPrintItems.length} newly added tag label(s)?`)) {
        await printBatchItems(tagPrintItems)
      }
    }, 'Stock transaction saved')
  }

  const printBatchItems = (items, successMessage = 'Labels sent to Zebra printer') => {
    if (!items.length) {
      setError('No labels selected for printing')
      return
    }

    runAction(async () => {
      const data = await request('/print/batch', {
        method: 'POST',
        data: {
          items: items.map(getPrintPayload),
        },
      })
      await printZpl(data.data.zpl)
    }, successMessage)
  }

  const printSingleInventoryItem = (item) => {
    runAction(async () => {
      const data = await request('/print/tag', {
        method: 'POST',
        data: getPrintPayload(item),
      })
      await printZpl(data.data.zpl)
    }, '')
  }

  const applyReprintTagFilters = (event) => {
    event.preventDefault()
    runAction(() => loadReprintTags(reprintTagFilters), 'Tags loaded')
  }

  const printReprintTagByCode = (event) => {
    event.preventDefault()
    const tagCode = String(reprintTagFilters.tagCode || '').trim()

    runAction(async () => {
      if (!tagCode) {
        throw new Error('Tag code is required')
      }

      const data = await request('/print/tag', {
        method: 'POST',
        data: { tagId: tagCode },
      })
      await printZpl(data.data.zpl)
    }, 'Tag label sent to Zebra printer')
  }

  const clearReprintTags = () => {
    setReprintTagFilters(emptyReprintTagFilters)
    setReprintTags([])
  }

  const printManualTextTags = (event) => {
    event.preventDefault()

    runAction(async () => {
      if (!manualTagPrint.category.trim()) {
        throw new Error('Category is required')
      }

      if (!/^\d+$/.test(String(manualTagPrint.code).trim())) {
        throw new Error('Code must be numeric')
      }

      const quantity = Number(manualTagPrint.quantity)

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        throw new Error('Quantity must be between 1 and 100')
      }

      const data = await request('/print/manual-text-tags', {
        method: 'POST',
        data: {
          category: manualTagPrint.category.trim(),
          code: String(manualTagPrint.code).trim(),
          quantity,
        },
      })
      await printZpl(data.data.zpl)
    }, 'Manual tag labels sent to Zebra printer')
  }

  const lookupSaleProduct = (event) => {
    event.preventDefault()
    runAction(async () => {
      const submittedIdentifier = event.currentTarget.elements.identifier?.value?.trim() || saleEntry.identifier

      if (!submittedIdentifier) {
        throw new Error('Barcode or inventory id is required')
      }

      const data = await request(`/inventory/lookup/${encodeURIComponent(submittedIdentifier)}`)
      const item = data.data
      const defaultQuantity = item.stockType === 'TAG' ? 1 : Number(item.quantity)
      const defaultWeight = Number(item.weight)
      const defaultStoneWeight = 0

      setSaleEntry({
        identifier: String(item.identifier),
        inventoryId: item.inventoryId,
        stockType: item.stockType,
        category: item.category,
        categoryCode: item.categoryCode,
        metalType: item.metalType,
        quantity: defaultQuantity,
        weight: defaultWeight,
        stoneWeight: defaultStoneWeight,
        availableQuantity: item.quantity,
        availableWeight: item.weight,
        availableStoneWeight: item.stoneWeight || 0,
        available: item.available,
      })
    }, 'Product details loaded')
  }

  const addSaleItemToList = (event) => {
    event.preventDefault()

    if (!saleEntry.available) {
      setError('Selected inventory is not available')
      return
    }

    const quantity = Number(saleEntry.quantity)
    const weight = Number(saleEntry.weight)
    const stoneWeight = Number(saleEntry.stoneWeight || 0)

    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Gross weight must be greater than 0')
      return
    }

    if (!Number.isFinite(stoneWeight) || stoneWeight < 0) {
      setError('Stone weight must be greater than or equal to 0')
      return
    }

    if (saleEntry.stockType === 'TAG' && quantity !== 1) {
      setError('Tag sale quantity must be 1')
      return
    }

    if (saleEntry.stockType === 'TRAY' && quantity > saleEntry.availableQuantity) {
      setError('Sale quantity cannot exceed tray stock')
      return
    }

    if (saleEntry.stockType === 'TRAY' && weight > saleEntry.availableWeight) {
      setError('Sale gross weight cannot exceed tray stock')
      return
    }

    if (saleEntry.stockType === 'TRAY' && stoneWeight > saleEntry.availableStoneWeight) {
      setError('Sale stone weight cannot exceed tray stock')
      return
    }

    setSaleItems((current) => [...current, { ...saleEntry, quantity, weight, stoneWeight }])
    setSaleEntry(emptySaleEntry)
    setMessage('Item added to sale list')
    setError('')
  }

  const removeSaleItem = (index) => {
    setSaleItems((current) => current.filter((item, itemIndex) => itemIndex !== index))
  }

  const addReceivedItemToSale = (event) => {
    event.preventDefault()

    const category = saleReceivedItem.category.trim()
    const weight = Number(saleReceivedItem.weight)
    const purity = saleReceivedItem.purity.trim()

    if (!category) {
      setError('Received item category is required')
      setMessage('')
      return
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Received item weight must be greater than 0')
      setMessage('')
      return
    }

    if (saleReceivedItem.itemType === 'OLD_ORNAMENT' && !purity) {
      setError('Purity is required for old ornaments')
      setMessage('')
      return
    }

    setSaleReceivedItems((current) => [
      ...current,
      {
        ...saleReceivedItem,
        category,
        weight,
        purity: saleReceivedItem.itemType === 'OLD_ORNAMENT' ? purity : '',
      },
    ])
    setSaleReceivedItem(emptyReceivedItem)
    setError('')
    setMessage('Received item added to sale')
  }

  const removeReceivedItemFromSale = (index) => {
    setSaleReceivedItems((current) => current.filter((item, itemIndex) => itemIndex !== index))
  }

  const prepareSaleFinalSubmit = () => {
    runAction(async () => {
      const customer = await ensureCustomer(saleHeader.customerName)
      setSaleHeader((current) => ({ ...current, customerName: customer.name }))
      setShowSaleConfirm(true)
    }, '')
  }

  const confirmSaleSave = () => {
    runAction(async () => {
      const customer = await ensureCustomer(saleHeader.customerName)
      await request('/inventory/sale-transactions', {
        method: 'POST',
        data: {
          ...saleHeader,
          customerName: customer.name,
          items: saleItems.map((item) => ({
            inventoryId: item.inventoryId,
            identifier: item.identifier,
            quantity: item.quantity,
            weight: item.weight,
            stoneWeight: item.stoneWeight ?? 0,
          })),
          receivedItems: saleReceivedItems.map((item) => ({
            itemType: item.itemType,
            metalType: item.metalType,
            category: item.category,
            weight: item.weight,
            purity: item.itemType === 'OLD_ORNAMENT' ? item.purity : '',
          })),
        },
      })
      setSaleHeader(emptySaleHeader)
      setSaleEntry(emptySaleEntry)
      setSaleItems([])
      setSaleReceivedItem(emptyReceivedItem)
      setSaleReceivedItems([])
      setShowSaleConfirm(false)
      await refreshData()
    }, 'Sale transaction saved')
  }

  const applyTagFilters = (event) => {
    event.preventDefault()
    runAction(() => loadTags(tagFilters), 'Tag list refreshed')
  }

  const clearTagFilters = () => {
    setTagFilters(emptyTagFilters)
    runAction(() => loadTags(emptyTagFilters), 'Tag filters cleared')
  }

  const resetStock = (event) => {
    event.preventDefault()

    if (!window.confirm(`This will clear ${resetStockForm.stockType} stock and matching transaction records. Continue?`)) {
      return
    }

    runAction(async () => {
      await request('/admin/reset-stock', {
        method: 'POST',
        data: resetStockForm,
      })
      setResetStockForm({ password: '', stockType: resetStockForm.stockType })
      await refreshData()
    }, 'Stock reset completed')
  }

  const resetDatabase = (event) => {
    event.preventDefault()

    if (!window.confirm('This will delete all database data and recreate the default admin. Continue?')) {
      return
    }

    runAction(async () => {
      await request('/admin/reset-database', {
        method: 'POST',
        data: { password: resetPassword },
      })
      setResetPassword('')
      logout()
    }, 'Database reset completed')
  }

  const changePassword = (event) => {
    event.preventDefault()

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setError('New password and confirmation do not match')
      setMessage('')
      return
    }

    runAction(async () => {
      await request('/admin/change-password', {
        method: 'POST',
        data: {
          currentPassword: changePasswordForm.currentPassword,
          newPassword: changePasswordForm.newPassword,
        },
      })
      setChangePasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    }, 'Password changed successfully')
  }

  if (!token) {
    return (
      <main className="page narrow">
        <section className="panel">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ color: 'var(--heading)', marginBottom: '8px', fontFamily: "Cambria, Constantia, Georgia, 'Times New Roman', serif", fontWeight: 700 }}>Lakshmi Prasanna Jewellers</h1>
            <p style={{ color: 'var(--muted-text)', fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>Admin Portal</p>
          </div>
          <form onSubmit={login} className="form">
            <label>
              Username
              <input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
              />
            </label>
            <button disabled={loading}>Login</button>
          </form>
          <Status message={message} error={error} />
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="topbar-left">
          <img src="logo-removebg-preview (2).png" alt="Lakshmi Prasanna Jewellers" className="topbar-logo" onError={(e) => { e.target.style.display = 'none' }} />
          <div className="topbar-branding">
            <h1>Lakshmi Prasanna Jewellers</h1>
            <p>Inventory Management</p>
          </div>
        </div>
        <MetalRateTicker rates={metalRates} loading={metalRatesLoading} error={metalRatesError} onUpdate={updateMetalRates} />
        <HeaderClock value={currentDateTime} />
        <button onClick={logout}>Logout</button>
      </header>

      {page !== 'home' && (
        <button className="secondary" onClick={() => setPage('home')} style={{ marginBottom: '20px' }}>
          &lt; Back
        </button>
      )}

      <Status message={message} error={error} />

      {page === 'home' && (
        <HomePage
          setPage={setPage}
          resetStockForm={resetStockForm}
          setResetStockForm={setResetStockForm}
          resetStock={resetStock}
          resetPassword={resetPassword}
          setResetPassword={setResetPassword}
          resetDatabase={resetDatabase}
          changePasswordForm={changePasswordForm}
          setChangePasswordForm={setChangePasswordForm}
          changePassword={changePassword}
        />
      )}

      {page === 'add-stock' && (
        <UnifiedStockPage
          header={stockHeader}
          setHeader={setStockHeader}
          item={stockItem}
          setItem={setStockItem}
          items={stockItems}
          categories={categories}
          sellers={sellers}
          editingIndex={editingStockIndex}
          onSubmitItem={addStockItemToList}
          onEditItem={editStockItem}
          onRemoveItem={removeStockItem}
          onNewEntry={newStockEntry}
          onFinalSubmit={prepareStockFinalSubmit}
          loading={loading}
          metalTypeRef={metalTypeRef}
        />
      )}

      {page === 'sales' && (
        <UnifiedSalesPage
          header={saleHeader}
          setHeader={setSaleHeader}
          customers={customers}
          entry={saleEntry}
          setEntry={setSaleEntry}
          items={saleItems}
          receivedItem={saleReceivedItem}
          setReceivedItem={setSaleReceivedItem}
          receivedItems={saleReceivedItems}
          categories={categories}
          onLookup={lookupSaleProduct}
          onAddItem={addSaleItemToList}
          onRemoveItem={removeSaleItem}
          onAddReceivedItem={addReceivedItemToSale}
          onRemoveReceivedItem={removeReceivedItemFromSale}
          onFinalSubmit={prepareSaleFinalSubmit}
          loading={loading}
          api={api}
        />
      )}

      {page === 'manual-tag-print' && (
        <ManualTagPrintPage
          form={manualTagPrint}
          setForm={setManualTagPrint}
          onSubmit={printManualTextTags}
          onClear={() => setManualTagPrint(emptyManualTagPrint)}
          loading={loading}
        />
      )}

      {page === 'reprint-tags' && (
        <ReprintTagsPage
          filters={reprintTagFilters}
          setFilters={setReprintTagFilters}
          tags={reprintTags}
          categories={categories}
          onApply={applyReprintTagFilters}
          onPrintTagCode={printReprintTagByCode}
          onClear={clearReprintTags}
          onPrint={printSingleInventoryItem}
          onPrintAll={() => printBatchItems(reprintTags, 'Reprint labels sent to Zebra printer')}
          onClearResults={() => setReprintTags([])}
          loading={loading}
        />
      )}

      {page === 'trays' && <TrayInventoryPage trays={trays} refresh={() => runAction(loadTrays, 'Trays refreshed')} />}

      {page === 'tags' && (
        <TagInventoryPage
          tags={tags}
          filters={tagFilters}
          setFilters={setTagFilters}
          categories={categories}
          sellers={sellers}
          applyFilters={applyTagFilters}
          clearFilters={clearTagFilters}
          refresh={() => runAction(loadTags, 'Tags refreshed')}
          onPrint={printSingleInventoryItem}
          loading={loading}
        />
      )}

      {page === 'documents' && <DocumentsPage api={api} />}
      {page === 'past-bills' && <PastBillsPage api={api} />}
      {page === 'reports' && <ReportsPage api={api} categories={categories} sellers={sellers} customers={customers} />}

      {showStockConfirm && (
        <StockConfirmModal
          header={stockHeader}
          items={stockItems}
          onCancel={() => setShowStockConfirm(false)}
          onConfirm={confirmStockSave}
          loading={loading}
        />
      )}

      {showSaleConfirm && (
        <SaleConfirmModal
          header={saleHeader}
          items={saleItems}
          receivedItems={saleReceivedItems}
          onCancel={() => setShowSaleConfirm(false)}
          onConfirm={confirmSaleSave}
          loading={loading}
        />
      )}
    </main>
  )
}

function MetalRateTicker({ rates, loading, error, onUpdate }) {
  if (loading) {
    return <div className="metal-rates">Loading rates...</div>
  }

  if (error) {
    return (
      <div className="metal-rates muted">
        <span>Rates unavailable</span>
        <button className="rate-update-button" type="button" onClick={onUpdate} aria-label="Refresh metal rates" title="Refresh metal rates">
          ↻
        </button>
      </div>
    )
  }

  if (!rates?.goldRate || !rates?.silverRate) {
    return (
      <div className="metal-rates muted">
        <span>Rates not updated</span>
        <button className="rate-update-button" type="button" onClick={onUpdate} aria-label="Refresh metal rates" title="Refresh metal rates">
          ↻
        </button>
      </div>
    )
  }

  return (
    <div className="metal-rates" aria-label="Current metal rates">
      <div className="rate-values">
        <span>Gold: {formatCurrencyPerGram(rates.goldRate)}</span>
        <span>Silver: {formatCurrencyPerGram(rates.silverRate)}</span>
      </div>
      <small>Updated: {formatRateTime(rates.updatedAt)}</small>
      <button className="rate-update-button" type="button" onClick={onUpdate} aria-label="Refresh metal rates" title="Refresh metal rates">
        ↻
      </button>
    </div>
  )
}

function HeaderClock({ value }) {
  return (
    <div className="header-clock" aria-label="Current date and time">
      {value.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}{' '}
      |{' '}
      {value.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}
    </div>
  )
}

function HomePage({
  setPage,
  resetStockForm,
  setResetStockForm,
  resetStock,
  resetPassword,
  setResetPassword,
  resetDatabase,
  changePasswordForm,
  setChangePasswordForm,
  changePassword,
}) {
  const canChangePassword =
    changePasswordForm.currentPassword &&
    changePasswordForm.newPassword &&
    changePasswordForm.confirmPassword &&
    changePasswordForm.newPassword === changePasswordForm.confirmPassword

  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Dashboard</h2>
        </div>
        <p style={{ color: 'var(--muted-text)', marginBottom: '24px' }}>Manage your jewelry inventory and sales</p>
        <div className="feature-grid">
          <button onClick={() => setPage('add-stock')} style={{ minHeight: '80px' }}>
            <span>Add Stock</span>
          </button>
          <button onClick={() => setPage('sales')} style={{ minHeight: '80px' }}>
            <span>Sales</span>
          </button>
          <button onClick={() => setPage('past-bills')} style={{ minHeight: '80px' }}>
            <span>View Past Bills</span>
          </button>
          <button onClick={() => setPage('manual-tag-print')} style={{ minHeight: '80px' }}>
            <span>Print Text Tags</span>
          </button>
          <button onClick={() => setPage('reprint-tags')} style={{ minHeight: '80px' }}>
            <span>Reprint Tags</span>
          </button>
          <button onClick={() => setPage('reports')} style={{ minHeight: '80px' }}>
            <span>Reports</span>
          </button>
          <button onClick={() => setPage('documents')} style={{ minHeight: '80px' }}>
            <span>Documents</span>
          </button>
        </div>
      </section>

      <section className="panel danger">
        <h2>Reset Stock</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted-text)' }}>Clear inventory data. This action cannot be undone.</p>
        <form onSubmit={resetStock} className="inline-form compact">
          <select
            value={resetStockForm.stockType}
            onChange={(event) => setResetStockForm({ ...resetStockForm, stockType: event.target.value })}
          >
            <option value="TAG">Tag stock</option>
            <option value="TRAY">Tray stock</option>
            <option value="ALL">All stock</option>
          </select>
          <input
            type="password"
            placeholder="Admin password"
            value={resetStockForm.password}
            onChange={(event) => setResetStockForm({ ...resetStockForm, password: event.target.value })}
          />
          <button disabled={!resetStockForm.password}>Reset Stock</button>
        </form>
      </section>

      <section className="panel danger">
        <h2>Reset Database</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted-text)' }}>Delete all data and recreate default admin. This action cannot be undone.</p>
        <form onSubmit={resetDatabase} className="inline-form compact">
          <input
            type="password"
            placeholder="Admin password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
          />
          <button disabled={!resetPassword}>Reset Database</button>
        </form>
      </section>

      <section className="panel">
        <h2>Change Password</h2>
        <form onSubmit={changePassword} className="inline-form compact">
          <input
            type="password"
            placeholder="Current password"
            value={changePasswordForm.currentPassword}
            onChange={(event) => setChangePasswordForm({ ...changePasswordForm, currentPassword: event.target.value })}
          />
          <input
            type="password"
            placeholder="New password"
            value={changePasswordForm.newPassword}
            onChange={(event) => setChangePasswordForm({ ...changePasswordForm, newPassword: event.target.value })}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={changePasswordForm.confirmPassword}
            onChange={(event) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: event.target.value })}
          />
          <button disabled={!canChangePassword}>Change Password</button>
        </form>
      </section>
    </>
  )
}

function UnifiedStockPage({
  header,
  setHeader,
  item,
  setItem,
  items,
  categories,
  sellers,
  editingIndex,
  onSubmitItem,
  onEditItem,
  onRemoveItem,
  onNewEntry,
  onFinalSubmit,
  loading,
  metalTypeRef,
}) {
  const totals = getTotals(items)

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Add Stock</h2>
        <button className="secondary" onClick={onNewEntry}>New Entry</button>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '20px', fontSize: '14px' }}>Enter seller and date information, then add items to the list</p>

      <div className="grid two compact">
        <SellerLookupInput value={header.sellerName} onChange={(value) => setHeader({ ...header, sellerName: value })} sellers={sellers} />
        <label>
          Date
          <input type="date" value={header.date} onChange={(event) => setHeader({ ...header, date: event.target.value })} />
        </label>
      </div>

      <form onSubmit={onSubmitItem} className="form item-form">
        <label>
          Metal Type
          <select ref={metalTypeRef} value={item.metalType} onChange={(event) => setItem({ ...emptyStockItem, metalType: event.target.value, stockType: item.stockType })}>
            <option value="GOLD">Gold</option>
            <option value="SILVER">Silver</option>
            <option value="OTHERS">Others</option>
          </select>
        </label>
        <label>
          Inventory Type
          <select value={item.stockType} onChange={(event) => setItem({ ...emptyStockItem, metalType: item.metalType, stockType: event.target.value })}>
            <option value="TAG">Tag</option>
            <option value="TRAY">Tray</option>
          </select>
        </label>
        <CategoryLookupInput
          value={item.categoryInput}
          onChange={(value) => setItem({ ...item, categoryInput: value })}
          categories={categories}
          stockType={item.stockType}
          metalType={item.metalType}
        />
        <label>
          Quantity
          <input
            type="number"
            min="1"
            step="1"
            value={item.quantity}
            onChange={(event) => setItem({ ...item, quantity: event.target.value })}
          />
        </label>
        <label>
          Gross Weight
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={item.weight}
            onChange={(event) => setItem({ ...item, weight: event.target.value })}
          />
        </label>
        <label>
          Stone Weight
          <input
            type="number"
            min="0"
            step="0.001"
            value={item.stoneWeight}
            onChange={(event) => setItem({ ...item, stoneWeight: event.target.value })}
          />
        </label>
        <button disabled={loading}>{editingIndex === null ? 'Add To List' : 'Update Item'}</button>
      </form>

      <h3 style={{ color: 'var(--heading)', marginTop: '24px' }}>Stock Items ({items.length})</h3>
      <StockItemTable items={items} onEdit={onEditItem} onRemove={onRemoveItem} />
      <div className="summary">
        <div><strong>Total Quantity:</strong> {totals.quantity}</div>
        <div><strong>Total Gross Weight:</strong> {totals.weight}</div>
        <div><strong>Total Stone Weight:</strong> {totals.stoneWeight}</div>
      </div>
      <button disabled={loading || items.length === 0 || !header.sellerName || !header.date} onClick={onFinalSubmit} style={{ width: '100%', marginTop: '12px' }}>
        Final Submit
      </button>
    </section>
  )
}

function UnifiedSalesPage({
  header,
  setHeader,
  customers,
  entry,
  setEntry,
  items,
  receivedItem,
  setReceivedItem,
  receivedItems,
  categories,
  onLookup,
  onAddItem,
  onRemoveItem,
  onAddReceivedItem,
  onRemoveReceivedItem,
  onFinalSubmit,
  loading,
  api,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchInput, setSearchInput] = useState('')

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

  const handleSearchSelect = (suggestion) => {
    setSearchInput(suggestion.value)
    setEntry({ ...emptySaleEntry, identifier: suggestion.value })
    setSuggestions([])
    setShowSuggestions(false)
  }

  const totals = getTotals(items)

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Sales Transaction</h2>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '20px', fontSize: '14px' }}>Record sales and process inventory reduction. Barcode / Tag Code / Tray Code / Category Name</p>

      <div className="grid two compact">
        <CustomerLookupInput value={header.customerName} onChange={(value) => setHeader({ ...header, customerName: value })} customers={customers} />
        <label>
          Date
          <input type="date" value={header.date} onChange={(event) => setHeader({ ...header, date: event.target.value })} />
        </label>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <form onSubmit={onLookup} className="inline-form compact">
          <input
            name="identifier"
            placeholder="Start typing: Barcode / Tag Code / Tray Code / Category Name..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onFocus={() => searchInput && setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onLookup(e)
              }
            }}
          />
          <button disabled={loading || !searchInput.trim()}>Fetch</button>
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            maxHeight: '250px',
            overflowY: 'auto',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            marginTop: '-4px'
          }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSearchSelect(suggestion)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div style={{ fontWeight: 500, color: '#333', fontSize: '14px', marginBottom: '4px' }}>
                  {suggestion.displayText}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {suggestion.type === 'TAG' ? `Tag #${suggestion.tagId}` : suggestion.trayCode}
                  {suggestion.metalType && ` • ${suggestion.metalType}`}
                  {suggestion.quantity && ` • Qty: ${suggestion.quantity}`}
                </div>
              </div>
            ))}
          </div>
        )}

        {showSuggestions && searchInput && suggestions.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            padding: '12px 16px',
            color: '#999',
            fontSize: '13px',
            textAlign: 'center',
            zIndex: 10,
            marginTop: '-4px'
          }}>
            No items found
          </div>
        )}
      </div>

      {entry.inventoryId && (
        <form onSubmit={onAddItem} className="form item-form">
          <label>
            Type
            <input value={entry.stockType} readOnly />
          </label>
          <label>
            Category
            <input value={entry.category} readOnly />
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              max={entry.stockType === 'TRAY' ? entry.availableQuantity : 1}
              step="1"
              value={entry.quantity}
              readOnly={entry.stockType === 'TAG'}
              onChange={(event) => setEntry({ ...entry, quantity: event.target.value })}
            />
          </label>
          <label>
            Gross Weight
            <input
              type="number"
              min="0.001"
              max={entry.stockType === 'TRAY' ? entry.availableWeight : entry.weight}
              step="0.001"
              value={entry.weight}
              readOnly={entry.stockType === 'TAG'}
              onChange={(event) => setEntry({ ...entry, weight: event.target.value })}
            />
          </label>
          <label>
            Stone Weight
            <input
              type="number"
              min="0"
              max={entry.stockType === 'TRAY' ? entry.availableStoneWeight : entry.stoneWeight}
              step="0.001"
              value={entry.stoneWeight}
              readOnly={entry.stockType === 'TAG'}
              onChange={(event) => setEntry({ ...entry, stoneWeight: event.target.value })}
            />
          </label>
          <label>
            Date
            <input type="date" value={header.date} readOnly />
          </label>
          <button disabled={!entry.available} style={{ gridColumn: 'span 2' }}>Add To Sale List</button>
        </form>
      )}

      <section className="embedded-section">
        <div className="section-heading compact-heading">
          <h3>Received From Customer</h3>
        </div>
        <form onSubmit={onAddReceivedItem} className="form received-item-form">
          <label>
            Item Type
            <select
              value={receivedItem.itemType}
              onChange={(event) => setReceivedItem({ ...emptyReceivedItem, itemType: event.target.value, metalType: receivedItem.metalType })}
            >
              <option value="RAW_METAL">Raw Metal</option>
              <option value="OLD_ORNAMENT">Old Ornament</option>
            </select>
          </label>
          <label>
            Metal
            <select value={receivedItem.metalType} onChange={(event) => setReceivedItem({ ...receivedItem, metalType: event.target.value })}>
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
            </select>
          </label>
          <CategoryTextInput
            value={receivedItem.category}
            onChange={(value) => setReceivedItem({ ...receivedItem, category: value })}
            categories={categories}
            metalType={receivedItem.metalType}
          />
          <label>
            Weight (grams)
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={receivedItem.weight}
              onChange={(event) => setReceivedItem({ ...receivedItem, weight: event.target.value })}
            />
          </label>
          {receivedItem.itemType === 'OLD_ORNAMENT' && (
            <label>
              Purity
              <input
                value={receivedItem.purity}
                onChange={(event) => setReceivedItem({ ...receivedItem, purity: event.target.value })}
                placeholder="Example: 22K or 916"
              />
            </label>
          )}
          <button disabled={loading}>
            Add Received Item
          </button>
        </form>

        <ReceivedItemTable items={receivedItems} onRemove={onRemoveReceivedItem} />
      </section>

      <h3 style={{ color: 'var(--heading)', marginTop: '24px' }}>Sale Items ({items.length})</h3>
      <SaleItemTable items={items} onRemove={onRemoveItem} />
      <div className="summary">
        <div><strong>Total Quantity:</strong> {totals.quantity}</div>
        <div><strong>Total Gross Weight:</strong> {totals.weight}</div>
        <div><strong>Total Stone Weight:</strong> {totals.stoneWeight}</div>
        {receivedItems.length > 0 && <div><strong>Received Weight:</strong> {getReceivedTotal(receivedItems)}</div>}
      </div>
      <button disabled={loading || items.length === 0 || !header.customerName || !header.date} onClick={onFinalSubmit} style={{ width: '100%', marginTop: '12px' }}>
        Final Submit
      </button>
    </section>
  )
}

function ManualTagPrintPage({ form, setForm, onSubmit, onClear, loading }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Print Text Tags</h2>
        <button type="button" className="secondary" onClick={onClear}>Clear</button>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '20px', fontSize: '14px' }}>
        Print simple text tags with category on the left and code on the right.
      </p>

      <form onSubmit={onSubmit} className="form manual-print-form">
        <label>
          Category
          <input
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            placeholder="Example: RING"
          />
        </label>
        <label>
          Code
          <input
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
            placeholder="Example: 1001 or ABC-123 or any code"
          />
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
          />
        </label>
        <button disabled={loading || !form.category.trim() || !String(form.code).trim()}>
          Print
        </button>
      </form>
    </section>
  )
}

function ReprintTagsPage({
  filters,
  setFilters,
  tags,
  categories,
  onApply,
  onPrintTagCode,
  onClear,
  onPrint,
  onPrintAll,
  onClearResults,
  loading,
}) {
  const categoryOptions = getReprintCategoryOptions(categories, filters.metalType)

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Reprint Tags</h2>
        <button type="button" className="secondary" onClick={onClear}>Clear</button>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '20px', fontSize: '14px' }}>
        Print one tag by tag code, or select metal and category to load a list for reprinting.
      </p>

      <form onSubmit={onPrintTagCode} className="inline-form compact">
        <input
          placeholder="Tag code"
          value={filters.tagCode}
          onChange={(event) => setFilters({ ...filters, tagCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
        />
        <button disabled={loading || !String(filters.tagCode).trim()}>Print Tag</button>
      </form>

      <form onSubmit={onApply} className="filters reprint-filters">
        <label>
          Metal
          <select
            value={filters.metalType}
            onChange={(event) => {
              setFilters({ ...filters, metalType: event.target.value, category: '' })
              onClearResults()
            }}
          >
            <option value="GOLD">Gold</option>
            <option value="SILVER">Silver</option>
          </select>
        </label>
        <label>
          Category
          <select
            value={filters.category}
            onChange={(event) => {
              setFilters({ ...filters, category: event.target.value })
              onClearResults()
            }}
          >
            <option value="">Select category</option>
            {categoryOptions.map((category) => (
              <option key={category._id} value={category.name}>
                {category.name} ({category.categoryCode})
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) => {
              setFilters({ ...filters, status: event.target.value })
              onClearResults()
            }}
          >
            <option value="">Any</option>
            <option value="AVAILABLE">Available</option>
            <option value="SOLD">Sold</option>
          </select>
        </label>
        <div className="filter-actions">
          <button disabled={loading || !filters.metalType || !filters.category}>Show Tags</button>
          <button type="button" className="secondary" onClick={onPrintAll} disabled={loading || tags.length === 0}>
            Print All
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tag Code</th>
              <th>Metal</th>
              <th>Category</th>
              <th>Code</th>
              <th>Gross Weight</th>
              <th>Stone Weight</th>
              <th>Seller</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag._id}>
                <td><strong>{tag.tagId}</strong></td>
                <td>{tag.metalType}</td>
                <td>{tag.category}</td>
                <td>{tag.categoryCode || '-'}</td>
                <td>{tag.weight}</td>
                <td>{tag.stoneWeight ?? 0}</td>
                <td>{tag.sellerName}</td>
                <td><span className={`badge ${tag.status.toLowerCase()}`}>{tag.status}</span></td>
                <td>
                  <button className="secondary" onClick={() => onPrint({ ...tag, stockType: 'TAG' })} disabled={loading}>
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tags.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No tags selected for reprint</p>}
    </section>
  )
}

function TrayInventoryPage({ trays, refresh }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Tray Inventory</h2>
        <button className="secondary" onClick={refresh}>Refresh</button>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '16px', fontSize: '14px' }}>View and manage tray inventory</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tray Code</th>
              <th>Name</th>
              <th>Metal</th>
              <th>Category</th>
              <th>Code</th>
              <th>Quantity</th>
              <th>Gross Weight</th>
              <th>Stone Weight</th>
              <th>Average</th>
            </tr>
          </thead>
          <tbody>
            {trays.map((tray) => (
              <tr key={tray._id}>
                <td><strong>{tray.trayCode || '-'}</strong></td>
                <td>{tray.trayName}</td>
                <td>{tray.metalType}</td>
                <td>{tray.category || '-'}</td>
                <td>{tray.categoryCode || '-'}</td>
                <td>{tray.quantity}</td>
                <td>{tray.totalWeight}</td>
                <td>{tray.stoneWeight ?? 0}</td>
                <td>{tray.averageWeight}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {trays.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No trays found</p>}
    </section>
  )
}

function TagInventoryPage({ tags, filters, setFilters, categories, sellers, applyFilters, clearFilters, refresh, onPrint, loading }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Tag Inventory</h2>
        <button className="secondary" onClick={refresh}>Refresh</button>
      </div>
      <p style={{ color: 'var(--muted-text)', marginBottom: '16px', fontSize: '14px' }}>Search and filter tag inventory</p>

      <form onSubmit={applyFilters} className="filters">
        <label>
          Search
          <input
            placeholder="Tag code, category, seller"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
        </label>
        <CategoryLookupInput
          value={filters.category}
          onChange={(value) => setFilters({ ...filters, category: value })}
          categories={categories}
          stockType="TAG"
          metalType={filters.metalType}
        />
        <SellerLookupInput
          value={filters.sellerName}
          onChange={(value) => setFilters({ ...filters, sellerName: value })}
          sellers={sellers}
        />
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
          Status
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Any</option>
            <option value="AVAILABLE">Available</option>
            <option value="SOLD">Sold</option>
          </select>
        </label>
        <label>
          Date
          <input type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
        </label>
        <div className="filter-actions">
          <button>Apply</button>
          <button type="button" className="secondary" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tag Code</th>
              <th>Metal</th>
              <th>Category</th>
              <th>Code</th>
              <th>Pieces</th>
              <th>Gross Weight</th>
              <th>Stone Weight</th>
              <th>Seller</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag._id}>
                <td><strong>{tag.tagId}</strong></td>
                <td>{tag.metalType}</td>
                <td>{tag.category}</td>
                <td>{tag.categoryCode || '-'}</td>
                <td>{tag.pieces}</td>
                <td>{tag.weight}</td>
                <td>{tag.stoneWeight ?? 0}</td>
                <td>{tag.sellerName}</td>
                <td>{formatDate(tag.purchaseDate)}</td>
                <td><span className={`badge ${tag.status.toLowerCase()}`}>{tag.status}</span></td>
                <td>
                  <button className="secondary" onClick={() => onPrint({ ...tag, stockType: 'TAG' })} disabled={loading}>
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tags.length === 0 && <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No tags found</p>}
    </section>
  )
}

function StockConfirmModal({ header, items, onCancel, onConfirm, loading }) {
  const totals = getTotals(items)

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 style={{ marginBottom: '20px', color: 'var(--heading)' }}>Confirm Stock Addition</h2>
        <dl className="details compact">
          <dt>Seller</dt>
          <dd>{header.sellerName}</dd>
          <dt>Date</dt>
          <dd>{formatDate(header.date)}</dd>
          <dt>Items</dt>
          <dd>{items.length} item(s)</dd>
        </dl>
        <h3 style={{ marginTop: '20px', color: 'var(--heading)' }}>Items Summary</h3>
        <StockItemTable items={items} />
        <div className="summary">
          <div><strong>Total Quantity:</strong> {totals.quantity}</div>
          <div><strong>Total Gross Weight:</strong> {totals.weight}</div>
          <div><strong>Total Stone Weight:</strong> {totals.stoneWeight}</div>
        </div>
        <div className="modal-actions">
          <button className="secondary" onClick={onCancel}>Cancel</button>
          <button disabled={loading} onClick={onConfirm}>Confirm & Save</button>
        </div>
      </div>
    </div>
  )
}

function SaleConfirmModal({ header, items, receivedItems, onCancel, onConfirm, loading }) {
  const totals = getTotals(items)

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 style={{ marginBottom: '20px', color: 'var(--heading)' }}>Confirm Sale Transaction</h2>
        <dl className="details compact">
          <dt>Customer</dt>
          <dd>{header.customerName}</dd>
          <dt>Date</dt>
          <dd>{formatDate(header.date)}</dd>
          <dt>Items</dt>
          <dd>{items.length} item(s)</dd>
        </dl>
        <h3 style={{ marginTop: '20px', color: 'var(--heading)' }}>Items Summary</h3>
        <SaleItemTable items={items} />
        {receivedItems.length > 0 && (
          <>
            <h3 style={{ marginTop: '20px', color: 'var(--heading)' }}>Received From Customer</h3>
            <ReceivedItemTable items={receivedItems} />
          </>
        )}
        <div className="summary">
          <div><strong>Total Quantity:</strong> {totals.quantity}</div>
          <div><strong>Total Gross Weight:</strong> {totals.weight}</div>
          <div><strong>Total Stone Weight:</strong> {totals.stoneWeight}</div>
          {receivedItems.length > 0 && <div><strong>Received Weight:</strong> {getReceivedTotal(receivedItems)}</div>}
        </div>
        <div className="modal-actions">
          <button className="secondary" onClick={onCancel}>Cancel</button>
          <button disabled={loading} onClick={onConfirm}>Confirm & Process</button>
        </div>
      </div>
    </div>
  )
}

function ReceivedItemTable({ items, onRemove }) {
  if (items.length === 0) {
    return <p>No received items added.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item Type</th>
            <th>Metal</th>
            <th>Category</th>
            <th>Weight</th>
            <th>Purity</th>
            {onRemove && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.itemType}-${item.metalType}-${item.category}-${index}`}>
              <td>{formatReceivedItemType(item.itemType)}</td>
              <td>{item.metalType}</td>
              <td>{item.category}</td>
              <td>{item.weight}</td>
              <td>{item.purity || '-'}</td>
              {onRemove && (
                <td>
                  <button className="secondary" onClick={() => onRemove(index)}>Remove</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StockItemTable({ items, onEdit, onRemove }) {
  if (items.length === 0) {
    return <p>No items added.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Metal</th>
            <th>Category/Code</th>
            <th>Quantity</th>
            <th>Gross Weight</th>
            <th>Stone Weight</th>
            <th>Seller</th>
            <th>Date</th>
            {(onEdit || onRemove) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.stockType}-${item.category}-${index}`}>
              <td>{item.stockType}</td>
              <td>{item.metalType}</td>
              <td>{item.category}/{item.categoryCode || '-'}</td>
              <td>{item.quantity}</td>
              <td>{item.weight}</td>
              <td>{item.stoneWeight ?? 0}</td>
              <td>{item.sellerName}</td>
              <td>{formatDate(item.date)}</td>
              {(onEdit || onRemove) && (
                <td>
                  <div className="row-actions">
                    {onEdit && <button className="secondary" onClick={() => onEdit(index)}>Edit</button>}
                    {onRemove && <button className="secondary" onClick={() => onRemove(index)}>Remove</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SaleItemTable({ items, onRemove }) {
  if (items.length === 0) {
    return <p>No sale items added.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Barcode / ID</th>
            <th>Type</th>
            <th>Metal</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Gross Weight</th>
            <th>Stone Weight</th>
            {onRemove && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.inventoryId}-${index}`}>
              <td>{item.identifier}</td>
              <td>{item.stockType}</td>
              <td>{item.metalType || '-'}</td>
              <td>{item.category}</td>
              <td>{item.quantity}</td>
              <td>{item.weight}</td>
              <td>{item.stoneWeight ?? 0}</td>
              {onRemove && (
                <td>
                  <button className="secondary" onClick={() => onRemove(index)}>Remove</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CategoryLookupInput({ value, onChange, categories, stockType, metalType }) {
  const suggestions = filterCategories(categories, value, stockType, metalType)

  return (
    <label>
      Category / Tray
      <input
        list={`category-suggestions-${stockType || 'all'}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Select or type category"
      />
      <datalist id={`category-suggestions-${stockType || 'all'}`}>
        {suggestions.map((category) => (
          <option key={category._id} value={category.categoryCode || category.name}>
            {category.name} ({category.metalType}) - {category.categoryCode}
          </option>
        ))}
      </datalist>
    </label>
  )
}

function CategoryTextInput({ value, onChange, categories, metalType }) {
  const suggestions = categories.filter((category) => !metalType || category.metalType === metalType)

  return (
    <label>
      Category
      <input
        list={`received-category-suggestions-${metalType || 'all'}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Category"
      />
      <datalist id={`received-category-suggestions-${metalType || 'all'}`}>
        {suggestions.map((category) => (
          <option key={category._id} value={category.name}>
            {category.categoryCode ? `${category.categoryCode} - ${category.name}` : category.name}
          </option>
        ))}
      </datalist>
    </label>
  )
}

function SellerLookupInput({ value, onChange, sellers }) {
  const suggestions = filterNames(sellers, value)

  return (
    <label>
      Seller
      <input
        list="seller-suggestions"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Select seller"
      />
      <datalist id="seller-suggestions">
        {suggestions.map((seller) => (
          <option key={seller._id} value={seller.name} />
        ))}
      </datalist>
    </label>
  )
}

function CustomerLookupInput({ value, onChange, customers }) {
  const suggestions = filterNames(customers, value)

  return (
    <label>
      Customer
      <input
        list="customer-suggestions"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Select customer"
      />
      <datalist id="customer-suggestions">
        {suggestions.map((customer) => (
          <option key={customer.name} value={customer.name} />
        ))}
      </datalist>
    </label>
  )
}

function Status({ message, error }) {
  if (!message && !error) {
    return null
  }

  return <div className={`status ${error ? 'error' : 'success'}`}>
    {error || message}
  </div>
}

function filterNames(items, value) {
  const search = value.trim().toLowerCase()

  if (!search) {
    return items
  }

  return items.filter((item) => item.name.toLowerCase().includes(search))
}

function filterCategories(items, value, stockType, metalType) {
  const search = value.trim().toLowerCase()

  return items.filter((item) => {
    const matchesName =
      !search ||
      item.name.toLowerCase().includes(search) ||
      item.categoryCode?.toLowerCase().includes(search)
    const stockTypes = item.stockTypes || []
    const matchesType = !stockType || stockTypes.length === 0 || stockTypes.includes(stockType)
    const matchesMetal = !metalType || item.metalType === metalType

    return matchesName && matchesType && matchesMetal
  })
}

function getReprintCategoryOptions(items, metalType) {
  return items
    .filter((item) => {
      const stockTypes = item.stockTypes || []
      const matchesType = stockTypes.length === 0 || stockTypes.includes('TAG')
      const matchesMetal = !metalType || item.metalType === metalType

      return matchesType && matchesMetal
    })
    .sort((first, second) => first.name.localeCompare(second.name))
}

function findLookup(items, value) {
  const search = value.trim().toLowerCase()
  return items.find((item) => item.name.toLowerCase() === search)
}

function mergeLookupItem(items, item) {
  const exists = findLookup(items, item.name)

  if (exists) {
    return items.map((currentItem) => (currentItem.name.toLowerCase() === item.name.toLowerCase() ? item : currentItem))
  }

  return [...items, item].sort((first, second) => first.name.localeCompare(second.name))
}

function mergeCategoryItem(items, item) {
  const itemId = item._id
  const itemNameKey = item.name.toLowerCase()
  const itemCodeKey = item.categoryCode?.toLowerCase()

  const exists = items.some((currentItem) => (
    (itemId && currentItem._id === itemId) ||
    (
      currentItem.metalType === item.metalType &&
      (currentItem.name.toLowerCase() === itemNameKey || (itemCodeKey && currentItem.categoryCode?.toLowerCase() === itemCodeKey))
    )
  ))

  if (exists) {
    return items.map((currentItem) => {
      const matches =
        (itemId && currentItem._id === itemId) ||
        (
          currentItem.metalType === item.metalType &&
          (currentItem.name.toLowerCase() === itemNameKey || (itemCodeKey && currentItem.categoryCode?.toLowerCase() === itemCodeKey))
        )

      return matches ? item : currentItem
    })
  }

  return [...items, item].sort((first, second) => (
    first.metalType.localeCompare(second.metalType) || first.name.localeCompare(second.name)
  ))
}

function findCategory(items, value, stockType, metalType) {
  const search = value.trim().toLowerCase()

  return items.find((item) => {
    const stockTypes = item.stockTypes || []
    const matchesValue = item.name.toLowerCase() === search || item.categoryCode?.toLowerCase() === search
    const matchesType = stockTypes.length === 0 || stockTypes.includes(stockType)
    const matchesMetal = item.metalType === metalType

    return matchesValue && matchesType && matchesMetal
  })
}

function getTotals(items) {
  return {
    quantity: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    weight: Number(items.reduce((sum, item) => sum + Number(item.weight || 0), 0).toFixed(3)),
    stoneWeight: Number(items.reduce((sum, item) => sum + Number(item.stoneWeight || 0), 0).toFixed(3)),
  }
}

function getReceivedTotal(items) {
  return Number(items.reduce((sum, item) => sum + Number(item.weight || 0), 0).toFixed(3))
}

function formatReceivedItemType(value) {
  if (value === 'OLD_ORNAMENT') {
    return 'Old Ornament'
  }

  return 'Raw Metal'
}

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString()
}

function formatCurrencyPerGram(value) {
  if (!Number.isFinite(Number(value))) {
    return '-'
  }

  return `₹${Math.round(Number(value)).toLocaleString('en-IN')}/g`
}

function formatRateTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function getPrintPayload(item) {
  return {
    inventoryId: item.inventoryId || item._id,
    stockType: item.stockType,
    tagId: item.tagId,
    trayCode: item.trayCode || item.categoryCode,
    trayName: item.trayName || item.category,
    category: item.category,
    categoryCode: item.categoryCode,
    quantity: item.quantity,
    weight: item.weight,
    grossWeight: item.grossWeight ?? item.totalWeight ?? item.weight,
    totalWeight: item.totalWeight,
    stoneWeight: item.stoneWeight ?? 0,
    sellerName: item.sellerName,
  }
}

export default App
