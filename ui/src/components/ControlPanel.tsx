import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { SOURCE_CODE_URL, TEMPORAL_WEB_URL } from '../constants';
import { ddClient } from '../dockerClient';
import type { DiagnosticItem, ReadinessCheck } from '../types';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { LocalConnectionPanel } from './LocalConnectionPanel';
import { ServerStatusPanel } from './ServerStatusPanel';
import { WorkerStatusPanel } from './WorkerStatusPanel';

interface ControlPanelProps {
  busy: boolean;
  diagnostics: DiagnosticItem[];
  lastStatusCheck: Date | null;
  lastWorkerCheck: Date | null;
  logCount: number;
  onClearClick: () => void;
  onCopy: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  onTroubleshootClick: () => void;
  readinessChecks: ReadinessCheck[];
  running: boolean;
  workerActiveQueueCount: number;
  workerPollerCount: number;
  workerQueueCount: number;
}

export function ControlPanel({
  busy,
  diagnostics,
  lastStatusCheck,
  lastWorkerCheck,
  logCount,
  onClearClick,
  onCopy,
  onStart,
  onStop,
  onTroubleshootClick,
  readinessChecks,
  running,
  workerActiveQueueCount,
  workerPollerCount,
  workerQueueCount,
}: ControlPanelProps) {
  return (
    <Stack
      sx={{
        width: { xs: '100%', md: 320 },
        flexShrink: 0,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Stack
        spacing={1.5}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          pr: 0.25,
        }}
      >
        <LocalConnectionPanel onCopy={onCopy} />
        <ServerStatusPanel running={running} lastStatusCheck={lastStatusCheck} checks={readinessChecks} />
        <WorkerStatusPanel
          running={running}
          workerPollerCount={workerPollerCount}
          workerActiveQueueCount={workerActiveQueueCount}
          workerQueueCount={workerQueueCount}
          lastWorkerCheck={lastWorkerCheck}
        />
        <DiagnosticsPanel diagnostics={diagnostics} />
      </Stack>

      <Stack spacing={1.25} sx={{ flexShrink: 0, pt: 1.25 }}>
        <Button
          variant="contained"
          fullWidth
          disabled={!running || busy}
          onClick={() => ddClient.host.openExternal(TEMPORAL_WEB_URL)}
        >
          Open Temporal UI ↗
        </Button>

        <Divider />

        {!running ? (
          <Button variant="contained" fullWidth disabled={busy} onClick={onStart}>
            Start Server
          </Button>
        ) : (
          <Button variant="contained" fullWidth color="warning" disabled={busy} onClick={onStop}>
            Stop Server
          </Button>
        )}

        <Button variant="text" color="error" fullWidth disabled={busy} onClick={onClearClick}>
          Clear History
        </Button>

        <Divider />

        <Button
          variant="outlined"
          fullWidth
          onClick={() => ddClient.host.openExternal(SOURCE_CODE_URL)}
        >
          View Source Code ↗
        </Button>

        <Button variant="outlined" fullWidth onClick={onTroubleshootClick}>
          Troubleshoot Startup{logCount > 0 ? ` (${logCount})` : ''}
        </Button>
      </Stack>
    </Stack>
  );
}
