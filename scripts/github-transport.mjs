// The caller explicitly supplies repository and token; no production defaults.
export function githubTransport({ owner, repo, token, fetchImpl = fetch }) {
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || !token) throw new Error('Explicit GitHub credentials and repository required')
  const root = `https://api.github.com/repos/${owner}/${repo}`
  return async (method, path, body) => {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path')
    let response
    try {
      response = await fetchImpl(root + path, { method, headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'x-github-api-version': '2022-11-28' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    } catch (error) {
      if (method === 'PATCH') throw Object.assign(new Error('Ambiguous ref update'), { code: 'ambiguous', cause: error })
      throw error
    }
    if (!response.ok) {
      // A server failure or disconnect after PATCH can occur after ref update.
      if (method === 'PATCH' && response.status >= 500) throw Object.assign(new Error('Ambiguous ref update'), { code: 'ambiguous' })
      throw Object.assign(new Error(`GitHub API ${method} ${response.status}`), { code: response.status })
    }
    try { return await response.json() } catch (error) {
      if (method === 'PATCH') throw Object.assign(new Error('Ambiguous ref response'), { code: 'ambiguous', cause: error })
      throw error
    }
  }
}
