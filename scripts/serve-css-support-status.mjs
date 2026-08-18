import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const docsRoot = resolve(root, '.site')
const portArgument = process.argv.slice(2).find((argument) => /^\d+$/.test(argument))
const requestedPort = Number(process.env.PORT ?? portArgument ?? 4173)
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

export function createDocumentationServer() {
  return createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const pathname = decodeURIComponent(url.pathname)
    const resolved = resolveDocumentationRequest(docsRoot, pathname)

    if (resolved.status !== 200) {
      response.writeHead(resolved.status, {
        'content-type': 'text/plain; charset=utf-8',
        ...(resolved.location ? { location: resolved.location } : {}),
      })
      response.end(resolved.message)
      return
    }

    const filePath = resolved.filePath

    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    })

    if (request.method === 'HEAD') {
      response.end()
      return
    }

    const stream = createReadStream(filePath)
    stream.on('error', (error) => response.destroy(error))
    stream.pipe(response)
  })
}

export function resolveDocumentationRequest(rootDirectory, pathname) {
  const normalizedPathname = pathname === '/' ? '/index.html' : pathname
  let filePath = resolve(rootDirectory, `.${normalizedPathname}`)

  if (!isWithinRoot(rootDirectory, filePath)) {
    return { status: 403, message: 'Forbidden' }
  }

  if (!existsSync(filePath)) {
    return { status: 404, message: 'Not found' }
  }

  if (statSync(filePath).isDirectory()) {
    if (!pathname.endsWith('/')) {
      return { status: 301, location: `${pathname}/`, message: 'Moved permanently' }
    }

    filePath = resolve(filePath, 'index.html')
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return { status: 404, message: 'Not found' }
  }

  return { status: 200, filePath }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const server = createDocumentationServer()

  server.listen(requestedPort, '127.0.0.1', () => {
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : requestedPort

    console.log(`Documentation site: http://localhost:${port}/`)
    console.log(`CSS support overview: http://localhost:${port}/css-support-status.html`)
    console.log('Press Ctrl+C to stop the server.')
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${requestedPort} is already in use. Run with another port, for example:`)
      console.error('  pnpm run docs:serve -- 4174')
      process.exit(1)
    }

    throw error
  })
}

function isWithinRoot(rootDirectory, filePath) {
  return filePath === rootDirectory || filePath.startsWith(`${rootDirectory}${sep}`)
}
