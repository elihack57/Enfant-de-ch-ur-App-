
import React, { useState } from 'react';
import { Category, TransactionType, AppTheme, Transaction, Activity } from '../types';
import { Plus, Trash2, Pencil, X, Check, Palette, ArrowDownLeft, ArrowUpRight, Moon, Sun, Monitor, AlertOctagon, Smartphone, Download, Upload, Database, HardDriveDownload, Image, Archive, ArrowRight, History, Eye, EyeOff } from 'lucide-react';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (c: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, c: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  theme: AppTheme;
  onThemeChange: (t: AppTheme) => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  logo: string;
  onUpdateLogo: (file: File) => void;
  onCloseFiscalYear: () => void;
  
  // Archives Props
  archives?: { transactions: Transaction[], activities: Activity[] } | null;
  onMergeArchives?: () => void;
  onHideArchives?: () => void;
  isArchiveMode?: boolean;
}

const COLOR_PALETTE = [
  { name: 'Rouge', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', bg: 'bg-red-500' },
  { name: 'Orange', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', bg: 'bg-orange-500' },
  { name: 'Ambre', class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', bg: 'bg-amber-500' },
  { name: 'Jaune', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', bg: 'bg-yellow-500' },
  { name: 'Citron', class: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300', bg: 'bg-lime-500' },
  { name: 'Vert', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', bg: 'bg-green-500' },
  { name: 'Émeraude', class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', bg: 'bg-emerald-500' },
  { name: 'Cyan', class: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', bg: 'bg-cyan-500' },
  { name: 'Bleu', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', bg: 'bg-blue-500' },
  { name: 'Indigo', class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300', bg: 'bg-indigo-500' },
  { name: 'Violet', class: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300', bg: 'bg-violet-500' },
  { name: 'Pourpre', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', bg: 'bg-purple-500' },
  { name: 'Rose', class: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300', bg: 'bg-pink-500' },
  { name: 'Gris', class: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300', bg: 'bg-slate-500' },
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({ 
    categories, onAddCategory, onUpdateCategory, onDeleteCategory, 
    theme, onThemeChange, onResetData, onExportData, onImportData, 
    logo, onUpdateLogo, onCloseFiscalYear,
    archives, onMergeArchives, onHideArchives, isArchiveMode = false
}) => {
  const [settingsTab, setSettingsTab] = useState<'GENERAL' | 'CATEGORIES'>('GENERAL');
  
  // Category State
  const [activeCatTab, setActiveCatTab] = useState<TransactionType>(TransactionType.INCOME);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: COLOR_PALETTE[0].class
  });

  // Reset/Close Year State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCloseYearConfirm, setShowCloseYearConfirm] = useState(false);

  const handleEdit = (cat: Category) => {
    if (isArchiveMode) return;
    setFormData({ name: cat.name, color: cat.color });
    setEditingId(cat.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (id: string) => {
      if (isArchiveMode) return;
      setDeleteId(id);
  };

  const confirmDelete = () => {
      if (deleteId) {
          onDeleteCategory(deleteId);
          setDeleteId(null);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isArchiveMode) return;
    if (!formData.name.trim()) return;

    if (editingId) {
      onUpdateCategory(editingId, {
        name: formData.name,
        color: formData.color,
        type: activeCatTab
      });
    } else {
      onAddCategory({
        name: formData.name,
        color: formData.color,
        type: activeCatTab
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', color: COLOR_PALETTE[0].class });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleGlobalReset = () => {
    onResetData();
    setShowResetConfirm(false);
  };
  
  const handleConfirmCloseYear = () => {
    onCloseFiscalYear();
    setShowCloseYearConfirm(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onImportData(e.target.files[0]);
      }
  };

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onUpdateLogo(e.target.files[0]);
      }
  };

  const filteredCategories = categories.filter(c => c.type === activeCatTab);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Paramètres</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Configuration de l'application et des données.</p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex shadow-sm border border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setSettingsTab('GENERAL')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${settingsTab === 'GENERAL' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                  Général
              </button>
              <button 
                onClick={() => setSettingsTab('CATEGORIES')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${settingsTab === 'CATEGORIES' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                  Catégories
              </button>
          </div>
      </div>

      {/* --- GENERAL SETTINGS TAB --- */}
      {settingsTab === 'GENERAL' && (
        <div className="space-y-8 animate-fade-in">
            
            {/* Logo Section */}
            <section className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Image size={20} className="text-indigo-500" />
                    Logo de l'association
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 bg-slate-50 dark:bg-slate-700 rounded-full overflow-hidden border-4 border-white dark:border-slate-600 shadow-lg flex items-center justify-center">
                        {logo ? (
                            <img src={logo} alt="Logo Actuel" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Aucun logo</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
                            Choisissez l'image de votre logo. Elle apparaîtra sur le menu principal et sur tous les documents imprimés (Reçus, Bons, Bilans).
                        </p>
                        <label className={`inline-flex bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-6 py-3 rounded-2xl font-bold transition border border-indigo-100 dark:border-indigo-900/30 items-center gap-2 ${isArchiveMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <Upload size={18} />
                            <span>Charger un nouveau logo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} disabled={isArchiveMode} />
                        </label>
                    </div>
                </div>
            </section>

            {/* Theme Section */}
            <section className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Palette size={20} className="text-blue-500" />
                    Apparence
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                        onClick={() => onThemeChange('light')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'}`}
                    >
                        <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-amber-500 border border-slate-100">
                            <Sun size={20} />
                        </div>
                        <span className={`font-bold ${theme === 'light' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>Clair</span>
                    </button>
                    
                    <button 
                        onClick={() => onThemeChange('dark')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'}`}
                    >
                        <div className="w-10 h-10 bg-slate-900 rounded-full shadow-sm flex items-center justify-center text-blue-400 border border-slate-800">
                            <Moon size={20} />
                        </div>
                        <span className={`font-bold ${theme === 'dark' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>Sombre</span>
                    </button>
                    
                    <button 
                        onClick={() => onThemeChange('system')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${theme === 'system' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'}`}
                    >
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            <Monitor size={20} />
                        </div>
                        <span className={`font-bold ${theme === 'system' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>Système</span>
                    </button>
                </div>
            </section>

            {/* ARCHIVE & HISTORY MANAGEMENT (Only visible if archives exist) */}
            {archives && (
                <section className={`bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-3xl border ${isArchiveMode ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-indigo-100 dark:border-indigo-900/30'}`}>
                    <h3 className="text-xl font-bold text-indigo-800 dark:text-indigo-400 mb-2 flex items-center gap-2">
                        <History size={20} />
                        Archives & Historique
                    </h3>
                    <p className="text-indigo-600/80 dark:text-indigo-400/80 mb-6 text-sm">
                        Des données d'années précédentes sont disponibles en mémoire. 
                        {isArchiveMode 
                            ? " Vous êtes actuellement en mode lecture seule sur l'année précédente."
                            : " Vous pouvez les consulter en basculant l'application en mode historique."
                        }
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                         {!isArchiveMode ? (
                            <button 
                                onClick={onMergeArchives}
                                className="flex-1 bg-indigo-600 text-white border border-indigo-600 px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
                            >
                                <Eye size={18} /> Voir l'historique (Année précédente)
                            </button>
                         ) : (
                            <button 
                                onClick={onHideArchives}
                                className="flex-1 bg-amber-500 text-white border border-amber-500 px-4 py-3 rounded-xl font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-200 dark:shadow-none"
                            >
                                <EyeOff size={18} /> Quitter l'historique (Revenir au présent)
                            </button>
                         )}
                    </div>
                </section>
            )}

            {/* Fiscal Year & Backup Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup & Restore */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                        <Database size={20} className="text-emerald-500" />
                        Sauvegarde & Restauration
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                        Sécurisez vos données en téléchargeant un fichier de sauvegarde ou restaurez une version précédente.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={onExportData}
                            className="bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-2xl font-bold transition border border-slate-200 dark:border-slate-600 flex items-center justify-center gap-2"
                        >
                            <HardDriveDownload size={18} />
                            <span>Télécharger sauvegarde</span>
                        </button>
                        
                        <label className={`bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-6 py-3 rounded-2xl font-bold transition border border-blue-100 dark:border-blue-900/30 flex items-center justify-center gap-2 ${isArchiveMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <Upload size={18} />
                            <span>Restaurer fichier</span>
                            <input type="file" accept=".json" className="hidden" onChange={onFileChange} disabled={isArchiveMode} />
                        </label>
                    </div>
                </div>

                {/* Fiscal Year Closing */}
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-8 rounded-3xl border border-yellow-100 dark:border-yellow-900/30">
                    <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2">
                        <Archive size={20} />
                        Clôture Année Pastorale
                    </h3>
                    <p className="text-yellow-700/80 dark:text-yellow-500/80 mb-6 text-sm leading-relaxed">
                        Cette action prépare l'application pour la nouvelle rentrée :
                        <ul className="list-disc pl-4 mt-2 space-y-1">
                            <li>Sauvegarde automatique des données actuelles.</li>
                            <li>Archivage des activités et transactions (Historique).</li>
                            <li>Création du solde "Report à Nouveau".</li>
                            <li>Remise à zéro des inscriptions membres.</li>
                        </ul>
                    </p>
                    
                    <button 
                        onClick={() => setShowCloseYearConfirm(true)}
                        disabled={isArchiveMode}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-2xl font-bold transition shadow-lg shadow-yellow-200 dark:shadow-none flex items-center justify-center gap-2"
                    >
                        <Archive size={18} /> Clôturer l'année
                    </button>
                </div>
            </section>

             {/* Data Danger Zone */}
            <section className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30">
                <h3 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                    <AlertOctagon size={20} />
                    Zone de Danger
                </h3>
                <p className="text-red-600/80 dark:text-red-400/80 mb-6 text-sm">
                    Ces actions sont irréversibles. Soyez prudent.
                </p>
                
                <button 
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isArchiveMode}
                    className="bg-white dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 px-6 py-3 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Trash2 size={18} /> Réinitialiser toutes les données
                </button>
            </section>
        </div>
      )}


      {/* --- CATEGORIES TAB (Previous Functionality) --- */}
      {settingsTab === 'CATEGORIES' && (
        <div className="space-y-8 animate-fade-in">
            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-fit">
                <button 
                onClick={() => setActiveCatTab(TransactionType.INCOME)}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeCatTab === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                <ArrowDownLeft size={18} /> Recettes
                </button>
                <button 
                onClick={() => setActiveCatTab(TransactionType.EXPENSE)}
                className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeCatTab === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                <ArrowUpRight size={18} /> Dépenses
                </button>
            </div>

            {/* Add Button */}
            {!isFormOpen && !isArchiveMode && (
                <button 
                    onClick={() => setIsFormOpen(true)}
                    className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 dark:text-slate-500 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition flex items-center justify-center gap-2"
                >
                    <Plus size={20} /> Créer une nouvelle catégorie de {activeCatTab === TransactionType.INCOME ? 'Recette' : 'Dépense'}
                </button>
            )}
            {isArchiveMode && (
                <div className="p-6 text-center text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                    Modification des catégories désactivée en mode historique.
                </div>
            )}

            {/* Form */}
            {isFormOpen && !isArchiveMode && (
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 animate-fade-in relative">
                    <button onClick={resetForm} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition">
                        <X size={20} />
                    </button>
                    
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${activeCatTab === TransactionType.INCOME ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            <Palette size={16} />
                        </div>
                        {editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Nom de la catégorie</label>
                            <input 
                                type="text" 
                                required
                                placeholder="Ex: Vente de gâteaux"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-100 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 ml-1">Couleur de l'étiquette</label>
                            <div className="flex flex-wrap gap-3">
                                {COLOR_PALETTE.map((col) => (
                                    <button
                                        type="button"
                                        key={col.name}
                                        onClick={() => setFormData({...formData, color: col.class})}
                                        className={`w-10 h-10 rounded-full ${col.bg} transition-transform hover:scale-110 flex items-center justify-center ring-2 ring-offset-2 ${formData.color === col.class ? 'ring-slate-400 dark:ring-slate-500 scale-110' : 'ring-transparent'}`}
                                        title={col.name}
                                    >
                                        {formData.color === col.class && <Check size={16} className="text-white" strokeWidth={3} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button type="button" onClick={resetForm} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition">Annuler</button>
                            <button type="submit" className="px-8 py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:bg-slate-900 dark:hover:bg-slate-200 transition shadow-lg shadow-slate-200 dark:shadow-none">
                                {editingId ? 'Enregistrer' : 'Créer'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map(cat => (
                    <div key={cat.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-50 dark:border-slate-700 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition group flex items-center justify-between">
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold truncate max-w-[70%] ${cat.color}`}>
                            {cat.name}
                        </span>
                        {!isArchiveMode && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(cat)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl">
                                    <Pencil size={16} />
                                </button>
                                {cat.name !== 'Inscriptions' && ( 
                                    <button onClick={() => handleDeleteClick(cat.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}
      
      {/* Delete Category Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDeleteId(null)}></div>
           <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 animate-fade-in z-10">
                <div className="text-center">
                  <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mb-4 mx-auto">
                    <Trash2 size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Supprimer la catégorie ?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Attention, cela n'effacera pas les transactions existantes liées à cette catégorie.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 transition">Annuler</button>
                    <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 dark:shadow-none rounded-xl font-bold text-white transition">Supprimer</button>
                  </div>
                </div>
           </div>
        </div>
      )}

      {/* Reset Data Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
           <div className="absolute inset-0 bg-red-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowResetConfirm(false)}></div>
           <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 animate-fade-in z-10 border-2 border-red-100 dark:border-red-900/50">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-6 mx-auto">
                    <AlertOctagon size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Confirmation requise</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                    Vous êtes sur le point d'effacer <span className="font-bold text-red-600 dark:text-red-400">toutes les opérations et tous les membres</span> de l'application.<br/><br/>
                    Cette action est <span className="underline">irréversible</span>. Voulez-vous vraiment tout remettre à zéro ?
                  </p>
                  <div className="flex flex-col gap-3">
                    <button onClick={handleGlobalReset} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-200 dark:shadow-none transition transform hover:scale-[1.02]">
                      Oui, tout effacer
                    </button>
                    <button onClick={() => setShowResetConfirm(false)} className="w-full py-4 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-bold transition">
                      Annuler
                    </button>
                  </div>
                </div>
           </div>
        </div>
      )}

      {/* Fiscal Year Close Confirmation Modal */}
      {showCloseYearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
           <div className="absolute inset-0 bg-yellow-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCloseYearConfirm(false)}></div>
           <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 animate-fade-in z-10 border-2 border-yellow-100 dark:border-yellow-900/50">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-6 mx-auto">
                    <Archive size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Clôture de l'année</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed text-sm">
                    Vous êtes sur le point de clôturer l'année pastorale en cours.<br/><br/>
                    Une sauvegarde sera téléchargée, les compteurs seront remis à zéro, et le solde actuel sera reporté.<br/><br/>
                    <span className="font-bold">Action conseillée en fin d'année uniquement.</span>
                  </p>
                  <div className="flex flex-col gap-3">
                    <button onClick={handleConfirmCloseYear} className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-bold shadow-lg shadow-yellow-200 dark:shadow-none transition transform hover:scale-[1.02]">
                      Confirmer la clôture
                    </button>
                    <button onClick={() => setShowCloseYearConfirm(false)} className="w-full py-4 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-2xl font-bold transition">
                      Annuler
                    </button>
                  </div>
                </div>
           </div>
        </div>
      )}
    </div>
  );
};
