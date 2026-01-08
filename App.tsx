
import React, { useState, useEffect } from 'react';
import { INITIAL_TRANSACTIONS, INITIAL_MEMBERS, INITIAL_CATEGORIES, INITIAL_ACTIVITIES } from './constants';
import { Transaction, Member, ViewState, Category, TransactionType, AppTheme, Activity } from './types';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { MemberList } from './components/MemberList';
import { AIAssistant } from './components/AIAssistant';
import { CategoryManager } from './components/CategoryManager';
import { ActivityManager } from './components/ActivityManager';
import { LayoutDashboard, Receipt, Users, Sparkles, Menu, X, Settings, CalendarHeart, Church, History } from 'lucide-react';

function App() {
  // State
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Data State with Robust Persistence
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch (e) {
      console.error("Erreur chargement transactions", e);
      return INITIAL_TRANSACTIONS;
    }
  });

  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem('members');
      return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    } catch (e) {
      console.error("Erreur chargement membres", e);
      return INITIAL_MEMBERS;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('categories');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch (e) {
      console.error("Erreur chargement catégories", e);
      return INITIAL_CATEGORIES;
    }
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('activities');
      return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
    } catch (e) {
      console.error("Erreur chargement activités", e);
      return INITIAL_ACTIVITIES;
    }
  });

  // ARCHIVES STATE (Hidden history)
  const [archives, setArchives] = useState<{ 
      transactions: Transaction[], 
      activities: Activity[], 
      membersSnapshot?: Member[],
      carryOverSnapshot?: Transaction 
  } | null>(() => {
    try {
        const saved = localStorage.getItem('archives');
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        return null;
    }
  });

  // ARCHIVE MODE STATE (Read-Only View)
  const [isArchiveMode, setIsArchiveMode] = useState(false);
  const [tempCurrentData, setTempCurrentData] = useState<{
      transactions: Transaction[],
      members: Member[],
      activities: Activity[]
  } | null>(null);

  // Logo State - Default is empty string, no 'logo.png' fallback
  const [logo, setLogo] = useState<string>(() => {
    return localStorage.getItem('app_logo') || '';
  });

  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('theme') as AppTheme) || 'system';
  });

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('theme', theme);

    // Listen for system changes if in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Persistence Effects - ONLY IF NOT IN ARCHIVE MODE
  // We don't want to overwrite current data with archive data in localStorage
  useEffect(() => {
    if (!isArchiveMode) {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }
  }, [transactions, isArchiveMode]);

  useEffect(() => {
    if (!isArchiveMode) {
        localStorage.setItem('members', JSON.stringify(members));
    }
  }, [members, isArchiveMode]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (!isArchiveMode) {
        localStorage.setItem('activities', JSON.stringify(activities));
    }
  }, [activities, isArchiveMode]);

  useEffect(() => {
      if (archives) {
          try {
            localStorage.setItem('archives', JSON.stringify(archives));
          } catch (e) {
            console.error("Archives too large for localStorage", e);
          }
      } else {
          localStorage.removeItem('archives');
      }
  }, [archives]);

  // Handlers
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    if (isArchiveMode) return;
    const tx: Transaction = {
      ...newTx,
      id: Math.random().toString(36).substr(2, 9)
    };
    setTransactions([tx, ...transactions]);
  };

  const handleDeleteTransaction = (id: string) => {
    if (isArchiveMode) return;
    const transactionToDelete = transactions.find(t => t.id === id);
    
    if (transactionToDelete && transactionToDelete.memberId && transactionToDelete.category === 'Inscriptions') {
        setMembers(prevMembers => prevMembers.map(member => {
            if (member.id === transactionToDelete.memberId) {
                const newAmount = Math.max(0, (member.registrationFeePaid || 0) - transactionToDelete.amount);
                return { ...member, registrationFeePaid: newAmount };
            }
            return member;
        }));
    }
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleAddMember = (newMember: Omit<Member, 'id'>, transactionDate?: string) => {
    if (isArchiveMode) return;
    const memberId = Math.random().toString(36).substr(2, 9);
    const m: Member = { ...newMember, id: memberId };
    setMembers([...members, m]);

    if (newMember.registrationFeePaid > 0) {
        const description = newMember.role === 'Enfant de Chœur' 
            ? `Inscription: ${newMember.lastName} ${newMember.firstName} (${newMember.isNewMember ? 'Nouveau' : 'Ancien'})`
            : `Inscription Responsable: ${newMember.lastName} ${newMember.firstName}`;

        const autoTransaction: Transaction = {
            id: Math.random().toString(36).substr(2, 9),
            date: transactionDate || new Date().toISOString().split('T')[0],
            amount: newMember.registrationFeePaid,
            type: TransactionType.INCOME,
            category: 'Inscriptions',
            description: description,
            memberId: memberId
        };
        setTransactions(prev => [autoTransaction, ...prev]);
    }
  };

  const handleUpdateMember = (id: string, updatedMember: Partial<Member>) => {
    if (isArchiveMode) return;
    const oldMember = members.find(m => m.id === id);
    if (!oldMember) return;

    // On construit le nouvel objet membre complet
    const newMember = { ...oldMember, ...updatedMember };
    
    // Mise à jour de l'état des membres
    setMembers(members.map(m => m.id === id ? newMember : m));

    // Détection des changements qui impactent la transaction (Montant, Nom/Prénom, ou Statut)
    const amountChanged = updatedMember.registrationFeePaid !== undefined && updatedMember.registrationFeePaid !== oldMember.registrationFeePaid;
    const nameChanged = (updatedMember.lastName !== undefined && updatedMember.lastName !== oldMember.lastName) ||
                        (updatedMember.firstName !== undefined && updatedMember.firstName !== oldMember.firstName);
    const statusChanged = updatedMember.isNewMember !== undefined && updatedMember.isNewMember !== oldMember.isNewMember;

    if (amountChanged || nameChanged || statusChanged) {
        const transactionIndex = transactions.findIndex(t => t.memberId === id && t.category === 'Inscriptions' && !t.isArchived);
        
        if (transactionIndex >= 0) {
            // Mise à jour d'une transaction existante
            const updatedTransactions = [...transactions];
            const txToUpdate = { ...updatedTransactions[transactionIndex] };

            if (amountChanged) {
                txToUpdate.amount = newMember.registrationFeePaid;
            }

            if (nameChanged || statusChanged) {
                // Reconstruction de la description avec les nouveaux noms et/ou statut
                const description = newMember.role === 'Enfant de Chœur' 
                    ? `Inscription: ${newMember.lastName} ${newMember.firstName} (${newMember.isNewMember ? 'Nouveau' : 'Ancien'})`
                    : `Inscription Responsable: ${newMember.lastName} ${newMember.firstName}`;
                txToUpdate.description = description;
            }

            updatedTransactions[transactionIndex] = txToUpdate;
            setTransactions(updatedTransactions);

        } else if (newMember.registrationFeePaid > 0 && amountChanged) {
             // Création d'une transaction si elle n'existait pas (cas rare si on passe de 0 à X)
             const description = newMember.role === 'Enfant de Chœur' 
                ? `Inscription (Mise à jour): ${newMember.lastName} ${newMember.firstName} (${newMember.isNewMember ? 'Nouveau' : 'Ancien'})`
                : `Inscription Responsable (Mise à jour): ${newMember.lastName} ${newMember.firstName}`;

            const newTx: Transaction = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString().split('T')[0],
                amount: newMember.registrationFeePaid,
                type: TransactionType.INCOME,
                category: 'Inscriptions',
                description: description,
                memberId: id
            };
            setTransactions([newTx, ...transactions]);
        }
    }
  };

  const handleDeleteMember = (id: string) => {
    if (isArchiveMode) return;
    setMembers(members.filter(m => m.id !== id));
    setTransactions(transactions.filter(t => t.memberId !== id));
  };

  const handleToggleDues = (id: string) => {
    if (isArchiveMode) return;
    setMembers(members.map(m => m.id === id ? { ...m, monthlyDuesPaid: !m.monthlyDuesPaid } : m));
  };

  const handleUpdateRegistration = (id: string, amountToAdd: number) => {
      if (isArchiveMode) return;
      setMembers(members.map(m => {
          if(m.id === id) {
              const newAmount = (m.registrationFeePaid || 0) + amountToAdd;
              const updateTransaction: Transaction = {
                id: Math.random().toString(36).substr(2, 9),
                date: new Date().toISOString().split('T')[0],
                amount: amountToAdd,
                type: TransactionType.INCOME,
                category: 'Inscriptions',
                description: `Régularisation Inscription: ${m.lastName} ${m.firstName}`,
                memberId: m.id
              };
              setTransactions(prev => [updateTransaction, ...prev]);
              return { ...m, registrationFeePaid: newAmount };
          }
          return m;
      }));
  };

  // Activity Management Handlers
  const handleAddActivity = (newActivity: Omit<Activity, 'id'>) => {
    if (isArchiveMode) return;
    const act = { ...newActivity, id: Math.random().toString(36).substr(2, 9) };
    setActivities([...activities, act]);
  };

  const handleUpdateActivity = (id: string, updatedActivity: Partial<Activity>) => {
    if (isArchiveMode) return;
    setActivities(activities.map(a => a.id === id ? { ...a, ...updatedActivity } : a));
  };

  const handleDeleteActivity = (id: string) => {
    if (isArchiveMode) return;
    setActivities(activities.filter(a => a.id !== id));
    setTransactions(transactions.filter(t => t.activityId !== id));
  };

  const handleRegisterMemberToActivity = (activityId: string, memberId: string) => {
     if (isArchiveMode) return;
     const activity = activities.find(a => a.id === activityId);
     const member = members.find(m => m.id === memberId);
     if (!activity || !member) return;

     // Détermination du coût en fonction du rôle
     const amountToPay = member.role === 'Enfant de Chœur' ? activity.costChild : activity.costResponsable;

     const newTx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        amount: amountToPay,
        type: TransactionType.INCOME,
        category: 'Activités (Sorties, Rentrée, AG)', 
        description: `Participation ${activity.name}: ${member.lastName} ${member.firstName}`,
        memberId: memberId,
        activityId: activityId
     };
     setTransactions([newTx, ...transactions]);
  };

  const handleUnregisterMemberFromActivity = (activityId: string, memberId: string) => {
      if (isArchiveMode) return;
      // Find the specific transaction linking this member to this activity
      const txToDelete = transactions.find(t => t.activityId === activityId && t.memberId === memberId);
      if (txToDelete) {
          setTransactions(transactions.filter(t => t.id !== txToDelete.id));
      }
  };

  // Category & Data Management
  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
      if (isArchiveMode) return;
      const category: Category = { ...newCat, id: Math.random().toString(36).substr(2, 9) };
      setCategories([...categories, category]);
  };

  const handleUpdateCategory = (id: string, updatedCat: Partial<Category>) => {
      if (isArchiveMode) return;
      const oldCategory = categories.find(c => c.id === id);
      setCategories(categories.map(c => c.id === id ? { ...c, ...updatedCat } : c));

      // Cascade : Si le nom a changé, on met à jour l'historique des transactions
      if (oldCategory && updatedCat.name && oldCategory.name !== updatedCat.name) {
          const oldName = oldCategory.name;
          const newName = updatedCat.name;
          setTransactions(prev => prev.map(t => 
              t.category === oldName ? { ...t, category: newName } : t
          ));
      }
  };

  const handleDeleteCategory = (id: string) => {
      if (isArchiveMode) return;
      setCategories(categories.filter(c => c.id !== id));
  };

  const handleResetData = () => {
    if (isArchiveMode) return;
    setTransactions([]);
    setMembers([]);
    setActivities([]);
    setArchives(null);
    setLogo('');
    localStorage.removeItem('app_logo');
    localStorage.removeItem('archives');
    // On garde les catégories pour ne pas casser l'app si elles sont personnalisées
  };

  const handleUpdateLogo = (file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          const base64String = reader.result as string;
          setLogo(base64String);
          localStorage.setItem('app_logo', base64String);
      };
      reader.readAsDataURL(file);
  };

  // --- ARCHIVE & HISTORY LOGIC (STRICT SNAPSHOT SWAP) ---
  const handleEnterArchiveMode = () => {
      if (!archives) return;
      
      // 1. Save Current State
      setTempCurrentData({
          transactions,
          members,
          activities
      });

      // 2. Load Snapshot State (Past)
      // Force isArchived to true on everything just in case, to match lock UI
      const historyTransactions = archives.transactions.map(t => ({...t, isArchived: true}));
      const historyActivities = archives.activities.map(a => ({...a, isArchived: true}));
      
      // Load members snapshot if exists, otherwise load empty or current (but members snapshot is crucial)
      const historyMembers = archives.membersSnapshot || []; 

      setTransactions(historyTransactions);
      setActivities(historyActivities);
      setMembers(historyMembers);
      
      // 3. Lock UI
      setIsArchiveMode(true);
      
      alert("MODE HISTORIQUE ACTIVÉ (LECTURE SEULE).\n\nVous consultez les données de l'année précédente telles qu'elles ont été clôturées.\n- Aucune modification possible.\n- Aucune nouvelle transaction n'apparaît ici.\n- Cliquez sur 'Quitter l'historique' pour revenir à l'année en cours.");
  };

  const handleExitArchiveMode = () => {
      if (!isArchiveMode || !tempCurrentData) return;
      
      // Restore Current State
      setTransactions(tempCurrentData.transactions);
      setMembers(tempCurrentData.members);
      setActivities(tempCurrentData.activities);
      
      setTempCurrentData(null);
      setIsArchiveMode(false);
      
      alert("Retour à la gestion de l'année en cours.");
  };

  // --- BACKUP & RESTORE LOGIC ---
  const handleExportData = (fileNamePrefix: string = 'Sauvegarde_Tresorerie_EC', dataOverride?: any) => {
    const dataToExport = dataOverride || {
        transactions,
        members,
        categories,
        activities,
        archives, // Include archives in standard backup
        logo,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const json = JSON.parse(content);
            
            // DETECT TYPE
            const isSmartArchive = 
                json.meta === 'FISCAL_YEAR_SMART_ARCHIVE' || 
                (json.archiveData !== undefined) || 
                (json.carryOverTransaction !== undefined);

            if (isSmartArchive) {
                if(!window.confirm("Fichier de Démarrage Nouvelle Année détecté.\n\nVoulez-vous charger la nouvelle année et archiver l'historique ?")) {
                    return;
                }

                // RECOVER DATA (With Fallbacks)
                
                // A. Active Transactions (Report à Nouveau)
                let newTransactions: Transaction[] = [];
                if (json.carryOverTransaction) {
                     newTransactions = [{ ...json.carryOverTransaction, isArchived: false }];
                } else {
                     newTransactions = [{
                        id: `AUTO_REPORT_${Date.now()}`,
                        date: new Date().toISOString().split('T')[0],
                        amount: 0,
                        type: TransactionType.INCOME,
                        category: 'Report à Nouveau',
                        description: 'Report à Nouveau (Reconstitué)',
                        isArchived: false
                    }];
                }

                // B. Members
                let newMembers: Member[] = [];
                if (Array.isArray(json.activeMembers)) {
                    newMembers = json.activeMembers;
                } else if (Array.isArray(json.members)) {
                    newMembers = json.members.map((m: any) => ({...m, registrationFeePaid: 0, isNewMember: false}));
                }

                // C. Categories
                let newCategories = INITIAL_CATEGORIES;
                if (Array.isArray(json.categories)) newCategories = json.categories;

                // D. Archives
                let newArchives = null;
                if (json.archiveData) {
                    newArchives = json.archiveData;
                    if (!newArchives.carryOverSnapshot && json.carryOverTransaction) {
                        newArchives.carryOverSnapshot = json.carryOverTransaction;
                    }
                } else if (Array.isArray(json.transactions)) {
                     newArchives = {
                        transactions: json.transactions.map((t:any) => ({...t, isArchived: true})),
                        activities: (json.activities || []).map((a:any) => ({...a, isArchived: true})),
                        membersSnapshot: json.members || []
                     };
                }

                // E. Logo
                if (json.logo) {
                    setLogo(json.logo);
                    localStorage.setItem('app_logo', json.logo);
                }

                // APPLY STATE
                setTransactions(newTransactions);
                setMembers(newMembers);
                setActivities([]); // Always clear active activities for new year
                setCategories(newCategories);
                setArchives(newArchives);
                setIsArchiveMode(false); // Ensure we start in edit mode

                // PERSIST IMMEDIATELY
                localStorage.setItem('transactions', JSON.stringify(newTransactions));
                localStorage.setItem('members', JSON.stringify(newMembers));
                localStorage.setItem('categories', JSON.stringify(newCategories));
                localStorage.setItem('activities', JSON.stringify([]));
                if (newArchives) {
                    try {
                        localStorage.setItem('archives', JSON.stringify(newArchives));
                    } catch (err) {
                        console.error("Archives too big", err);
                    }
                }

                alert(`NOUVELLE ANNÉE CHARGÉE !\n\n- Report : ${newTransactions[0].amount} FCFA\n- Membres : ${newMembers.length}\n- Archives : Disponibles`);
                return;
            }

            // 2. Standard Backup
            if (Array.isArray(json.transactions) && Array.isArray(json.members)) {
                 setTransactions(json.transactions);
                 setMembers(json.members);
                 setCategories(json.categories || INITIAL_CATEGORIES);
                 setActivities(json.activities || []);
                 setArchives(json.archives || null);
                 setIsArchiveMode(false);
                 
                 // PERSIST STANDARD
                 localStorage.setItem('transactions', JSON.stringify(json.transactions));
                 localStorage.setItem('members', JSON.stringify(json.members));
                 
                 if (json.logo) {
                    setLogo(json.logo);
                    localStorage.setItem('app_logo', json.logo);
                 }
                 alert("Sauvegarde standard restaurée avec succès.");
            } else {
                alert("Format de fichier non reconnu ou corrompu.");
            }

        } catch (error) {
            console.error(error);
            alert("Erreur critique lors de la lecture du fichier JSON.");
        }
    };
    reader.readAsText(file);
  };

  // --- FISCAL YEAR CLOSING (SMART) ---
  const handleCloseFiscalYear = () => {
      if (isArchiveMode) return;
      
      // 1. Calcul du solde actuel
      const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
      const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
      const balance = income - expense;

      // 2. Préparation du "Futur" (Nouvelle Année)
      const reportTransaction: Transaction = {
          id: `FY_${new Date().getFullYear()}_${Math.random().toString(36).substr(2, 5)}`,
          date: new Date().toISOString().split('T')[0],
          amount: Math.abs(balance),
          type: balance >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
          category: 'Report à Nouveau',
          description: `Report à Nouveau (Solde Année Précédente)`,
          isArchived: false
      };

      const resetMembers = members.map(m => ({
          ...m,
          isNewMember: false,
          registrationFeePaid: 0,
          monthlyDuesPaid: false
      }));

      // 3. Préparation de l'historique (Snapshot)
      const archivedTransactions = transactions.map(t => ({ ...t, isArchived: true }));
      const archivedActivities = activities.map(a => ({ ...a, isArchived: true }));
      const membersSnapshot = [...members]; // Current state of members

      // 4. Création de l'objet "Smart Archive"
      const smartArchiveData = {
          meta: 'FISCAL_YEAR_SMART_ARCHIVE',
          exportDate: new Date().toISOString(),
          logo: logo || '',
          categories: categories,
          
          // Data for the Active State (New Year)
          carryOverTransaction: reportTransaction,
          activeMembers: resetMembers,
          
          // Data for the Hidden State (Archive)
          archiveData: {
              transactions: archivedTransactions, 
              activities: archivedActivities,     
              membersSnapshot: membersSnapshot,
              carryOverSnapshot: reportTransaction 
          }
      };

      // 5. Export du fichier Spécial
      handleExportData('DEMARRAGE_NOUVELLE_ANNEE', smartArchiveData);

      // 6. Application immédiate des changements
      setTransactions([reportTransaction]);
      setMembers(resetMembers);
      setActivities([]);
      setArchives(smartArchiveData.archiveData);
      localStorage.setItem('archives', JSON.stringify(smartArchiveData.archiveData));

      alert(`CLÔTURE GÉNÉRÉE !\n\nLe fichier 'DEMARRAGE_NOUVELLE_ANNEE' a été téléchargé.\nC'est ce fichier que vous devrez utiliser pour restaurer l'application en cas de réinitialisation.`);
  };

  // Navigation
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Tableau de bord', icon: <LayoutDashboard size={22} strokeWidth={1.5} /> },
    { id: ViewState.TRANSACTIONS, label: 'Opérations', icon: <Receipt size={22} strokeWidth={1.5} /> },
    { id: ViewState.MEMBERS, label: 'Membres', icon: <Users size={22} strokeWidth={1.5} /> },
    { id: ViewState.ACTIVITIES, label: 'Activités', icon: <CalendarHeart size={22} strokeWidth={1.5} /> },
    { id: ViewState.AI_ASSISTANT, label: 'Assistant IA', icon: <Sparkles size={22} strokeWidth={1.5} /> },
    { id: ViewState.SETTINGS, label: 'Paramètres', icon: <Settings size={22} strokeWidth={1.5} /> },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 h-screen w-72 bg-white dark:bg-slate-800 z-50 transition-all duration-300 ease-out shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] md:shadow-none border-r border-slate-100 dark:border-slate-700
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none overflow-hidden relative">
                    {logo ? (
                        <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <Church className="text-slate-300 dark:text-slate-500" size={24} />
                    )}
                </div>
                <div>
                    <h1 className="font-bold text-lg text-slate-900 dark:text-white leading-none">Trésorerie</h1>
                    <span className="text-xs font-medium text-slate-400 tracking-wide">Enfant de Chœur</span>
                </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                <X size={24} />
            </button>
        </div>

        <nav className="px-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-medium group ${
                currentView === item.id 
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className={`transition-transform duration-200 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-8">
            {isArchiveMode ? (
                 <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 animate-pulse">
                     <p className="text-xs text-amber-600 dark:text-amber-500 font-bold uppercase mb-1 flex items-center gap-1">
                        <History size={12} /> Historique
                     </p>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                         <span className="text-sm text-amber-800 dark:text-amber-300 font-bold">Lecture Seule</span>
                     </div>
                 </div>
            ) : (
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                     <p className="text-xs text-slate-400 font-medium uppercase mb-1">Trésorier</p>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                         <span className="text-sm text-slate-600 dark:text-slate-200 font-semibold">Connecté</span>
                     </div>
                 </div>
            )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        {/* Header Mobile */}
        <div className="md:hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between sticky top-0 z-30">
             <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                 {logo ? (
                    <img src={logo} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
                 ) : (
                    <Church className="text-slate-600 dark:text-slate-300" size={20} />
                 )}
                 Trésorerie
             </div>
             <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 dark:text-slate-300 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full">
                 <Menu size={24} />
             </button>
        </div>

        <div className="p-6 md:p-10 max-w-[1600px] mx-auto animate-fade-in pb-6">
          {/* Archive Banner */}
          {isArchiveMode && (
              <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center">
                          <History size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-lg text-amber-800 dark:text-amber-300">Mode Historique (Lecture Seule)</h3>
                          <p className="text-amber-700/80 dark:text-amber-400 text-sm">
                              Vous consultez les archives de l'année précédente. Aucune modification n'est possible.
                          </p>
                      </div>
                  </div>
                  <button 
                    onClick={handleExitArchiveMode}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition"
                  >
                      Quitter l'historique
                  </button>
              </div>
          )}

          {currentView === ViewState.DASHBOARD && (
            <Dashboard 
              transactions={transactions} 
              membersCount={members.length}
              unpaidMembersCount={members.filter(m => {
                  const target = m.isNewMember ? 5000 : 2500;
                  if (m.role !== 'Enfant de Chœur') return false;
                  return (m.registrationFeePaid || 0) < target;
              }).length}
            />
          )}
          
          {currentView === ViewState.TRANSACTIONS && (
            <TransactionList 
              transactions={transactions} 
              categories={categories} 
              members={members}
              activities={activities}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onAddMember={handleAddMember}
              logo={logo}
              isArchiveMode={isArchiveMode}
            />
          )}
          
          {currentView === ViewState.MEMBERS && (
            <MemberList 
              members={members} 
              onToggleDues={handleToggleDues}
              onDeleteMember={handleDeleteMember}
              onAddMember={handleAddMember}
              onUpdateRegistration={handleUpdateRegistration}
              onUpdateMember={handleUpdateMember}
              isArchiveMode={isArchiveMode}
            />
          )}

          {currentView === ViewState.ACTIVITIES && (
            <ActivityManager
               activities={activities}
               members={members}
               transactions={transactions}
               onAddActivity={handleAddActivity}
               onUpdateActivity={handleUpdateActivity}
               onDeleteActivity={handleDeleteActivity}
               onRegisterMember={handleRegisterMemberToActivity}
               onUnregisterMember={handleUnregisterMemberFromActivity}
               logo={logo}
               isArchiveMode={isArchiveMode}
            />
          )}
          
          {currentView === ViewState.AI_ASSISTANT && (
            <div className="max-w-3xl mx-auto">
               <div className="mb-8 text-center">
                   <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Assistant Trésorier</h2>
                   <p className="text-slate-500 dark:text-slate-400">Une question sur les finances ? L'IA vous répond.</p>
               </div>
               <AIAssistant transactions={transactions} members={members} categories={categories} activities={activities} />
            </div>
          )}

          {currentView === ViewState.SETTINGS && (
             <CategoryManager 
                categories={categories}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                theme={theme}
                onThemeChange={setTheme}
                onResetData={handleResetData}
                onExportData={() => handleExportData()}
                onImportData={handleImportData}
                logo={logo}
                onUpdateLogo={(file) => handleUpdateLogo(file)}
                onCloseFiscalYear={handleCloseFiscalYear}
                archives={archives}
                onMergeArchives={handleEnterArchiveMode}
                onHideArchives={handleExitArchiveMode}
                isArchiveMode={isArchiveMode}
             />
          )}

          {/* Copyright Footer */}
          <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
             <p className="text-xs text-slate-400 font-medium">
                © {new Date().getFullYear()} - Développé par <span className="text-blue-600 dark:text-blue-400 font-semibold">Elisée N'guessan</span>
             </p>
          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
