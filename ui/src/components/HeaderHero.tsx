import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HANDOFF_LINKS, workflowListUrl } from '../constants';
import { ddClient } from '../dockerClient';

interface HeaderHeroProps {
  logoUrl: string;
  running: boolean;
  busy: boolean;
}

export function HeaderHero({ logoUrl, running, busy }: HeaderHeroProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        flexShrink: 0,
        mb: 1.5,
      }}
    >
      <Box component="img" src={logoUrl} alt="Temporal" sx={{ width: { xs: 220, sm: 280 }, maxWidth: '100%', height: 'auto' }} />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: running ? 'success.main' : 'action.disabled',
              boxShadow: running ? 2 : 0,
            }}
          />
          <Typography variant="body2" color="text.secondary">{running ? 'Running' : 'Stopped'}</Typography>
        </Box>
        {running && HANDOFF_LINKS.map(({ label, query }) => (
          <Button
            key={label}
            size="small"
            variant={query ? 'outlined' : 'contained'}
            disabled={busy}
            onClick={() => ddClient.host.openExternal(workflowListUrl(query))}
          >
            {label} ↗
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
