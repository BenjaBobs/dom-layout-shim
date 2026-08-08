import { mountApp } from './app.ts'

const root = document.querySelector('#app')

if (!root) {
  throw new Error('Missing example application root')
}

mountApp(root)
