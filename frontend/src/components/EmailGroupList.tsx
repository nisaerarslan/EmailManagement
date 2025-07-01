import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
  TextField,
  Button,
  Box,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import emailGroupService, { EmailGroup } from '../services/emailGroupService';
import EmailGroupDialog from './EmailGroupDialog';

const EmailGroupList: React.FC = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<EmailGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [newEmail, setNewEmail] = useState<{ [key: number]: string }>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGroups = async () => {
    try {
      const fetchedGroups = await emailGroupService.getUserGroups();
      setGroups(fetchedGroups);
      setError('');
    } catch (err) {
      setError(t('emailGroups.error.fetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [t]);

  const handleToggleGroup = (groupId: number) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleAddMember = async (groupId: number) => {
    const email = newEmail[groupId]?.trim();
    if (!email) return;

    try {
      await emailGroupService.addMember(groupId, email);
      setNewEmail((prev) => ({ ...prev, [groupId]: '' }));
      await fetchGroups();
    } catch (err) {
      setError(t('emailGroups.error.addMember'));
    }
  };

  const handleDeleteMember = async (groupId: number, memberId: number) => {
    try {
      await emailGroupService.deleteMember(groupId, memberId);
      await fetchGroups();
    } catch (err) {
      setError(t('emailGroups.error.removeMember'));
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    try {
      await emailGroupService.deleteGroup(groupId);
      await fetchGroups();
    } catch (err) {
      setError(t('emailGroups.error.delete'));
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div>{error}</div>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{t('emailGroups.title')}</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          {t('emailGroups.create')}
        </Button>
      </Box>

      <List>
        {groups.map((group) => (
          <React.Fragment key={group.group_id}>
            <ListItem>
              <ListItemText primary={group.group_name} />
              <IconButton onClick={() => handleToggleGroup(group.group_id)}>
                {expandedGroups.includes(group.group_id) ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </IconButton>
              <IconButton
                edge="end"
                onClick={() => handleDeleteGroup(group.group_id)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
            <Collapse
              in={expandedGroups.includes(group.group_id)}
              timeout="auto"
              unmountOnExit
            >
              <List component="div" disablePadding>
                {group.members.map((member) => (
                  <ListItem key={member.member_id} sx={{ pl: 4 }}>
                    <ListItemText primary={member.email} />
                    <IconButton
                      edge="end"
                      onClick={() =>
                        handleDeleteMember(group.group_id, member.member_id)
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
                <ListItem sx={{ pl: 4 }}>
                  <TextField
                    size="small"
                    placeholder={t('emailGroups.addMember')}
                    value={newEmail[group.group_id] || ''}
                    onChange={(e) =>
                      setNewEmail((prev) => ({
                        ...prev,
                        [group.group_id]: e.target.value,
                      }))
                    }
                    sx={{ mr: 1 }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleAddMember(group.group_id)}
                  >
                    {t('emailGroups.addMember')}
                  </Button>
                </ListItem>
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </List>

      <EmailGroupDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGroupCreated={fetchGroups}
      />
    </Box>
  );
};

export default EmailGroupList; 