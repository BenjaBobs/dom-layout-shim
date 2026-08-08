import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

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

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
  const filePath = resolve(docsRoot, `.${pathname}`)

  if (!isWithinDocs(filePath)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Forbidden')
    return
  }

  if (!existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
  })

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  createReadStream(filePath).pipe(response)
})

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
    console.error('  pnpm run css:status -- 4174')
    process.exit(1)
  }

  throw error
})

function isWithinDocs(filePath) {
  return filePath === docsRoot || filePath.startsWith(`${docsRoot}${sep}`)
}
