import { DeleteOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { App as AntApp, Button, ConfigProvider, Dropdown, Input, Layout, List, Modal, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import './styles.css'

type Task = {
  id: number
  title: string
  description: string
  status: 'Active' | 'Completed'
}

type TaskFilter = 'All' | Task['status']

const initialTasks: Task[] = [
  {
    id: 1,
    title: 'Audit the account settings experience',
    description: 'Check the long labels and supporting copy at narrow widths.',
    status: 'Active',
  },
  {
    id: 2,
    title: 'Publish the compatibility report',
    description: 'Summarize overlay, scrolling, and hit-testing results.',
    status: 'Active',
  },
  {
    id: 3,
    title: 'Review release notes',
    description: 'Confirm the completed changes are ready to share.',
    status: 'Completed',
  },
]

export function TaskWorkspace(): React.JSX.Element {
  const [tasks, setTasks] = useState(initialTasks)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)
  const [filter, setFilter] = useState<TaskFilter>('All')
  const [addOpen, setAddOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')

  const visibleTasks = filter === 'All'
    ? tasks
    : tasks.filter((task) => task.status === filter)

  function menuItems(task: Task): MenuProps['items'] {
    return [
      {
        key: 'delete',
        danger: true,
        icon: <DeleteOutlined />,
        label: 'Delete task',
        onClick: () => setPendingDelete(task),
      },
    ]
  }

  function confirmDelete(): void {
    if (!pendingDelete) {
      return
    }

    setTasks((current) => current.filter((task) => task.id !== pendingDelete.id))
    setPendingDelete(null)
  }

  function addTask(): void {
    const title = draftTitle.trim()
    if (!title) return

    setTasks((current) => [
      ...current,
      {
        id: Math.max(0, ...current.map((task) => task.id)) + 1,
        title,
        description: draftDescription.trim() || 'No description provided.',
        status: 'Active',
      },
    ])
    setDraftTitle('')
    setDraftDescription('')
    setAddOpen(false)
    setFilter('All')
  }

  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <AntApp>
      <Layout className="workspace" data-layout-key="task-workspace">
        <Layout.Sider className="workspace-sidebar" width={180}>
          <Typography.Title level={4}>Projects</Typography.Title>
          <nav aria-label="Task filters">
            {(['All', 'Active', 'Completed'] as const).map((value) => (
              <Button
                key={value}
                type="text"
                block
                aria-pressed={filter === value}
                className={`filter-button${filter === value ? ' filter-button-active' : ''}`}
                onClick={() => setFilter(value)}
              >
                {value === 'All' ? 'All tasks' : value}
              </Button>
            ))}
          </nav>
        </Layout.Sider>

        <Layout.Content className="workspace-main">
          <header className="workspace-header">
            <div>
              <Typography.Title level={2}>Task workspace</Typography.Title>
              <Typography.Text type="secondary">Ant Design compatibility scenario</Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              data-layout-key="add-task"
              onClick={() => setAddOpen(true)}
            >
              Add task
            </Button>
          </header>

          <section className="task-list-region" aria-label="Tasks" data-layout-key="task-list">
            <List
              dataSource={visibleTasks}
              locale={{ emptyText: 'No tasks match this filter' }}
              renderItem={(task) => (
                <List.Item
                  className="task-row"
                  data-layout-key={`task-${task.id}`}
                  actions={[
                    <Dropdown
                      key="actions"
                      menu={{ items: menuItems(task) }}
                      placement="bottomRight"
                      trigger={['click']}
                    >
                      <Button
                        aria-label={`Actions for ${task.title}`}
                        icon={<MoreOutlined />}
                        data-layout-key={`task-${task.id}-menu-trigger`}
                      />
                    </Dropdown>,
                  ]}
                >
                  <List.Item.Meta
                    title={task.title}
                    description={task.description}
                  />
                  <Tag color={task.status === 'Completed' ? 'green' : 'blue'}>{task.status}</Tag>
                </List.Item>
              )}
            />
          </section>
        </Layout.Content>
      </Layout>

      <Modal
        title="Delete task?"
        open={pendingDelete !== null}
        okText="Delete"
        okButtonProps={{ danger: true }}
        destroyOnHidden
        onOk={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        mask={{ closable: true }}
        styles={{
          mask: {
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            pointerEvents: 'auto',
          },
        }}
        data-layout-key="delete-dialog"
      >
        <p>{pendingDelete ? `“${pendingDelete.title}” will be permanently removed.` : ''}</p>
      </Modal>

      <Modal
        title="Add task"
        open={addOpen}
        okText="Add task"
        okButtonProps={{ disabled: !draftTitle.trim() }}
        destroyOnHidden
        onOk={addTask}
        onCancel={() => setAddOpen(false)}
        mask={{ closable: true }}
      >
        <div className="task-form">
          <label htmlFor="ant-task-title">Title</label>
          <Input
            id="ant-task-title"
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
          />
          <label htmlFor="ant-task-description">Description</label>
          <Input.TextArea
            id="ant-task-description"
            rows={3}
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
          />
        </div>
      </Modal>
      </AntApp>
    </ConfigProvider>
  )
}

export function mountTaskWorkspace(container: Element): Root {
  const root = createRoot(container)
  root.render(<TaskWorkspace />)
  return root
}
