
import React, { useState } from 'react';
import { Member, MemberRole } from '../types';
import { CheckCircle, User, Phone, Trash2, MessageCircle, Shield, Plus, X, ChevronUp, AlertTriangle, Pencil, Crown, Coins, FileText, Lock } from 'lucide-react';
import { CHOIR_GRADES } from '../constants';

interface MemberListProps {
  members: Member[];
  onToggleDues: (id: string) => void;
  onDeleteMember: (id: string) => void;
  onAddMember: (m: Omit<Member, 'id'>) => void;
  onUpdateRegistration: (id: string, amount: number) => void;
  onUpdateMember: (id: string, m: Partial<Member>) => void;
  isArchiveMode?: boolean;
}

export const MemberList: React.FC<MemberListProps> = ({ members, onDeleteMember, onAddMember, onUpdateRegistration, onUpdateMember, isArchiveMode = false }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // ID of member being edited
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Responsables' | 'Enfants'>('Enfants');

  // Form State
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    role: MemberRole;
    grade: string;
    phone: string;
    isNewMember: boolean;
    registrationFeePaid: string;
    statusSelection: 'new' | 'old' | 'manual'; 
  }>({
    firstName: '',
    lastName: '',
    role: 'Enfant de Chœur',
    grade: '',
    phone: '',
    isNewMember: false,
    registrationFeePaid: '2500', 
    statusSelection: 'old'
  });

  const normalizeText = (text: string) => text.trim().toLowerCase();

  const resetForm = () => {
      setFormData({
        firstName: '',
        lastName: '',
        role: 'Enfant de Chœur',
        grade: '',
        phone: '',
        isNewMember: false,
        registrationFeePaid: '2500',
        statusSelection: 'old'
      });
      setEditingId(null);
      setDuplicateError(null);
  };

  const handleEditClick = (member: Member) => {
      if (isArchiveMode) return;
      
      let status: 'new' | 'old' | 'manual' = 'manual';
      if (member.role === 'Enfant de Chœur') {
          if (member.isNewMember) status = 'new';
          else status = 'old';
      }

      setFormData({
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          grade: member.grade || '',
          phone: member.phone || '',
          isNewMember: member.isNewMember,
          registrationFeePaid: member.registrationFeePaid.toString(),
          statusSelection: status
      });
      setEditingId(member.id);
      setIsFormOpen(true);
      
      // Scroll to top to see form
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isArchiveMode) return;
    setDuplicateError(null);

    // CREATE MODE
    if (!editingId) {
        // Vérification des doublons
        const exists = members.some(m => 
            normalizeText(m.lastName) === normalizeText(formData.lastName) && 
            normalizeText(m.firstName) === normalizeText(formData.firstName)
        );

        if (exists) {
            setDuplicateError(`Attention : Le membre ${formData.lastName} ${formData.firstName} existe déjà !`);
            return;
        }

        const isResponsable = formData.role !== 'Enfant de Chœur';
        onAddMember({
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            grade: formData.grade || (isResponsable ? formData.role : 'Enfant de Chœur'),
            phone: formData.phone,
            isNewMember: isResponsable ? false : formData.isNewMember,
            registrationFeePaid: isResponsable ? 0 : (parseInt(formData.registrationFeePaid) || 0),
            monthlyDuesPaid: false
        });
    } 
    // EDIT MODE
    else {
        const isResponsable = formData.role !== 'Enfant de Chœur';
        onUpdateMember(editingId, {
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            grade: formData.grade || (isResponsable ? formData.role : 'Enfant de Chœur'),
            phone: formData.phone,
            isNewMember: isResponsable ? false : formData.isNewMember,
            registrationFeePaid: parseInt(formData.registrationFeePaid) || 0
        });
    }

    setIsFormOpen(false);
    resetForm();
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (isArchiveMode) return;
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDeleteMember(deleteId);
      setDeleteId(null);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value === 'new') {
          setFormData({
              ...formData,
              statusSelection: 'new',
              isNewMember: true,
              registrationFeePaid: '5000'
          });
      } else if (value === 'old') {
          setFormData({
              ...formData,
              statusSelection: 'old',
              isNewMember: false,
              registrationFeePaid: '2500'
          });
      } else {
          setFormData({
              ...formData,
              statusSelection: 'manual'
          });
      }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInt(e.target.value);
      if (isNaN(val)) val = 0;

      // Empêcher de dépasser le montant attendu si on est sur un type défini
      if (formData.statusSelection === 'new' && val > 5000) val = 5000;
      if (formData.statusSelection === 'old' && val > 2500) val = 2500;

      setFormData({...formData, registrationFeePaid: val.toString()});
  };

  const displayMembers = members
    .filter(m => activeTab === 'Responsables' ? m.role !== 'Enfant de Chœur' : m.role === 'Enfant de Chœur')
    .sort((a, b) => {
        // Tri Alphabétique : Nom de famille puis Prénom
        const nameA = a.lastName.toLowerCase();
        const nameB = b.lastName.toLowerCase();
        
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        
        // Si même nom de famille, trier par prénom
        const firstA = a.firstName.toLowerCase();
        const firstB = b.firstName.toLowerCase();
        
        if (firstA < firstB) return -1;
        if (firstA > firstB) return 1;
        
        return 0;
    });

  const countEnfants = members.filter(m => m.role === 'Enfant de Chœur').length;
  const countResponsables = members.filter(m => m.role !== 'Enfant de Chœur').length;

  const getRegistrationStatus = (member: Member) => {
    if (member.role !== 'Enfant de Chœur') return null;
    const expectedFee = member.isNewMember ? 5000 : 2500;
    const remaining = expectedFee - member.registrationFeePaid;
    if (remaining <= 0) return { status: 'ok', text: 'Inscription réglée', color: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-900/30' };
    return { status: 'late', text: `Reste: ${remaining} FCFA`, color: 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-900/30' };
  };

  const isResponsableSelected = formData.role !== 'Enfant de Chœur';

  const getRoleIcon = (role: string) => {
      switch (role) {
          case 'Premier Responsable': return <Crown size={26} />;
          case 'Responsable Trésorier': return <Coins size={26} />;
          case 'Responsable Secrétaire': return <FileText size={26} />;
          case 'Enfant de Chœur': return <User size={26} />;
          default: return <Shield size={26} />;
      }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                Membres
                {isArchiveMode && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase border border-amber-200">
                        Lecture Seule
                    </span>
                )}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gestion des effectifs et inscriptions.</p>
        </div>
        
        {!isArchiveMode && (
            <button 
            onClick={() => {
                if (isFormOpen) resetForm();
                setIsFormOpen(!isFormOpen);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition shadow-lg font-semibold ${isFormOpen ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200 dark:shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none'}`}
            >
            {isFormOpen ? <ChevronUp size={20} /> : <Plus size={20} strokeWidth={3} />}
            {isFormOpen ? 'Fermer' : 'Nouveau Membre'}
            </button>
        )}
      </div>

      {/* Inline Form Panel (HIDDEN IN ARCHIVE MODE) */}
      {isFormOpen && !isArchiveMode && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-blue-100 dark:border-slate-700 p-6 sm:p-8 animate-fade-in relative">
             <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="absolute top-4 right-4 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 rounded-full transition"><X size={20}/></button>
             
             <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                {editingId ? 'Modifier le membre' : 'Ajouter un nouveau membre'}
             </h3>

             {duplicateError && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 animate-fade-in">
                    <AlertTriangle size={20} />
                    <p className="font-bold text-sm">{duplicateError}</p>
                </div>
            )}

             <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Nom</label>
                          <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Prénom</label>
                          <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Rôle</label>
                        <select 
                            value={formData.role} 
                            onChange={(e: any) => setFormData({...formData, role: e.target.value})} 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 transition-all"
                        >
                            <option value="Enfant de Chœur">Enfant de Chœur</option>
                            <option value="Premier Responsable">Premier Responsable</option>
                            <option value="Responsable Trésorier">Responsable Trésorier</option>
                            <option value="Responsable Secrétaire">Responsable Secrétaire</option>
                            <option value="Responsable">Autre Responsable</option>
                        </select>
                    </div>

                    <div>
                         {formData.role === 'Enfant de Chœur' ? (
                            <>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Grade</label>
                                <select 
                                    value={formData.grade} 
                                    onChange={e => setFormData({...formData, grade: e.target.value})} 
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100"
                                >
                                    <option value="">Sélectionner un grade</option>
                                    {CHOIR_GRADES.map(grade => (
                                        <option key={grade} value={grade}>{grade}</option>
                                    ))}
                                </select>
                            </>
                         ) : (
                            <>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Téléphone</label>
                                <input type="tel" placeholder="07 00 00 00 00" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" />
                            </>
                         )}
                    </div>
                    
                    {formData.role === 'Enfant de Chœur' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Téléphone</label>
                            <input type="tel" placeholder="07 00 00 00 00" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" />
                        </div>
                    )}
                  </div>

                  {!isResponsableSelected && (
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-2 ml-1">Type d'inscription</label>
                                <select 
                                    value={formData.statusSelection}
                                    onChange={handleStatusChange}
                                    className="w-full p-3 bg-white dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 font-bold shadow-sm transition-all"
                                >
                                    <option value="old">Ancien Membre (2500 FCFA)</option>
                                    <option value="new">Nouveau Membre (5000 FCFA)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-2 ml-1">Montant perçu (FCFA)</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max={formData.statusSelection === 'new' ? 5000 : (formData.statusSelection === 'old' ? 2500 : undefined)}
                                    value={formData.registrationFeePaid} 
                                    onChange={handleAmountChange}
                                    className="w-full p-3 bg-white dark:bg-slate-800 border-none rounded-xl outline-none text-emerald-600 dark:text-emerald-400 font-bold shadow-sm focus:ring-2 focus:ring-emerald-400"
                                    placeholder="0"
                                />
                                {editingId ? (
                                    <p className="text-[10px] text-blue-500/70 mt-1 ml-1">Modifier ce montant mettra à jour la transaction correspondante.</p>
                                ) : (
                                    <p className="text-[10px] text-blue-500/70 mt-1 ml-1">Ce montant sera automatiquement ajouté aux Opérations.</p>
                                )}
                            </div>
                          </div>
                      </div>
                  )}

                  <div className="flex justify-end pt-2">
                      <button type="submit" className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition flex items-center gap-2">
                        {editingId ? <Pencil size={18} /> : <Plus size={18} />} {editingId ? 'Mettre à jour' : 'Enregistrer le membre'}
                      </button>
                  </div>
              </form>
        </div>
      )}

      {/* Modern Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-fit">
          <button 
            onClick={() => setActiveTab('Enfants')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'Enfants' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              Enfants ({countEnfants})
          </button>
          <button 
            onClick={() => setActiveTab('Responsables')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'Responsables' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
              Responsables ({countResponsables})
          </button>
      </div>
      
      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayMembers.map((member) => {
            const regStatus = getRegistrationStatus(member);
            const isResponsable = member.role !== 'Enfant de Chœur';
            
            return (
              <div 
                key={member.id} 
                onClick={() => handleEditClick(member)}
                className={`bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-slate-50/50 dark:border-slate-700/50 group relative overflow-hidden ${isArchiveMode ? 'opacity-90 cursor-default' : 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-100 dark:hover:ring-blue-900 transition-all'}`}
              >
                {/* Decorative background element */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${isResponsable ? 'from-purple-50 dark:from-purple-900/20 to-transparent' : 'from-blue-50 dark:from-blue-900/20 to-transparent'} rounded-bl-[100px] -z-0 opacity-50`} />
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm ${isResponsable ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'}`}>
                      {getRoleIcon(member.role)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">{member.lastName}</h3>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">{member.firstName}</p>
                    </div>
                  </div>
                  
                  {isArchiveMode ? (
                       <Lock className="text-slate-300 dark:text-slate-600" size={18} />
                  ) : (
                      <button 
                        onClick={(e) => handleDeleteClick(member.id, e)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-xl transition"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                  )}
                </div>

                <div className="mt-5 space-y-3 relative z-10">
                    <div className="flex flex-wrap gap-2">
                        <span className={`text-xs px-3 py-1 rounded-lg font-bold border ${isResponsable ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/30' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-600'}`}>
                            {member.role}
                        </span>
                        {member.grade && member.role === 'Enfant de Chœur' && (
                            <span className="text-xs px-3 py-1 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-lg font-medium">{member.grade}</span>
                        )}
                    </div>

                    {regStatus && (
                        <div className={`flex items-center justify-between p-3 rounded-xl border ${regStatus.color} bg-opacity-40`}>
                            <span className="text-xs font-bold">{regStatus.text}</span>
                            {regStatus.status === 'ok' ? (
                                <CheckCircle size={16} />
                            ) : (
                                <div className="flex items-center gap-1">
                                    <AlertTriangle size={16} />
                                    <span className="text-[10px] opacity-75">Impayé</span>
                                </div>
                            )}
                        </div>
                    )}

                     {/* Quick Action: Update Inscription Fee if late (DISABLED IN ARCHIVE) */}
                    {!isArchiveMode && regStatus && regStatus.status === 'late' && (
                        <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                            <input 
                                type="number" 
                                placeholder="+ FCFA" 
                                className="w-full text-sm bg-slate-50 dark:bg-slate-700 border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-200 outline-none text-slate-800 dark:text-slate-200"
                                id={`input-${member.id}`}
                            />
                            <button 
                                onClick={() => {
                                    const input = document.getElementById(`input-${member.id}`) as HTMLInputElement;
                                    if(input && input.value) {
                                        onUpdateRegistration(member.id, parseInt(input.value));
                                        input.value = '';
                                    }
                                }}
                                className="bg-amber-500 text-white text-xs px-3 py-2 rounded-xl font-bold hover:bg-amber-600 transition flex-shrink-0"
                            >
                                Payer
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
                    {member.phone ? (
                        <>
                            <a href={`tel:${member.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition">
                                <Phone size={16} /> {member.phone}
                            </a>
                            <a 
                                href={`https://wa.me/${member.phone.replace(/\s/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-green-600 hover:text-white hover:bg-green-500 dark:text-green-400 dark:hover:bg-green-600 p-2 rounded-full transition-colors bg-green-50 dark:bg-green-900/20"
                                title="Message WhatsApp"
                            >
                                <MessageCircle size={18} />
                            </a>
                        </>
                    ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs italic">Aucun contact</span>
                    )}
                </div>
              </div>
            );
        })}
        
        {displayMembers.length === 0 && (
            <div className="col-span-full py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 mb-4">
                    <User size={32} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun membre dans cette section.</p>
            </div>
        )}
      </div>

       {/* Delete Confirmation Modal (Kept as modal for safety) */}
       {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDeleteId(null)}></div>
          
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 animate-fade-in z-10">
               <div className="text-center">
                 <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-4 mx-auto">
                    <Trash2 size={28} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Supprimer ce membre ?</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Cette action supprimera aussi l'opération d'inscription liée.</p>
                 <div className="flex gap-3">
                  <button onClick={() => setDeleteId(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-bold text-slate-600 dark:text-slate-300 transition">Annuler</button>
                  <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 dark:shadow-none rounded-xl font-bold text-white transition">Supprimer</button>
                 </div>
               </div>
          </div>
        </div>
       )}
    </div>
  );
};
