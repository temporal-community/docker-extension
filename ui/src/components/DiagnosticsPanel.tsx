import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DiagnosticItem } from '../types';

interface DiagnosticsPanelProps {
  diagnostics: DiagnosticItem[];
}

export function DiagnosticsPanel({ diagnostics }: DiagnosticsPanelProps) {
  if (diagnostics.length === 0) return null;

  return (
    <Stack spacing={1}>
      {diagnostics.map((diagnostic) => (
        <Alert key={`${diagnostic.title}-${diagnostic.detail}`} severity={diagnostic.severity}>
          <Typography variant="subtitle2">{diagnostic.title}</Typography>
          <Typography variant="body2">{diagnostic.detail}</Typography>
        </Alert>
      ))}
    </Stack>
  );
}
