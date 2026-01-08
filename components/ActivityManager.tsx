
import React, { useState, useMemo } from 'react';
import { Activity, Member, Transaction, TransactionType } from '../types';
import { CalendarHeart, Plus, X, Calendar, DollarSign, Users, Trash2, Pencil, ChevronRight, AlertTriangle, FileText, UserPlus, Minus, MapPin, Lock } from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, BorderStyle, HeadingLevel, AlignmentType, ImageRun } from 'docx';

interface ActivityManagerProps {
    activities: Activity[];
    members: Member[];
    transactions: Transaction[];
    onAddActivity: (a: Omit<Activity, 'id'>) => void;
    onUpdateActivity: (id: string, a: Partial<Activity>) => void;
    onDeleteActivity: (id: string) => void;
    onRegisterMember: (activityId: string, memberId: string) => void;
    onUnregisterMember: (activityId: string, memberId: string) => void;
    logo?: string;
    isArchiveMode?: boolean;
}

export const ActivityManager: React.FC<ActivityManagerProps> = ({ 
    activities, members, transactions, 
    onAddActivity, onUpdateActivity, onDeleteActivity, 
    onRegisterMember, onUnregisterMember, logo, isArchiveMode = false 
}) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', date: '', costChild: '', costResponsable: '', location: '' });
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [memberToRegister, setMemberToRegister] = useState<string>('');

    const resetForm = () => {
        setFormData({ name: '', date: '', costChild: '', costResponsable: '', location: '' });
        setIsFormOpen(false);
        setEditingActivityId(null);
    };

    const handleEdit = (act: Activity) => {
        if (act.isArchived || isArchiveMode) return;
        setFormData({ 
            name: act.name, 
            date: act.date, 
            costChild: act.costChild.toString(),
            costResponsable: act.costResponsable.toString(),
            location: act.location || '' 
        });
        setEditingActivityId(act.id);
        setIsFormOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isArchiveMode) return;
        const costChild = parseInt(formData.costChild);
        const costResponsable = parseInt(formData.costResponsable);

        if (!formData.name || !formData.date || isNaN(costChild) || isNaN(costResponsable)) return;

        const activityData = {
            name: formData.name,
            date: formData.date,
            costChild: costChild,
            costResponsable: costResponsable,
            location: formData.location
        };

        if (editingActivityId) {
            onUpdateActivity(editingActivityId, activityData);
        } else {
            onAddActivity(activityData);
        }
        resetForm();
    };

    const confirmDelete = () => {
        if (deleteId) {
            onDeleteActivity(deleteId);
            setDeleteId(null);
            if (selectedActivity?.id === deleteId) setSelectedActivity(null);
        }
    };

    // Stats for the selected activity
    const activityStats = useMemo(() => {
        if (!selectedActivity) return null;

        // Filter transactions linked to this activity
        const activityTx = transactions.filter(t => t.activityId === selectedActivity.id);
        
        // Identify participants via transactions
        const participantsTx = activityTx.filter(t => t.type === TransactionType.INCOME && t.memberId);
        
        // Create a list of enrolled members with their payment date for sorting
        const enrolledMembersWithDate = participantsTx.map(tx => {
            const member = members.find(m => m.id === tx.memberId);
            return {
                member,
                paymentDate: tx.date,
                transactionId: tx.id
            };
        }).filter(item => item.member !== undefined) as { member: Member, paymentDate: string, transactionId: string }[];

        // Sort by payment date ASC (Order of payment)
        enrolledMembersWithDate.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

        const totalRevenue = participantsTx.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = activityTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        
        return {
            transactions: activityTx,
            sortedEnrollments: enrolledMembersWithDate, // Use this for display
            enrolledCount: enrolledMembersWithDate.length,
            totalRevenue,
            totalExpenses,
            balance: totalRevenue - totalExpenses
        };

    }, [selectedActivity, transactions, members]);

    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isArchiveMode) return;
        if (!selectedActivity || !memberToRegister) return;
        if (selectedActivity.isArchived) return;
        
        // Check if already enrolled
        if (activityStats?.sortedEnrollments.some(item => item.member.id === memberToRegister)) {
            alert("Ce membre est déjà inscrit à cette activité.");
            return;
        }

        onRegisterMember(selectedActivity.id, memberToRegister);
        setMemberToRegister('');
    };

    const getApplicableCost = (memberId: string): number => {
        if (!selectedActivity || !memberId) return 0;
        const member = members.find(m => m.id === memberId);
        if (!member) return 0;
        return member.role === 'Enfant de Chœur' ? selectedActivity.costChild : selectedActivity.costResponsable;
    };

    const generateActivityReport = async () => {
        if (!selectedActivity || !activityStats) return;

        const children: any[] = [];

         // Add Logo if exists
        if (logo) {
            const response = await fetch(logo);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            children.push(
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: buffer,
                            transformation: { width: 80, height: 80 },
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            );
        }

        children.push(
            new Paragraph({ text: "BILAN D'ACTIVITÉ PASTORALE", style: "Title", alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `Activité : ${selectedActivity.name}`, style: "Heading", alignment: AlignmentType.CENTER, spacing: { before: 200 } }),
            new Paragraph({ text: `Lieu : ${selectedActivity.location}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `Date : ${new Date(selectedActivity.date).toLocaleDateString('fr-FR')}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: "", spacing: { after: 400 } }),

            // Financial Summary Table
            new Paragraph({ text: "RÉCAPITULATIF FINANCIER", style: "Heading" }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "RECETTES", run: { bold: true } })], shading: { fill: "DCFCE7" } }),
                            new TableCell({ children: [new Paragraph({ text: "DÉPENSES", run: { bold: true } })], shading: { fill: "FEE2E2" } }),
                            new TableCell({ children: [new Paragraph({ text: "BILAN NET", run: { bold: true } })], shading: { fill: "E0F2FE" } }),
                        ]
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(`${activityStats.totalRevenue.toLocaleString()} FCFA`)] }),
                            new TableCell({ children: [new Paragraph(`${activityStats.totalExpenses.toLocaleString()} FCFA`)] }),
                            new TableCell({ children: [new Paragraph({ text: `${activityStats.balance.toLocaleString()} FCFA`, run: { bold: true } })] }),
                        ]
                    })
                ]
            }),
            new Paragraph({ text: "", spacing: { after: 400 } }),

            // Participants List
            new Paragraph({ text: `LISTE DES PARTICIPANTS (${activityStats.enrolledCount})`, style: "Heading" }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "Date paiement", run: { bold: true } })], shading: { fill: "F1F5F9" } }),
                            new TableCell({ children: [new Paragraph({ text: "Nom & Prénoms", run: { bold: true } })], shading: { fill: "F1F5F9" } }),
                            new TableCell({ children: [new Paragraph({ text: "Rôle", run: { bold: true } })], shading: { fill: "F1F5F9" } }),
                            new TableCell({ children: [new Paragraph({ text: "Tarif", run: { bold: true } })], shading: { fill: "F1F5F9" } }),
                        ]
                    }),
                    ...activityStats.sortedEnrollments.map(({ member, paymentDate }) => {
                        const cost = member.role === 'Enfant de Chœur' ? selectedActivity.costChild : selectedActivity.costResponsable;
                        return new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph(`${new Date(paymentDate).toLocaleDateString('fr-FR')}`)] }),
                                new TableCell({ children: [new Paragraph(`${member.lastName} ${member.firstName}`)] }),
                                new TableCell({ children: [new Paragraph(member.role)] }),
                                new TableCell({ children: [new Paragraph(`${cost.toLocaleString()} FCFA`)] }),
                            ]
                        });
                    })
                ]
            }),
            
            new Paragraph({ text: "", spacing: { after: 400 } }),
            new Paragraph({ text: "Visa du Responsable", alignment: AlignmentType.RIGHT }),
            new Paragraph({ text: "_______________________", alignment: AlignmentType.RIGHT })
        );

        const doc = new Document({
            styles: {
                paragraphStyles: [
                    { id: "Title", name: "Title", run: { size: 28, bold: true, color: "2563EB" } },
                    { id: "Heading", name: "Heading", run: { size: 24, bold: true, color: "1E293B" } },
                    { id: "Normal", name: "Normal", run: { size: 22 } }
                ]
            },
            sections: [{
                children: children
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.href = url;
        a.download = `Bilan_Activite_${selectedActivity.name.replace(/\s+/g, '_')}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        Activités Pastorales
                        {isArchiveMode && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase border border-amber-200">
                                Lecture Seule
                            </span>
                        )}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez les événements, les inscriptions et les budgets par activité.</p>
                </div>
                
                {!selectedActivity && !isArchiveMode && (
                    <button 
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition shadow-lg font-semibold ${isFormOpen ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200 dark:shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none'}`}
                    >
                        {isFormOpen ? <X size={20} /> : <Plus size={20} strokeWidth={3} />}
                        {isFormOpen ? 'Fermer' : 'Nouvelle Activité'}
                    </button>
                )}
                {selectedActivity && (
                    <button 
                        onClick={() => setSelectedActivity(null)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition font-bold"
                    >
                         Retour à la liste
                    </button>
                )}
            </div>

            {/* LIST VIEW */}
            {!selectedActivity && (
                <>
                    {isFormOpen && !isArchiveMode && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-blue-100 dark:border-slate-700 p-6 sm:p-8 animate-fade-in relative mb-8">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                                {editingActivityId ? 'Modifier l\'activité' : 'Créer une activité'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Nom de l'activité</label>
                                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" placeholder="Ex: Sortie Détente 2025" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Date</label>
                                        <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Coût (Enfants)</label>
                                        <input required type="number" min="0" value={formData.costChild} onChange={e => setFormData({...formData, costChild: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Coût (Responsables)</label>
                                        <input required type="number" min="0" value={formData.costResponsable} onChange={e => setFormData({...formData, costResponsable: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" placeholder="0" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Lieu</label>
                                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 dark:text-slate-100" placeholder="Lieu de l'activité" />
                                </div>
                                
                                <div className="flex justify-end pt-2">
                                    <button type="submit" className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl font-bold transition flex items-center gap-2">
                                        {editingActivityId ? <Pencil size={18} /> : <Plus size={18} />} {editingActivityId ? 'Mettre à jour' : 'Créer l\'activité'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {activities.map(act => {
                             const count = transactions.filter(t => t.activityId === act.id && t.type === TransactionType.INCOME).length;
                             // Locked if activity itself is archived or if global archive mode
                             const isLocked = act.isArchived || isArchiveMode;
                             return (
                                <div key={act.id} className={`bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all border border-slate-50 dark:border-slate-700 group relative flex flex-col h-full ${isLocked ? 'opacity-90' : ''}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                                            <CalendarHeart size={24} />
                                        </div>
                                        {isLocked ? (
                                            <div className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                                <Lock size={12} /> {isArchiveMode ? 'Lecture Seule' : 'Archivée'}
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(act); }} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"><Pencil size={16} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(act.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl"><Trash2 size={16} /></button>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{act.name}</h3>
                                    <div className="flex flex-col gap-1 mb-4">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                            <Calendar size={14} /> {new Date(act.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric'})}
                                        </p>
                                        {act.location && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                <MapPin size={14} /> {act.location}
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="mt-auto space-y-3">
                                        <div className="flex items-center justify-between text-sm p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2"><Users size={14}/> Inscrits</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{count}</span>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedActivity(act)}
                                            className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                                        >
                                            {isLocked ? 'Consulter le bilan' : 'Gérer l\'activité'} <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                    {activities.length === 0 && !isFormOpen && (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <CalendarHeart size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Aucune activité planifiée</h3>
                            <p className="text-slate-500 dark:text-slate-400">Commencez par créer une activité pour gérer les inscriptions.</p>
                        </div>
                    )}
                </>
            )}

            {/* DETAIL VIEW */}
            {selectedActivity && activityStats && (
                <div className="animate-fade-in">
                    {/* Header Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">Recettes (Inscriptions)</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{activityStats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-slate-400">FCFA</span></h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-red-500 dark:text-red-400 uppercase mb-2">Dépenses liées</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{activityStats.totalExpenses.toLocaleString()} <span className="text-sm font-normal text-slate-400">FCFA</span></h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase mb-2">Bilan Financier</p>
                            <h3 className={`text-3xl font-bold ${activityStats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                {activityStats.balance > 0 ? '+' : ''}{activityStats.balance.toLocaleString()} <span className="text-sm font-normal text-slate-400">FCFA</span>
                            </h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* PARTICIPANTS LIST */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Users size={20} className="text-blue-500"/>
                                    Participants ({activityStats.enrolledCount})
                                </h3>
                                <button onClick={generateActivityReport} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2 rounded-xl transition flex items-center gap-2">
                                    <FileText size={16} /> Bilan Word
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-4 rounded-l-xl">Date</th>
                                            <th className="p-4">Nom & Prénoms</th>
                                            <th className="p-4">Rôle</th>
                                            <th className="p-4 text-right rounded-r-xl">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {activityStats.sortedEnrollments.map(({ member, paymentDate }) => (
                                            <tr key={member.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                                                    {new Date(paymentDate).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'2-digit'})}
                                                </td>
                                                <td className="p-4 font-medium text-slate-700 dark:text-slate-200">
                                                    {member.lastName} {member.firstName}
                                                </td>
                                                <td className="p-4 text-slate-500 dark:text-slate-400">{member.role}</td>
                                                <td className="p-4 text-right">
                                                    {!selectedActivity.isArchived && !isArchiveMode && (
                                                        <button 
                                                            onClick={() => onUnregisterMember(selectedActivity.id, member.id)}
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                            title="Désinscrire (Supprime la transaction)"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    {(selectedActivity.isArchived || isArchiveMode) && (
                                                         <Lock size={16} className="text-slate-300 inline-block" />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {activityStats.enrolledCount === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-400 italic">Aucun participant inscrit pour le moment.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* REGISTRATION FORM (Hidden if Archived) */}
                        {!selectedActivity.isArchived && !isArchiveMode ? (
                            <div className="bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-3xl p-6 h-fit">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <UserPlus size={20} className="text-blue-600 dark:text-blue-400"/>
                                    Inscription Rapide
                                </h3>
                                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Sélectionner un membre</label>
                                        <select 
                                            value={memberToRegister}
                                            onChange={e => setMemberToRegister(e.target.value)}
                                            className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                                        >
                                            <option value="">-- Choisir --</option>
                                            {members
                                                .filter(m => !activityStats.sortedEnrollments.some(item => item.member.id === m.id)) // Exclude already enrolled
                                                .sort((a, b) => {
                                                    const nameA = a.lastName.toLowerCase();
                                                    const nameB = b.lastName.toLowerCase();
                                                    if (nameA < nameB) return -1;
                                                    if (nameA > nameB) return 1;
                                                    return a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
                                                })
                                                .map(m => (
                                                <option key={m.id} value={m.id}>{m.lastName} {m.firstName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {memberToRegister && (
                                        <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-blue-100 dark:border-slate-700 animate-fade-in">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-500 dark:text-slate-400">Coût à payer</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{getApplicableCost(memberToRegister).toLocaleString()} FCFA</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2">
                                                L'inscription créera automatiquement une opération de RECETTE dans le journal de caisse.
                                            </p>
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={!memberToRegister}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-200 dark:shadow-none disabled:shadow-none"
                                    >
                                        Inscrire & Encaisser
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 rounded-3xl p-8 h-fit text-center">
                                <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 mb-4">
                                    <Lock size={24} />
                                </div>
                                <h3 className="font-bold text-slate-700 dark:text-slate-300">
                                    {isArchiveMode ? 'Mode Lecture Seule' : 'Activité Archivée'}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Les inscriptions sont clôturées pour cette activité.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Modal */}
             {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDeleteId(null)}></div>
                <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 animate-fade-in z-10">
                        <div className="text-center">
                        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-4 mx-auto">
                            <Trash2 size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Supprimer l'activité ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Attention : Toutes les transactions financières (inscriptions et dépenses) liées à cette activité seront définitivement supprimées.
                        </p>
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
