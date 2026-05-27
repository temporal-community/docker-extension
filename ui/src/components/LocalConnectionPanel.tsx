import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { NAMESPACE, TEMPORAL_GRPC_ENDPOINT, TEMPORAL_WEB_URL } from '../constants';
import { InfoSection } from './InfoSection';

const rows = [
  ['Namespace', NAMESPACE],
  ['gRPC', TEMPORAL_GRPC_ENDPOINT],
  ['Web UI', new URL(TEMPORAL_WEB_URL).host],
] as const;

interface LocalConnectionPanelProps {
  onCopy: (value: string) => void;
}

export function LocalConnectionPanel({ onCopy }: LocalConnectionPanelProps) {
  return (
    <InfoSection title="Local Dev Connection">
      <Stack spacing={0.75}>
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) auto', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography
              variant="caption"
              fontFamily="monospace"
              noWrap
              sx={{ bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 0.5 }}
            >
              {value}
            </Typography>
            <Button size="small" variant="text" onClick={() => onCopy(value)} sx={{ minWidth: 0, px: 0.75 }}>
              Copy
            </Button>
          </Box>
        ))}
      </Stack>
    </InfoSection>
  );
}
