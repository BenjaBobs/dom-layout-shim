const base = [
  '[data-layout-key="workspace"]',
  '[data-layout-key="sidebar"]',
  '[data-layout-key="task-list"]',
  '[data-layout-key="underlying-control"]',
];

export const scenario = {
  id: 'task-workspace-full-interaction',
  steps: [
    {
      id: 'initial',
      label: 'Initial task list',
      observe: [
        ...base,
        '[data-layout-key="task-1"]',
        '[data-layout-key="task-2"]',
        '[data-layout-key="task-3"]',
      ],
    },
    {
      id: 'active-filter',
      label: 'Active filter',
      actions: [
        { type: 'click', selector: '[data-layout-key="filter-active"]' },
      ],
      observe: [
        ...base,
        '[data-layout-key="task-1"]',
        '[data-layout-key="task-3"]',
      ],
    },
    {
      id: 'add-dialog',
      label: 'Add dialog open',
      actions: [
        { type: 'click', selector: '[data-layout-key="underlying-control"]' },
      ],
      observe: [
        ...base,
        '[data-layout-key="add-dialog"]',
        '[data-layout-key="task-title-input"]',
      ],
    },
    {
      id: 'task-added',
      label: 'Task added',
      actions: [
        {
          type: 'fill',
          selector: '[data-layout-key="task-title-input"]',
          value: 'Compatibility follow-up',
        },
        {
          type: 'fill',
          selector: '[data-layout-key="task-description-input"]',
          value: 'Review the generated discrepancy report.',
        },
        { type: 'click', selector: '[data-layout-key="add-submit"]' },
      ],
      observe: [...base, '[data-layout-key="task-4"]'],
    },
    {
      id: 'action-menu',
      label: 'Action menu open',
      actions: [
        { type: 'click', selector: '[data-layout-key="task-1-menu-trigger"]' },
      ],
      observe: [
        ...base,
        '[data-layout-key="task-menu"]',
        '[data-layout-key="delete-action"]',
      ],
    },
    {
      id: 'delete-dialog',
      label: 'Delete dialog open',
      actions: [
        { type: 'click', selector: '[data-layout-key="delete-action"]' },
      ],
      observe: [
        ...base,
        '[data-layout-key="delete-dialog"]',
        '[data-layout-key="delete-backdrop"]',
      ],
    },
    {
      id: 'restored',
      label: 'Dialog dismissed',
      actions: [
        { type: 'click', selector: '[data-layout-key="delete-cancel"]' },
      ],
      observe: [
        ...base,
        '[data-layout-key="task-1"]',
        '[data-layout-key="task-4"]',
      ],
    },
  ],
};
