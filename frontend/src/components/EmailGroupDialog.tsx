import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import emailGroupService from '../services/emailGroupService';

interface EmailGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

const EmailGroupDialog: React.FC<EmailGroupDialogProps> = ({ open, onClose, onGroupCreated }) => {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError(t('emailGroups.error.nameRequired'));
      return;
    }

    try {
      await emailGroupService.createGroup(groupName);
      setGroupName('');
      setError('');
      onGroupCreated();
      onClose();
    } catch (err) {
      setError(t('emailGroups.error.create'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('emailGroups.create')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('emailGroups.name')}
            type="text"
            fullWidth
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            error={!!error}
            helperText={error}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('emailGroups.cancel')}</Button>
          <Button type="submit" variant="contained" color="primary">
            {t('emailGroups.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EmailGroupDialog; 