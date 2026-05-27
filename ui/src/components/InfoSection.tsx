import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface InfoSectionProps {
  title: string;
  children: ReactNode;
}

export function InfoSection({ title, children }: InfoSectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="overline" display="block" sx={{ lineHeight: 1.5, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
