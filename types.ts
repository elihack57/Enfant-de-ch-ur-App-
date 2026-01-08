
export enum TransactionType {
  INCOME = 'RECETTE',
  EXPENSE = 'DEPENSE'
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  memberId?: string;
  activityId?: string;
  isArchived?: boolean; // New: Protects historical data from editing
}

export type MemberRole = 
  | 'Premier Responsable' 
  | 'Responsable Trésorier' 
  | 'Responsable Secrétaire' 
  | 'Responsable' 
  | 'Enfant de Chœur';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  role: MemberRole;
  phone?: string;
  
  isNewMember: boolean;
  registrationFeePaid: number;
  grade?: string;
  monthlyDuesPaid?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  location: string;
  costChild: number;
  costResponsable: number;
  isArchived?: boolean; // New: Protects historical activities
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  TRANSACTIONS = 'TRANSACTIONS',
  MEMBERS = 'MEMBERS',
  ACTIVITIES = 'ACTIVITIES',
  AI_ASSISTANT = 'AI_ASSISTANT',
  SETTINGS = 'SETTINGS'
}

export type AppTheme = 'light' | 'dark' | 'system';
