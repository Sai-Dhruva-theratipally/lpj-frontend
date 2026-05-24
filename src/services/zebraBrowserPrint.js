const SDK_SCRIPT_ID = 'zebra-browser-print-sdk'
const SDK_SCRIPT_SRC = '/BrowserPrint-3.1.250.min.js'
let browserPrintSdkUnavailable = false
const BROWSER_PRINT_BASE_URLS = [
  'http://127.0.0.1:9100',
  'http://localhost:9100',
  'https://127.0.0.1:9101',
  'https://localhost:9101',
]

const loadBrowserPrintSdk = () => {
  if (browserPrintSdkUnavailable) {
    return Promise.reject(new Error('Zebra Browser Print SDK file was not found'))
  }

  if (window.BrowserPrint) {
    return Promise.resolve(window.BrowserPrint)
  }

  const existingScript = document.getElementById(SDK_SCRIPT_ID)

  if (existingScript) {
    if (existingScript.dataset.loadState === 'failed') {
      browserPrintSdkUnavailable = true
      existingScript.remove()
      return Promise.reject(new Error('Zebra Browser Print SDK file was not found'))
    }

    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(window.BrowserPrint), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Zebra Browser Print SDK could not be loaded')), {
        once: true,
      })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SDK_SCRIPT_ID
    script.src = SDK_SCRIPT_SRC
    script.async = true
    script.onload = () => {
      if (window.BrowserPrint) {
        resolve(window.BrowserPrint)
      } else {
        reject(new Error('Zebra Browser Print SDK is not available'))
      }
    }
    script.onerror = () => {
      browserPrintSdkUnavailable = true
      script.dataset.loadState = 'failed'
      script.remove()
      reject(new Error('Zebra Browser Print SDK file was not found'))
    }
    document.head.appendChild(script)
  })
}

const getDefaultPrinterFromSdk = async (BrowserPrint) => {
  return new Promise((resolve, reject) => {
    BrowserPrint.getDefaultDevice(
      'printer',
      (device) => {
        if (!device) {
          reject(new Error('No default Zebra printer found in Browser Print'))
          return
        }

        resolve(device)
      },
      (error) => reject(new Error(error || 'Unable to connect to Zebra Browser Print')),
    )
  })
}

const requestBrowserPrint = async (baseUrl, path, options = {}) => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 3500)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
    })

    const text = await response.text()

    if (!response.ok) {
      throw new Error(`Browser Print responded with ${response.status}${text ? `: ${text}` : ''}`)
    }

    if (!text) {
      return null
    }

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const normalizeDirectDevice = (device) => {
  if (!device) {
    return null
  }

  const directDevice = device.device || device.defaultDevice || device

  if (Array.isArray(directDevice)) {
    return directDevice.find((item) => item?.uid || item?.name) || null
  }

  if (directDevice.printer) {
    return normalizeDirectDevice(directDevice.printer)
  }

  if (!directDevice.uid && !directDevice.name) {
    return null
  }

  return directDevice
}

const getDefaultPrinterFromService = async () => {
  const errors = []

  for (const baseUrl of BROWSER_PRINT_BASE_URLS) {
    try {
      const device = normalizeDirectDevice(await requestBrowserPrint(baseUrl, '/default?type=printer'))

      if (device) {
        return { baseUrl, device }
      }

      const availableDevice = normalizeDirectDevice(await requestBrowserPrint(baseUrl, '/available?type=printer'))

      if (availableDevice) {
        return { baseUrl, device: availableDevice }
      }
    } catch (error) {
      errors.push(`${baseUrl}: ${error.message}`)
    }
  }

  throw new Error(`Unable to connect to Zebra Browser Print. Start Zebra Browser Print and set a default printer. ${errors.join('; ')}`)
}

const sendZplToService = async (zpl) => {
  const printer = await getDefaultPrinterFromService()
  const payload = JSON.stringify({
    device: printer.device,
    data: zpl,
  })

  await requestBrowserPrint(printer.baseUrl, '/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: payload,
  })

  return printer.device
}

const sendZplWithSdk = async (zpl) => {
  const BrowserPrint = await loadBrowserPrintSdk()
  const printer = await getDefaultPrinterFromSdk(BrowserPrint)

  return new Promise((resolve, reject) => {
    printer.send(
      zpl,
      () => resolve(printer),
      (error) => reject(new Error(error || 'Zebra printer rejected the print job')),
    )
  })
}

export const printZpl = async (zpl) => {
  if (!zpl?.trim()) {
    throw new Error('ZPL data is empty')
  }

  try {
    return await sendZplWithSdk(zpl)
  } catch {
    return sendZplToService(zpl)
  }
}
