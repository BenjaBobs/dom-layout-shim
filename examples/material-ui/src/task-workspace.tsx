import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { type MouseEvent, useState } from 'react';

type Task = {
  id: number;
  title: string;
  description: string;
  status: 'Active' | 'Completed';
};

type TaskFilter = 'All' | Task['status'];

const initialTasks: Task[] = [
  {
    id: 1,
    title: 'Review the responsive navigation proposal',
    description:
      'Check the narrow viewport behavior and record any layout limitations.',
    status: 'Active',
  },
  {
    id: 2,
    title: 'Verify the release checklist',
    description:
      'Confirm documentation, parity records, and package output are current.',
    status: 'Completed',
  },
  {
    id: 3,
    title: 'Prepare compatibility notes',
    description:
      'Summarize overlay positioning and coordinate-based interaction results.',
    status: 'Active',
  },
];

function layoutKey(value: string): Record<string, string> {
  return { 'data-layout-key': value };
}

export function TaskWorkspace() {
  const [tasks, setTasks] = useState(initialTasks);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const visibleTasks =
    filter === 'All' ? tasks : tasks.filter(task => task.status === filter);

  function openMenu(event: MouseEvent<HTMLElement>, task: Task): void {
    setMenuAnchor(event.currentTarget);
    setSelectedTask(task);
  }

  function requestDelete(): void {
    setMenuAnchor(null);
    setDialogOpen(true);
  }

  function deleteTask(): void {
    if (selectedTask) {
      setTasks(current => current.filter(task => task.id !== selectedTask.id));
    }
    setDialogOpen(false);
    setNotice('Task deleted');
    setNoticeOpen(true);
  }

  function addTask(): void {
    const title = draftTitle.trim();
    if (!title) return;

    setTasks(current => [
      ...current,
      {
        id: Math.max(0, ...current.map(task => task.id)) + 1,
        title,
        description: draftDescription.trim() || 'No description provided.',
        status: 'Active',
      },
    ]);
    setDraftTitle('');
    setDraftDescription('');
    setAddDialogOpen(false);
    setFilter('All');
    setNotice('Task added');
    setNoticeOpen(true);
  }

  return (
    <Box
      data-layout-key="workspace"
      sx={{ minHeight: '100vh', bgcolor: '#f4f6f8', color: '#17212b' }}
    >
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#263238' }}>
        <Toolbar>
          <Typography variant="h6" component="h1">
            Task workspace
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: 960,
          margin: '0 auto',
          padding: 3,
          gap: 3,
          boxSizing: 'border-box',
        }}
      >
        <Box
          data-layout-key="sidebar"
          component="nav"
          aria-label="Task filters"
          sx={{
            width: 176,
            flexShrink: 0,
            bgcolor: '#fff',
            padding: 2,
            borderRadius: 2,
          }}
        >
          <Typography variant="overline">Projects</Typography>
          <Stack spacing={1} sx={{ marginTop: 1 }}>
            {(['All', 'Active', 'Completed'] as const).map(value => (
              <Button
                key={value}
                data-layout-key={`filter-${value.toLowerCase()}`}
                variant={filter === value ? 'contained' : 'text'}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === 'All' ? 'All tasks' : value}
              </Button>
            ))}
          </Stack>
        </Box>
        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ marginBottom: 2 }}
          >
            <Box>
              <Typography variant="h5" component="h2">
                Release preparation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {visibleTasks.length}{' '}
                {visibleTasks.length === 1 ? 'task' : 'tasks'} shown
              </Typography>
            </Box>
            <Button
              data-layout-key="underlying-control"
              variant="contained"
              onClick={() => setAddDialogOpen(true)}
            >
              Add task
            </Button>
          </Stack>
          <List
            data-layout-key="task-list"
            aria-label="Project tasks"
            sx={{
              height: 360,
              overflow: 'auto',
              bgcolor: '#fff',
              padding: 1,
              borderRadius: 2,
            }}
          >
            {visibleTasks.map(task => (
              <ListItem
                data-layout-key={`task-${task.id}`}
                key={task.id}
                divider
                secondaryAction={
                  <IconButton
                    data-layout-key={`task-${task.id}-menu-trigger`}
                    aria-label={`Actions for ${task.title}`}
                    onClick={event => openMenu(event, task)}
                  >
                    <span aria-hidden="true">•••</span>
                  </IconButton>
                }
              >
                <ListItemText
                  primary={task.title}
                  secondary={task.description}
                />
                <Chip
                  label={task.status}
                  size="small"
                  color={task.status === 'Completed' ? 'success' : 'primary'}
                />
              </ListItem>
            ))}
            {visibleTasks.length === 0 && (
              <Typography
                sx={{ padding: 3, textAlign: 'center' }}
                color="text.secondary"
              >
                No tasks match this filter
              </Typography>
            )}
          </List>
        </Box>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ root: { ...layoutKey('task-menu') } }}
        transitionDuration={0}
      >
        <MenuItem data-layout-key="delete-action" onClick={requestDelete}>
          Delete task
        </MenuItem>
      </Menu>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        transitionDuration={0}
        slotProps={{
          backdrop: { ...layoutKey('delete-backdrop') },
          paper: { ...layoutKey('delete-dialog') },
        }}
      >
        <DialogTitle>Delete task?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedTask
              ? `“${selectedTask.title}” will be permanently removed.`
              : 'This task will be permanently removed.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            data-layout-key="delete-cancel"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={deleteTask}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        transitionDuration={0}
        slotProps={{ paper: { ...layoutKey('add-dialog') } }}
      >
        <DialogTitle>Add task</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, minWidth: 360 }}>
          <TextField
            autoFocus
            required
            label="Title"
            value={draftTitle}
            onChange={event => setDraftTitle(event.target.value)}
            slotProps={{ htmlInput: { ...layoutKey('task-title-input') } }}
            sx={{ marginTop: 1 }}
          />
          <TextField
            label="Description"
            multiline
            minRows={2}
            value={draftDescription}
            onChange={event => setDraftDescription(event.target.value)}
            slotProps={{
              htmlInput: { ...layoutKey('task-description-input') },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            data-layout-key="add-submit"
            variant="contained"
            disabled={!draftTitle.trim()}
            onClick={addTask}
          >
            Add task
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={noticeOpen}
        autoHideDuration={4000}
        onClose={() => setNoticeOpen(false)}
      >
        <Alert severity="success">{notice}</Alert>
      </Snackbar>
    </Box>
  );
}
