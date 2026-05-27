import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { InfoSection } from './InfoSection';

interface WorkerStatusPanelProps {
  running: boolean;
  workerPollerCount: number;
  workerActiveQueueCount: number;
  workerQueueCount: number;
  lastWorkerCheck: Date | null;
}

export function WorkerStatusPanel({
  running,
  workerPollerCount,
  workerActiveQueueCount,
  workerQueueCount,
  lastWorkerCheck,
}: WorkerStatusPanelProps) {
  const label = !running
    ? 'Server stopped'
    : workerQueueCount === 0
      ? 'No task queues'
      : workerPollerCount > 0
        ? 'Workers active'
        : 'No workers polling';

  return (
    <InfoSection title="Worker Status">
      <Stack spacing={0.75}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">State</Typography>
          <Chip
            label={label}
            size="small"
            color={!running ? 'default' : workerPollerCount > 0 ? 'success' : 'warning'}
            sx={{ height: 20, fontSize: 10 }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Workers</Typography>
          <Typography variant="caption">{workerPollerCount}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Active queues</Typography>
          <Typography variant="caption">{workerActiveQueueCount}/{workerQueueCount}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Last check</Typography>
          <Typography variant="caption" color="text.secondary">
            {lastWorkerCheck ? lastWorkerCheck.toLocaleTimeString() : '—'}
          </Typography>
        </Box>
      </Stack>
    </InfoSection>
  );
}
