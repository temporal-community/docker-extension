import { useEffect, useState, useCallback, useRef } from 'react';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CssBaseline from '@mui/material/CssBaseline';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';

import logoUrl from '../temporal-logo-horizontal.svg?url';

const ddClient = createDockerDesktopClient();

// ── Theme ─────────────────────────────────────────────────────────────────────
// Use Docker Desktop's injected theme if available, otherwise fall back to dark.
declare global { interface Window { __ddMuiV5Themes?: { dark: object; light: object } } }

function useDockerTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const injected = window.__ddMuiV5Themes;
  if (injected) {
    return createTheme(injected[prefersDark ? 'dark' : 'light']);
  }
  return createTheme({ palette: { mode: prefersDark ? 'dark' : 'light' } });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogEntry {
  msg: string;
  type: 'success' | 'error' | 'info';
  time: string;
}

interface Workflow {
  execution: { workflowId: string; runId: string };
  type?: { name: string };
  status: string;
  startTime?: string;
  executionTime?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'default' | 'warning' }> = {
  WORKFLOW_EXECUTION_STATUS_RUNNING:          { label: 'Running',    color: 'success' },
  WORKFLOW_EXECUTION_STATUS_COMPLETED:        { label: 'Completed',  color: 'info'    },
  WORKFLOW_EXECUTION_STATUS_FAILED:           { label: 'Failed',     color: 'error'   },
  WORKFLOW_EXECUTION_STATUS_CANCELED:         { label: 'Canceled',   color: 'default' },
  WORKFLOW_EXECUTION_STATUS_TERMINATED:       { label: 'Terminated', color: 'default' },
  WORKFLOW_EXECUTION_STATUS_CONTINUED_AS_NEW: { label: 'Continued',  color: 'info'    },
  WORKFLOW_EXECUTION_STATUS_TIMED_OUT:        { label: 'Timed Out',  color: 'warning' },
};

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const [running, setRunning]       = useState(false);
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [workflows, setWorkflows]   = useState<Workflow[]>([]);
  const [clearOpen, setClearOpen]   = useState(false);
  const [busy, setBusy]             = useState(false);
  const [logsMinimized, setLogsMinimized] = useState(() => {
    try {
      return window.localStorage.getItem('temporal.logsMinimized') === 'true';
    } catch {
      return false;
    }
  });
  const logRef                      = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    try {
      window.localStorage.setItem('temporal.logsMinimized', String(logsMinimized));
    } catch {
      // Ignore storage errors.
    }
  }, [logsMinimized]);

  const checkStatus = useCallback(async () => {
    try {
      const result = await ddClient.docker.cli.exec('ps', [
        '--filter', 'name=temporal-dev', '--format', '{{.Status}}'
      ]);
      setRunning(Boolean(result.stdout?.includes('Up')));
    } catch {
      setRunning(false);
    }
  }, []);

  const refreshWorkflows = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8233/api/v1/namespaces/default/workflows?pageSize=20');
      if (!res.ok) { setWorkflows([]); return; }
      const data = await res.json();
      setWorkflows(data.executions ?? []);
    } catch {
      setWorkflows([]);
    }
  }, []);

  // Poll status and workflows
  useEffect(() => {
    checkStatus();
    const si = setInterval(checkStatus, 5000);
    const wi = setInterval(refreshWorkflows, 10000);
    return () => { clearInterval(si); clearInterval(wi); };
  }, [checkStatus, refreshWorkflows]);

  // Refresh workflows when running state changes
  useEffect(() => {
    if (running) refreshWorkflows();
    else setWorkflows([]);
  }, [running, refreshWorkflows]);

  // ── Server helpers ───────────────────────────────────────────────────────

  async function waitForReady(maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch('http://localhost:8233');
        if (res.ok || res.status === 405) return true;
      } catch { /* not ready yet */ }
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  }

  async function startServer() {
    addLog('Creating data volume...', 'info');
    try {
      await ddClient.docker.cli.exec('volume', ['create', 'temporal-dev-data']);
      addLog('Volume ready', 'success');
    } catch { addLog('Using existing volume', 'info'); }

    try {
      await ddClient.docker.cli.exec('run', [
        '--rm', '-v', 'temporal-dev-data:/data', 'alpine', 'chmod', '777', '/data',
      ]);
    } catch { /* permissions may already be set */ }

    addLog('Creating network...', 'info');
    try {
      await ddClient.docker.cli.exec('network', ['create', 'temporal-network']);
      addLog('Network ready', 'success');
    } catch { addLog('Using existing network', 'info'); }

    addLog('Starting Temporal...', 'info');
    await ddClient.docker.cli.exec('run', [
      '-d', '--name', 'temporal-dev',
      '--network', 'temporal-network',
      '-p', '7233:7233', '-p', '8233:8233',
      '-v', 'temporal-dev-data:/data',
      'temporalio/temporal:latest',
      'server', 'start-dev',
      '--ip', '0.0.0.0', '--ui-ip', '0.0.0.0',
      '--db-filename', '/data/temporal.db',
    ]);
    addLog('Temporal container started', 'success');
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleStart() {
    setBusy(true);
    try {
      try { await ddClient.docker.cli.exec('rm', ['-f', 'temporal-dev']); } catch { /* ok */ }
      await startServer();
      addLog('Waiting for Temporal to be ready...', 'info');
      if (await waitForReady()) {
        addLog('Ready — click "Open Temporal UI" to launch', 'success');
        await checkStatus();
        await refreshWorkflows();
      } else {
        addLog('Temporal did not respond within 30s', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { stderr?: string })?.stderr ?? 'Unknown error';
      addLog('Error: ' + msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    try {
      await ddClient.docker.cli.exec('rm', ['-f', 'temporal-dev']);
      addLog('Temporal stopped', 'success');
      try { await ddClient.docker.cli.exec('network', ['rm', 'temporal-network']); } catch { /* ok */ }
      await checkStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog('Error: ' + msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setClearOpen(false);
    setBusy(true);
    addLog('Clearing history...', 'info');
    try {
      try { await ddClient.docker.cli.exec('rm', ['-f', 'temporal-dev']); addLog('Containers stopped', 'success'); }
      catch { addLog('No containers to remove', 'info'); }

      try { await ddClient.docker.cli.exec('volume', ['rm', 'temporal-dev-data']); addLog('Data volume removed', 'success'); }
      catch { addLog('Volume already removed', 'info'); }

      try { await ddClient.docker.cli.exec('network', ['rm', 'temporal-network']); } catch { /* ok */ }

      addLog('Restarting with fresh database...', 'info');
      await startServer();
      if (await waitForReady()) {
        addLog('Ready with fresh database', 'success');
        await checkStatus();
        await refreshWorkflows();
      } else {
        addLog('Temporal did not respond within 30s', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { stderr?: string })?.stderr ?? 'Unknown error';
      addLog('Error: ' + msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const theme = useDockerTheme();
  const logColor = { success: 'success.main', error: 'error.main', info: 'info.main' } as const;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* Header */}
        <AppBar position="static" elevation={0}>
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            <Box component="img" src={logoUrl} alt="Temporal" sx={{ height: 28, mr: 'auto' }} />
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%',
              bgcolor: running ? 'success.main' : 'action.disabled',
              boxShadow: running ? '0 0 6px' : 'none',
              color: running ? 'success.main' : 'transparent',
            }} />
            <Typography variant="body2" color="inherit" sx={{ opacity: 0.85 }}>
              {running ? 'Running' : 'Stopped'}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Body */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: Controls */}
          <Stack
            spacing={1.5}
            sx={{
              width: 240, flexShrink: 0, p: 2,
              bgcolor: 'background.paper',
              borderRight: 1, borderColor: 'divider',
              overflowY: 'auto',
            }}
          >
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="overline" display="block" sx={{ lineHeight: 1.5, mb: 1 }}>
                Endpoints
              </Typography>
              <Stack spacing={0.75}>
                {([['gRPC', 'localhost:7233'], ['Web UI', 'localhost:8233']] as const).map(([label, addr]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="caption" fontFamily="monospace"
                      sx={{ bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 0.5 }}>
                      {addr}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Button
              variant="contained"
              fullWidth
              disabled={!running || busy}
              onClick={() => ddClient.host.openExternal('http://localhost:8233')}
            >
              Open Temporal UI ↗
            </Button>

            <Divider />

            {!running ? (
              <Button variant="outlined" fullWidth disabled={busy} onClick={handleStart}>
                Start Server
              </Button>
            ) : (
              <Button variant="outlined" fullWidth disabled={busy} onClick={handleStop}>
                Stop Server
              </Button>
            )}

            <Button variant="outlined" color="error" fullWidth disabled={busy} onClick={() => setClearOpen(true)}>
              Clear History
            </Button>
          </Stack>

          {/* Right: Workflows + Logs */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Workflows */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ px: 2, py: 0.75, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="overline">Recent Workflows</Typography>
                {workflows.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {workflows.length}{workflows.length === 20 ? '+' : ''}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {workflows.length === 0 ? (
                  <Typography variant="body2" color="text.disabled" sx={{ p: 3, textAlign: 'center' }}>
                    {running ? 'No workflows yet' : 'Start the server to see workflows'}
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {workflows.map((wf) => {
                      const { workflowId, runId } = wf.execution;
                      const { label, color } = STATUS_MAP[wf.status] ?? { label: wf.status, color: 'default' as const };
                      const startTime = wf.startTime ?? wf.executionTime;
                      const url = `http://localhost:8233/namespaces/default/workflows/${encodeURIComponent(workflowId)}/${encodeURIComponent(runId)}/history`;
                      return (
                        <ListItem
                          key={runId}
                          divider
                          sx={{ px: 2, py: 1 }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, width: '100%' }}>
                            <Chip
                              label={label}
                              color={color}
                              size="small"
                              sx={{ flexShrink: 0, fontSize: 10, height: 20 }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="caption" fontFamily="monospace" display="block" noWrap>
                                {workflowId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                {wf.type?.name}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                              {relativeTime(startTime)}
                            </Typography>
                            <Button
                              size="small"
                              sx={{ ml: 1 }}
                              onClick={() => ddClient.host.openExternal(url)}
                            >
                              View →
                            </Button>
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Box>
            </Box>

            {/* Logs */}
            <Box
              sx={{
                height: logsMinimized ? 42 : 180,
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderBottom: logsMinimized ? 0 : 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 42,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="overline">Logs</Typography>
                  {logs.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {logs.length}
                    </Typography>
                  )}
                </Box>
                <Tooltip title={logsMinimized ? 'Expand logs' : 'Minimize logs'}>
                  <IconButton
                    size="small"
                    onClick={() => setLogsMinimized((v) => !v)}
                    aria-label={logsMinimized ? 'Expand logs' : 'Minimize logs'}
                  >
                    <Typography component="span" sx={{ fontSize: 14, lineHeight: 1 }}>
                      {logsMinimized ? '▸' : '▾'}
                    </Typography>
                  </IconButton>
                </Tooltip>
              </Box>
              {!logsMinimized && (
                <Box ref={logRef} sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
                  {logs.map((entry, i) => (
                    <Typography
                      key={i}
                      variant="caption"
                      display="block"
                      fontFamily="monospace"
                      color={logColor[entry.type]}
                      sx={{ lineHeight: 1.7 }}
                    >
                      [{entry.time}] {entry.msg}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>

          </Box>
        </Box>

        {/* Clear History Dialog */}
        <Dialog open={clearOpen} onClose={() => setClearOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Clear Temporal History</DialogTitle>
          <DialogContent>
            <DialogContentText>This will permanently delete:</DialogContentText>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              {[
                'All workflow execution history',
                'All workflow state data',
                'All namespace configurations',
                'The entire SQLite database',
              ].map(item => (
                <Typography key={item} component="li" variant="body2" color="text.secondary">{item}</Typography>
              ))}
            </Box>
            <DialogContentText sx={{ mt: 1 }}>
              <strong>The server will restart with a fresh database.</strong>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearOpen(false)}>Cancel</Button>
            <Button onClick={handleClear} color="error" variant="contained">Clear History</Button>
          </DialogActions>
        </Dialog>

      </Box>
    </ThemeProvider>
  );
}
