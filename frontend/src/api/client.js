class ApiClient {
  async request(method, url, body = null) {
    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const opts = { method, headers }
    if (body) opts.body = JSON.stringify(body)

    const res = await fetch(url, opts)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Request failed (${res.status})`)
    }

    return res.json()
  }

  get(url) { return this.request('GET', url) }
  post(url, body) { return this.request('POST', url, body) }
  put(url, body) { return this.request('PUT', url, body) }
  patch(url, body) { return this.request('PATCH', url, body) }
  delete(url) { return this.request('DELETE', url) }
}

export default new ApiClient()
