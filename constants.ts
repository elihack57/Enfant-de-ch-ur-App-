
import { Category, Member, Transaction, TransactionType, Activity } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  // Catégorie Système (Mise en avant pour la clôture)
  { id: 'sys_report', name: 'Report à Nouveau', type: TransactionType.INCOME, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' },

  // Recettes
  { id: 'inc1', name: 'Inscriptions', type: TransactionType.INCOME, color: 'bg-green-100 text-green-800' },
  { id: 'inc2', name: 'Activités (Sorties, Rentrée, AG)', type: TransactionType.INCOME, color: 'bg-blue-100 text-blue-800' },
  { id: 'inc3', name: 'Dons', type: TransactionType.INCOME, color: 'bg-emerald-100 text-emerald-800' },
  
  // Dépenses
  { id: 'exp1', name: 'Achats (Livrets)', type: TransactionType.EXPENSE, color: 'bg-purple-100 text-purple-800' },
  { id: 'exp2', name: 'Paiements divers', type: TransactionType.EXPENSE, color: 'bg-orange-100 text-orange-800' },
  { id: 'exp3', name: 'Transport', type: TransactionType.EXPENSE, color: 'bg-red-100 text-red-800' },
];

export const CHOIR_GRADES = [
  'Samuel',
  'Tarcicius',
  'Céroféraire A',
  'Céroféraire B',
  'Acolyte A',
  'Acolyte B',
  'Acolyte C',
  'Thuriféraire A',
  'Thuriféraire B',
  'Cérémoniaire'
];

export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_ACTIVITIES: Activity[] = [];
