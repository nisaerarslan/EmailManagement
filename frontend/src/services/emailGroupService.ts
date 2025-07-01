import api from './api';

export interface EmailGroupMember {
  member_id: number;
  group_id: number;
  email: string;
  created_at: string;
}

export interface EmailGroup {
  group_id: number;
  user_id: number;
  group_name: string;
  created_at: string;
  updated_at: string;
  members: EmailGroupMember[];
}

const emailGroupService = {
  async createGroup(groupName: string): Promise<EmailGroup> {
    const response = await api.post('/email-groups', { group_name: groupName });
    return response.data;
  },

  async addMember(groupId: number, email: string): Promise<EmailGroupMember> {
    const response = await api.post(`/email-groups/${groupId}/members`, { email });
    return response.data;
  },

  async getUserGroups(): Promise<EmailGroup[]> {
    const response = await api.get('/email-groups');
    return response.data.groups;
  },

  async getGroup(groupId: number): Promise<EmailGroup> {
    const response = await api.get(`/email-groups/${groupId}`);
    return response.data;
  },

  async deleteGroup(groupId: number): Promise<void> {
    await api.delete(`/email-groups/${groupId}`);
  },

  async deleteMember(groupId: number, memberId: number): Promise<void> {
    await api.delete(`/email-groups/${groupId}/members/${memberId}`);
  }
};

export default emailGroupService; 