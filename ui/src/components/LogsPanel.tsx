import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import type { RefObject } from 'react';
import type { LogEntry } from '../types';

interface LogsPanelProps {
  logRef: RefObject<HTMLDivElement>;
  logs: LogEntry[];
  logsMinimized: boolean;
  setLogsMinimized: (next: boolean | ((prev: boolean) => boolean)) => void;
  setShowAllLogs: (next: boolean | ((prev: boolean) => boolean)) => void;
  showAllLogs: boolean;
  visibleLogs: LogEntry[];
}

export function LogsPanel({
  logRef,
  logs,
  logsMinimized,
  setLogsMinimized,
  setShowAllLogs,
  showAllLogs,
  visibleLogs,
}: LogsPanelProps) {
  const logColor = { success: 'success.main', error: 'error.main', info: 'info.main' } as const;
  const logBadge = {
    success: { label: 'OK', bg: 'success.main' },
    error: { label: 'ERR', bg: 'error.main' },
    info: { label: 'INFO', bg: 'info.main' },
  } as const;

  return (
    <Dialog open={!logsMinimized} onClose={() => setLogsMinimized(true)} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h6" component="span">Troubleshoot Startup</Typography>
        {logs.length > 0 && (
          <Typography variant="caption" color="text.secondary">{logs.length} entries</Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          ref={logRef}
          sx={{
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            minHeight: 180,
            maxHeight: { xs: 320, md: 420 },
            overflowY: 'auto',
            px: 2,
            py: 1,
          }}
        >
          {visibleLogs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              No startup logs yet.
            </Typography>
          ) : visibleLogs.map((entry, i) => (
            <Box key={`${entry.time}-${i}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.25 }}>
              <Box
                sx={{
                  mt: 0.2,
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 0.5,
                  bgcolor: logBadge[entry.type].bg,
                  color: 'common.white',
                  fontSize: 9,
                  lineHeight: 1.4,
                  fontWeight: 700,
                  minWidth: 28,
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                {logBadge[entry.type].label}
              </Box>
              <Typography variant="caption" display="block" fontFamily="monospace" color={logColor[entry.type]} sx={{ lineHeight: 1.7 }}>
                [{entry.time}] {entry.msg}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box>
          {logs.length > 40 && (
            <Button size="small" variant="text" onClick={() => setShowAllLogs((v) => !v)}>
              {showAllLogs ? 'Show less' : 'Show more'}
            </Button>
          )}
        </Box>
        <Button onClick={() => setLogsMinimized(true)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
