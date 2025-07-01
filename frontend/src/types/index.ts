export interface User {
  id: string;
  username: string;
  email: string;
}

export interface EmailAccount {
  id: string;
  type: 'gmail' | 'outlook';
  email: string;
  userId: string;
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  content: string;
  date: string;
  read: boolean;
  accountId: string;
  folder: 'inbox' | 'sent' | 'trash';
}