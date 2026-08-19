import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TaskWorkspace } from './task-workspace.tsx';
import './styles.css';

const root = document.querySelector('#app');

if (!root) {
  throw new Error('Missing example application root');
}

createRoot(root).render(
  <StrictMode>
    <TaskWorkspace />
  </StrictMode>,
);
