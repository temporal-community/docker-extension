import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReadinessCheck } from '../types';
import { InfoSection } from './InfoSection';

interface ServerStatusPanelProps {
  running: boolean;
  lastStatusCheck: Date | null;
  checks: ReadinessCheck[];
}

export function ServerStatusPanel({ running, lastStatusCheck, checks }: ServerStatusPanelProps) {
  const readinessChecks = checks.filter((check) => check.label !== 'Container');

  return (
    <InfoSection title="Server">
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">State</Typography>
          <Chip label={running ? 'Running' : 'Stopped'} size="small" color={running ? 'success' : 'default'} sx={{ height: 20, fontSize: 10 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Last check</Typography>
          <Typography variant="caption" color="text.secondary">
            {lastStatusCheck ? lastStatusCheck.toLocaleTimeString() : '—'}
          </Typography>
        </Box>

        <Divider />

        {readinessChecks.map((check) => (
          <Box key={check.label} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 1, alignItems: 'center' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" display="block">{check.label}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                {check.detail}
              </Typography>
            </Box>
            <Chip
              label={check.ok ? 'Ready' : 'Waiting'}
              size="small"
              color={check.ok ? 'success' : 'default'}
              sx={{ height: 20, fontSize: 10 }}
            />
          </Box>
        ))}
      </Stack>
    </InfoSection>
  );
}
