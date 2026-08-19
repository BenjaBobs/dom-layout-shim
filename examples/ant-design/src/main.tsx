import { mountTaskWorkspace } from './app.tsx';

const container = document.querySelector('#app');

if (!container) {
  throw new Error('Missing example application root');
}

mountTaskWorkspace(container);
