import React, { useState, useEffect, useRef } from 'react';
import { Users, ChevronDown, Plus, X, Search, Trash2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import emailGroupService, { EmailGroup } from '../services/emailGroupService';
import Button from './ui/Button';
import Dialog from './ui/Dialog';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface EmailGroupsWidgetProps {
  onSelectEmails?: (emails: string[]) => void;
}

const EmailGroupsWidget: React.FC<EmailGroupsWidgetProps> = ({ onSelectEmails }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [groups, setGroups] = useState<EmailGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<EmailGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; group: EmailGroup | null }>({
    isOpen: false,
    group: null
  });
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateGroup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchGroups = async () => {
    try {
      const fetchedGroups = await emailGroupService.getUserGroups();
      setGroups(fetchedGroups);
    } catch (error) {
      console.error(t('emailGroups.error.fetch'), error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await emailGroupService.createGroup(newGroupName);
      setNewGroupName('');
      setShowCreateGroup(false);
      await fetchGroups();
      toast.success(t('emailGroups.success.created'));
    } catch (error) {
      console.error(t('emailGroups.error.create'), error);
      toast.error(t('emailGroups.error.create'));
    }
  };

  const handleAddEmail = async () => {
    if (!selectedGroup || !newEmail.trim()) return;
    try {
      await emailGroupService.addMember(selectedGroup.group_id, newEmail);
      setNewEmail('');
      await fetchGroups();
      toast.success(t('emailGroups.success.memberAdded'));
    } catch (error) {
      console.error(t('emailGroups.error.addMember'), error);
      toast.error(t('emailGroups.error.addMember'));
    }
  };

  const handleSelectGroup = (group: EmailGroup) => {
    if (onSelectEmails) {
      const emails = group.members.map(member => member.email);
      onSelectEmails(emails);
    }
    setSelectedGroup(group === selectedGroup ? null : group);
  };

  const handleDeleteGroup = async (group: EmailGroup) => {
    setDeleteDialog({ isOpen: true, group });
  };

  const confirmDeleteGroup = async () => {
    if (!deleteDialog.group) return;

    try {
      await emailGroupService.deleteGroup(deleteDialog.group.group_id);
      await fetchGroups();
      setSelectedGroup(null);
      toast.success(t('emailGroups.success.deleted'));
    } catch (error) {
      console.error(t('emailGroups.error.delete'), error);
      toast.error(t('emailGroups.error.delete'));
    } finally {
      setDeleteDialog({ isOpen: false, group: null });
    }
  };

  const handleDeleteMember = async (groupId: number, memberId: number) => {
    try {
      await emailGroupService.deleteMember(groupId, memberId);
      await fetchGroups();
      toast.success(t('emailGroups.success.memberRemoved'));
    } catch (error) {
      console.error(t('emailGroups.error.removeMember'), error);
      toast.error(t('emailGroups.error.removeMember'));
    }
  };

  const filteredGroups = groups.filter(group => 
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.members.some(member => member.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div ref={widgetRef} className="col-span-2">
        <div className={cn(
          "rounded-xl shadow-sm border p-6 backdrop-blur-lg",
          isDark 
            ? "bg-gray-800/80 border-gray-700" 
            : "bg-white/80 border-gray-200"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className={cn(
                "h-6 w-6",
                isDark ? "text-blue-400" : "text-sky-500"
              )} />
              <h3 className={cn(
                "text-base font-medium",
                isDark ? "text-white" : "text-gray-900"
              )}>{t('emailGroups.title')}</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateGroup(true)}
              className={cn(
                "flex items-center gap-2",
                isDark ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"
              )}
            >
              <Plus className="h-4 w-4" />
              <span>{t('emailGroups.create')}</span>
            </Button>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('emailGroups.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2 border rounded-md bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                isDark 
                  ? "border-gray-600 text-gray-200 placeholder:text-gray-500" 
                  : "border-gray-300 text-gray-700 placeholder:text-gray-400"
              )}
            />
          </div>

          {showCreateGroup && (
            <div className={cn(
              "mb-4 p-4 rounded-lg border backdrop-blur-sm",
              isDark 
                ? "bg-gray-700/50 border-gray-600" 
                : "bg-white/50 border-gray-200"
            )}>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t('emailGroups.name')}
                className={cn(
                  "w-full p-2 mb-3 border rounded-md text-sm",
                  isDark 
                    ? "bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400" 
                    : "bg-white/50 border-gray-200 text-gray-800 placeholder:text-gray-500"
                )}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="primary" 
                  onClick={handleCreateGroup}
                  className={isDark ? "" : "bg-sky-500 hover:bg-sky-600"}
                >
                  {t('emailGroups.save')}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowCreateGroup(false)}>
                  {t('emailGroups.cancel')}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {filteredGroups.map((group) => (
              <div
                key={group.group_id}
                className={cn(
                  "rounded-lg border overflow-hidden backdrop-blur-sm",
                  isDark ? "border-gray-700" : "border-gray-200"
                )}
              >
                <div className={cn(
                  "flex items-center justify-between p-3 transition-colors",
                  isDark 
                    ? "bg-gray-700/50 hover:bg-gray-700/70" 
                    : "bg-white/50 hover:bg-white/70"
                )}>
                  <button
                    onClick={() => handleSelectGroup(group)}
                    className="flex items-center gap-3 flex-grow"
                  >
                    <Users className={cn(
                      "h-5 w-5",
                      isDark ? "text-gray-300" : "text-gray-500"
                    )} />
                    <span className={cn(
                      "font-medium",
                      isDark ? "text-white" : "text-gray-800"
                    )}>{group.group_name}</span>
                    <span className={cn(
                      "text-sm",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                      ({group.members.length} {t('emailGroups.members')})
                    </span>
                  </button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group);
                    }}
                    className={cn(
                      "ml-2 hover:text-red-500",
                      isDark ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {selectedGroup?.group_id === group.group_id && (
                  <div className={cn(
                    "p-3 border-t",
                    isDark 
                      ? "border-gray-700 bg-gray-800/50" 
                      : "border-gray-200 bg-gray-50/50"
                  )}>
                    <div className="flex items-center mb-3 gap-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder={t('emailGroups.addEmail')}
                        className={cn(
                          "flex-grow p-2 text-sm border rounded-md",
                          isDark 
                            ? "bg-gray-700/70 border-gray-600 text-white placeholder:text-gray-400" 
                            : "bg-white/70 border-gray-200 text-gray-800 placeholder:text-gray-500"
                        )}
                      />
                      <Button size="sm" onClick={handleAddEmail}>
                        {t('emailGroups.add')}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {group.members.map((member) => (
                        <div
                          key={member.member_id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded",
                            isDark 
                              ? "bg-gray-700/50 text-gray-200" 
                              : "bg-white/50 text-gray-800"
                          )}
                        >
                          <span className="text-sm truncate flex-1">{member.email}</span>
                          <button
                            onClick={() => handleDeleteMember(group.group_id, member.member_id)}
                            className={cn(
                              "ml-2 p-1 rounded-full transition-colors",
                              isDark 
                                ? "text-gray-400 hover:text-red-400 hover:bg-red-900/30" 
                                : "text-gray-500 hover:text-red-500 hover:bg-red-50"
                            )}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className={cn(
                "text-center py-8 rounded-lg border",
                isDark 
                  ? "bg-gray-800/50 border-gray-700 text-gray-400" 
                  : "bg-white/50 border-gray-200 text-gray-500"
              )}>
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('emailGroups.empty')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, group: null })}
        onConfirm={confirmDeleteGroup}
        title={t('emailGroups.delete.title')}
        description={t('emailGroups.delete.confirm', { name: deleteDialog.group?.group_name })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        icon={
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        }
      />
    </>
  );
};

export default EmailGroupsWidget; 