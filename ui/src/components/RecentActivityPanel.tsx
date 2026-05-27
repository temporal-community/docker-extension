import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import { STATUS_MAP, workflowListUrl, workflowUrl } from '../constants';
import { ddClient } from '../dockerClient';
import type { Workflow } from '../types';
import { relativeTime } from '../utils';

interface RecentActivityPanelProps {
  busy: boolean;
  lastWorkflowCheck: Date | null;
  onRefresh: () => void;
  running: boolean;
  workflows: Workflow[];
}

export function RecentActivityPanel({
  busy,
  lastWorkflowCheck,
  onRefresh,
  running,
  workflows,
}: RecentActivityPanelProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box sx={{ px: 2, py: 0.75, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="overline">Recent Activity</Typography>
        {workflows.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {workflows.length}{workflows.length === 20 ? '+' : ''}
          </Typography>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastWorkflowCheck && (
            <Typography variant="caption" color="text.secondary">
              Updated {lastWorkflowCheck.toLocaleTimeString()}
            </Typography>
          )}
          <Button size="small" variant="text" disabled={!running || busy} onClick={onRefresh} sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: 11, textTransform: 'none' }}>
            Refresh
          </Button>
          <Button size="small" variant="text" disabled={!running || busy} onClick={() => ddClient.host.openExternal(workflowListUrl())} sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: 11, textTransform: 'none' }}>
            Open all ↗
          </Button>
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {workflows.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ p: 3, textAlign: 'center' }}>
            {running ? 'No recent workflows yet. Open Temporal UI to start exploring.' : 'Start the server, then open Temporal UI for workflow inspection.'}
          </Typography>
        ) : (
          <List dense disablePadding>
            {workflows.map((wf) => {
              const { workflowId, runId } = wf.execution;
              const { label, color } = STATUS_MAP[wf.status] ?? { label: wf.status, color: 'default' as const };
              const startTime = wf.startTime ?? wf.executionTime;
              return (
                <ListItem
                  key={runId}
                  divider
                  sx={{
                    px: 2,
                    py: 1,
                    transition: 'background-color 120ms ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, width: '100%' }}>
                    <Chip label={label} color={color} size="small" sx={{ flexShrink: 0, fontSize: 10, height: 20 }} />
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
                    <Button size="small" sx={{ ml: 1 }} onClick={() => ddClient.host.openExternal(workflowUrl(wf))}>
                      View in Temporal UI →
                    </Button>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}
