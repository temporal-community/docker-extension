import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

interface ClearHistoryDialogProps {
  confirmValue: string;
  onCancel: () => void;
  onConfirm: () => void;
  onConfirmValueChange: (value: string) => void;
  open: boolean;
}

export function ClearHistoryDialog({
  confirmValue,
  onCancel,
  onConfirm,
  onConfirmValueChange,
  open,
}: ClearHistoryDialogProps) {
  const canClear = confirmValue.trim().toUpperCase() === 'RESET';

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Reset Temporal History</DialogTitle>
      <DialogContent>
        <DialogContentText>This deletes local workflow history from the Docker volume and restarts the dev server with a fresh SQLite database.</DialogContentText>
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          {[
            'Workflow execution history',
            'Workflow state data',
            'Namespace configuration',
            'The local SQLite database in temporal-dev-data',
          ].map(item => (
            <Typography key={item} component="li" variant="body2" color="text.secondary">{item}</Typography>
          ))}
        </Box>
        <DialogContentText sx={{ mt: 2 }}>
          Type <strong>RESET</strong> to confirm.
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Confirmation"
          value={confirmValue}
          onChange={(event) => onConfirmValueChange(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={!canClear}>Reset History</Button>
      </DialogActions>
    </Dialog>
  );
}
