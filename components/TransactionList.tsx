
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Category, Member, Activity } from '../types';
import { Plus, ArrowUpRight, ArrowDownLeft, Search, Trash2, AlertTriangle, Download, Printer, X, ChevronUp, UserPlus, Filter, ArrowUpDown, Calendar, FileText, Link, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, BorderStyle, TextRun, AlignmentType, HeadingLevel, Header, Footer } from 'docx';
import { CHOIR_GRADES } from '../constants';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  members?: Member[];
  activities?: Activity[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddMember?: (m: Omit<Member, 'id'>, date?: string) => void;
  logo?: string;
  isArchiveMode?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, members = [], activities = [], onAddTransaction, onDeleteTransaction, onAddMember, logo, isArchiveMode = false }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  
  // Filter State
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  // Form State for Transaction
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: TransactionType.INCOME,
    category: categories[0]?.name || '',
    description: '',
    activityId: ''
  });

  // Form State for Member (Registration via Transaction)
  const [memberData, setMemberData] = useState({
    firstName: '',
    lastName: '',
    grade: '',
    phone: '',
    statusSelection: 'old' as 'new' | 'old' | 'manual',
    isNewMember: false,
  });

  // 1. Calculate Running Balance (Always Chronological ASC first)
  const transactionsWithBalance = useMemo(() => {
    // Sort by date ASC purely for calculation
    const sortedForMath = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = 0;
    
    return sortedForMath.map(t => {
      if (t.type === TransactionType.INCOME) {
        runningBalance += t.amount;
      } else {
        runningBalance -= t.amount;
      }
      return { ...t, balanceAfter: runningBalance };
    });
  }, [transactions]);

  // 2. Apply Filters and Sort for Display
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactionsWithBalance];

    // Search Term
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        result = result.filter(t => 
            t.description.toLowerCase().includes(lowerTerm) ||
            t.category.toLowerCase().includes(lowerTerm)
        );
    }

    // Filter Type
    if (filterType !== 'ALL') {
        result = result.filter(t => t.type === filterType);
    }

    // Filter Category
    if (filterCategory !== 'ALL') {
        result = result.filter(t => t.category === filterCategory);
    }

    // Filter Date Range
    if (filterDateStart) {
        result = result.filter(t => t.date >= filterDateStart);
    }
    if (filterDateEnd) {
        result = result.filter(t => t.date <= filterDateEnd);
    }

    // Sorting
    result.sort((a, b) => {
        let comparison = 0;
        if (sortConfig.key === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortConfig.key === 'amount') {
            comparison = a.amount - b.amount;
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactionsWithBalance, searchTerm, filterType, filterCategory, filterDateStart, filterDateEnd, sortConfig]);

  const handleSort = (key: 'date' | 'amount') => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Helper to get activity name
  const getActivityName = (activityId?: string) => {
      if (!activityId) return null;
      const activity = activities.find(a => a.id === activityId);
      return activity ? activity.name : null;
  };

  // Handle Member Status Change inside Transaction Form
  const handleMemberStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    let amount = formData.amount;
    let isNew = memberData.isNewMember;

    if (value === 'new') {
        amount = '5000';
        isNew = true;
    } else if (value === 'old') {
        amount = '2500';
        isNew = false;
    }

    setMemberData({ ...memberData, statusSelection: value as any, isNewMember: isNew });
    // Update the perceived amount automatically to match the standard, but allow user override later
    setFormData({ ...formData, amount });
  };

  const normalizeText = (text: string) => text.trim().toLowerCase();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Logic to cap amount based on type for Inscriptions
    if (formData.category === 'Inscriptions' && formData.type === TransactionType.INCOME) {
        const numVal = parseInt(val);
        if (!isNaN(numVal)) {
            if (memberData.statusSelection === 'new' && numVal > 5000) val = '5000';
            if (memberData.statusSelection === 'old' && numVal > 2500) val = '2500';
        }
    }
    setFormData({...formData, amount: val});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateError(null);

    if (!formData.amount || !formData.category) return;

    // Logic for Inscription (Recette) -> Add Member + Transaction
    if (formData.category === 'Inscriptions' && formData.type === TransactionType.INCOME && onAddMember) {
        
        // 1. Check for duplicates (Case insensitive)
        const exists = members.some(m => 
            normalizeText(m.lastName) === normalizeText(memberData.lastName) && 
            normalizeText(m.firstName) === normalizeText(memberData.firstName)
        );

        if (exists) {
            setDuplicateError(`Attention : L'enfant ${memberData.lastName} ${memberData.firstName} est déjà inscrit !`);
            return;
        }

        // 2. Add Member (which automatically adds transaction in App.tsx)
        onAddMember({
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            role: 'Enfant de Chœur',
            grade: memberData.grade || 'Enfant de Chœur',
            phone: memberData.phone,
            isNewMember: memberData.isNewMember,
            registrationFeePaid: parseInt(formData.amount) || 0,
            monthlyDuesPaid: false
        }, formData.date);

    } else {
        // Logic for Standard Transaction
        onAddTransaction({
            date: formData.date,
            amount: parseInt(formData.amount),
            type: formData.type,
            category: formData.category,
            description: formData.description,
            activityId: formData.activityId || undefined
        });
    }

    // Reset Form
    setIsFormOpen(false);
    setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        type: TransactionType.INCOME,
        category: categories[0]?.name || '',
        description: '',
        activityId: ''
    });
    setMemberData({
        firstName: '',
        lastName: '',
        grade: '',
        phone: '',
        statusSelection: 'old',
        isNewMember: false,
    });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDeleteTransaction(deleteId);
      setDeleteId(null);
    }
  };

  const printReceipt = (t: Transaction) => {
    const win = window.open('', '', 'height=700,width=900');
    const activityName = getActivityName(t.activityId);
    // If logo is empty string, use null so we can render placeholder text
    const logoHtml = logo ? `<img src="${logo}" class="logo-img" />` : `<div class="logo-img" style="display:flex;align-items:center;justify-content:center;background:#e2e8f0;color:#64748b;font-size:10px;font-weight:bold;">LOGO</div>`;
    
    if (win) {
      win.document.write(`
        <html>
        <head>
            <title>REÇU DE PAIEMENT - ${t.id}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f0f0f0; -webkit-print-color-adjust: exact; }
                .ticket { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #ddd; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; position: relative; }
                .header { background: #0f172a; color: white; padding: 20px 30px; display: flex; justify-content: space-between; items-center; }
                .logo-area { display: flex; items-center; gap: 15px; }
                .logo-img { width: 60px; height: 60px; border-radius: 50%; background: white; padding: 2px; object-fit: cover; }
                .logo-text { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
                .logo-sub { font-size: 12px; opacity: 0.8; font-weight: normal; }
                .receipt-title { text-align: right; }
                .receipt-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
                .receipt-id { font-size: 20px; font-weight: bold; color: #4ade80; }
                
                .body { padding: 40px; }
                .row { display: flex; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
                .col { flex: 1; }
                .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 5px; }
                .value { font-size: 16px; color: #1e293b; font-weight: 500; }
                .amount-box { background: #f0fdf4; border: 2px solid #bbf7d0; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
                .amount-label { color: #166534; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                .amount-value { color: #15803d; font-size: 32px; font-weight: bold; }
                
                .footer { background: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; align-items: flex-end; }
                .signature-box { width: 200px; height: 60px; border-bottom: 1px solid #cbd5e1; margin-bottom: 5px; }
                .stamp { position: absolute; right: 60px; bottom: 100px; width: 100px; height: 100px; border: 3px double #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-weight: bold; transform: rotate(-15deg); font-size: 14px; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <div class="header">
                    <div class="logo-area">
                        ${logoHtml}
                        <div>
                            <div class="logo-text">Sainte Famille</div>
                            <div class="logo-sub">Trésorerie Enfants de Chœur</div>
                        </div>
                    </div>
                    <div class="receipt-title">
                        <div class="receipt-label">Reçu de Paiement</div>
                        <div class="receipt-id">#${t.id.toUpperCase()}</div>
                    </div>
                </div>
                
                <div class="body">
                    <div class="row">
                        <div class="col">
                            <div class="label">Date de l'opération</div>
                            <div class="value">${new Date(t.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        <div class="col">
                            <div class="label">Catégorie / Activité</div>
                            <div class="value">${activityName ? activityName : t.category}</div>
                        </div>
                    </div>

                    <div class="amount-box">
                        <div class="amount-label">Montant Perçu</div>
                        <div class="amount-value">${t.amount.toLocaleString()} FCFA</div>
                    </div>

                    <div class="row">
                        <div class="col">
                            <div class="label">Détails / Description</div>
                            <div class="value" style="font-size: 18px;">${t.description}</div>
                        </div>
                    </div>
                    
                    <div class="stamp">PAYÉ</div>
                </div>

                <div class="footer">
                    <div class="info">
                        <p>Ce reçu est généré électroniquement et fait foi de paiement.</p>
                        <p>Chapelle Sainte Famille - N'dotré Sotrapim</p>
                    </div>
                    <div class="signature">
                        <div class="signature-box"></div>
                        <div class="label">Signature du Trésorier</div>
                    </div>
                </div>
            </div>
            <script>window.print();</script>
        </body>
        </html>
      `);
      win.document.close();
    }
  };

  const printVoucher = (t: Transaction) => {
      const win = window.open('', '', 'height=700,width=900');
      const activityName = getActivityName(t.activityId);
      // If logo is empty string, use null so we can render placeholder text
      const logoHtml = logo ? `<img src="${logo}" class="logo-img" />` : `<div class="logo-img" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#94a3b8;font-size:10px;font-weight:bold;">LOGO</div>`;

      if (win) {
        win.document.write(`
          <html>
          <head>
              <title>BON DE DÉCAISSEMENT - ${t.id}</title>
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f0f0f0; -webkit-print-color-adjust: exact; }
                .ticket { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #ddd; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; position: relative; border-top: 5px solid #ef4444; }
                .header { padding: 20px 40px; display: flex; justify-content: space-between; items-center; border-bottom: 2px dashed #cbd5e1; }
                .logo-area { display: flex; items-center; gap: 15px; }
                .logo-img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
                .title { font-size: 24px; font-weight: 900; color: #ef4444; text-transform: uppercase; }
                .meta { text-align: right; font-size: 14px; color: #64748b; }
                
                .body { padding: 40px; }
                .main-row { display: flex; gap: 40px; margin-bottom: 30px; }
                .field-group { flex: 1; }
                .label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold; margin-bottom: 8px; letter-spacing: 0.5px; }
                .value-box { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; color: #334155; font-weight: 600; font-size: 15px; }
                
                .description-box { background: #fff1f2; padding: 20px; border-radius: 12px; border: 1px solid #fecdd3; margin-bottom: 30px; }
                .desc-value { font-size: 18px; color: #881337; font-style: italic; }

                .amount-section { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 40px; gap: 15px; }
                .amount-tag { background: #ef4444; color: white; font-weight: bold; padding: 10px 20px; border-radius: 8px; font-size: 24px; }
                
                .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
                .sig-block { width: 45%; }
                .sig-line { border-bottom: 2px solid #e2e8f0; height: 50px; margin-bottom: 8px; }
                .sig-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold; text-align: center; }

                .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; opacity: 0.05; font-weight: bold; color: #ef4444; pointer-events: none; z-index: 0; }
              </style>
          </head>
          <body>
              <div class="ticket">
                  <div class="watermark">DÉPENSE</div>
                  <div class="header">
                      <div class="logo-area">
                          ${logoHtml}
                          <div class="title">Bon de Décaissement</div>
                      </div>
                      <div class="meta">
                          <div>N° ${t.id.toUpperCase()}</div>
                          <div>Date: ${new Date(t.date).toLocaleDateString('fr-FR')}</div>
                      </div>
                  </div>
                  
                  <div class="body">
                      <div class="main-row">
                          <div class="field-group">
                              <div class="label">Catégorie Budgétaire</div>
                              <div class="value-box">${activityName ? activityName : t.category}</div>
                          </div>
                          <div class="field-group">
                              <div class="label">Bénéficiaire</div>
                              <div class="value-box">.............................................................</div>
                          </div>
                      </div>

                      <div class="label" style="color: #e11d48;">Motif de la dépense</div>
                      <div class="description-box">
                          <div class="desc-value">"${t.description}"</div>
                      </div>

                      <div class="amount-section">
                          <div class="label" style="margin:0;">Montant Total :</div>
                          <div class="amount-tag">-${t.amount.toLocaleString()} FCFA</div>
                      </div>

                      <div class="signatures">
                          <div class="sig-block">
                              <div class="sig-line"></div>
                              <div class="sig-label">Visa du Trésorier</div>
                          </div>
                          <div class="sig-block">
                              <div class="sig-line"></div>
                              <div class="sig-label">Visa du Responsable</div>
                          </div>
                      </div>
                  </div>
              </div>
              <script>window.print();</script>
          </body>
          </html>
        `);
        win.document.close();
      }
  };

  const exportToExcel = () => {
    const data = filteredAndSortedTransactions.map(t => {
        const activityName = getActivityName(t.activityId);
        return {
            "Date": new Date(t.date).toLocaleDateString('fr-FR'),
            "Type": t.type,
            "Catégorie": activityName ? activityName : t.category,
            "Activité Liée": activityName || "",
            "Description": t.description,
            "Entrée": t.type === TransactionType.INCOME ? t.amount : 0,
            "Sortie": t.type === TransactionType.EXPENSE ? t.amount : 0,
            "Solde Progressif": t.balanceAfter
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wscols = [{wch: 12}, {wch: 10}, {wch: 25}, {wch: 25}, {wch: 40}, {wch: 12}, {wch: 12}, {wch: 15}];
    ws['!cols'] = wscols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal de Caisse");
    XLSX.writeFile(wb, `Journal_Caisse_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateFinancialReportDocx = async () => {
    // Calculate Totals based on Filtered View
    const totalIncome = filteredAndSortedTransactions.reduce((acc, t) => t.type === TransactionType.INCOME ? acc + t.amount : acc, 0);
    const totalExpense = filteredAndSortedTransactions.reduce((acc, t) => t.type === TransactionType.EXPENSE ? acc + t.amount : acc, 0);
    const balance = totalIncome - totalExpense;

    const tableRows = [
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "Date", style: "TableHeader" })], shading: { fill: "F1F5F9" } }),
                new TableCell({ children: [new Paragraph({ text: "Catégorie / Activité", style: "TableHeader" })], shading: { fill: "F1F5F9" } }),
                new TableCell({ children: [new Paragraph({ text: "Description", style: "TableHeader" })], shading: { fill: "F1F5F9" } }),
                new TableCell({ children: [new Paragraph({ text: "Entrée", style: "TableHeader" })], shading: { fill: "F1F5F9" } }),
                new TableCell({ children: [new Paragraph({ text: "Sortie", style: "TableHeader" })], shading: { fill: "F1F5F9" } }),
            ]
        })
    ];

    filteredAndSortedTransactions.forEach(t => {
        const activityName = getActivityName(t.activityId);
        tableRows.push(
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: new Date(t.date).toLocaleDateString('fr-FR') })] }),
                    new TableCell({ children: [new Paragraph({ text: activityName ? activityName : t.category })] }),
                    new TableCell({ children: [new Paragraph({ text: t.description })] }),
                    new TableCell({ children: [new Paragraph({ text: t.type === TransactionType.INCOME ? `${t.amount}` : "-" })] }),
                    new TableCell({ children: [new Paragraph({ text: t.type === TransactionType.EXPENSE ? `${t.amount}` : "-" })] }),
                ]
            })
        );
    });

    const doc = new Document({
        styles: {
            paragraphStyles: [
                {
                    id: "TableHeader",
                    name: "Table Header",
                    basedOn: "Normal",
                    next: "Normal",
                    run: { bold: true, color: "334155", size: 22 }, // 11pt
                },
                {
                   id: "Normal",
                   name: "Normal",
                   run: { size: 22, font: "Calibri" }
                }
            ]
        },
        sections: [{
            properties: {},
            children: [
                // HEADER
                new Paragraph({
                    text: "CHAPELLE SAINTE FAMILLE - N'DOTRÉ SOTRAPIM",
                    heading: HeadingLevel.HEADING_3,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: "TRÉSORERIE ENFANTS DE CHŒUR",
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    text: "BILAN FINANCIER",
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    run: { color: "2563EB", bold: true },
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),

                // SUMMARY TABLE
                new Paragraph({ text: "RÉSUMÉ DE LA PÉRIODE", heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "Total Recettes", alignment: AlignmentType.CENTER, run: { bold: true } })], shading: { fill: "DCFCE7" } }), // Green
                                new TableCell({ children: [new Paragraph({ text: "Total Dépenses", alignment: AlignmentType.CENTER, run: { bold: true } })], shading: { fill: "FEE2E2" } }), // Red
                                new TableCell({ children: [new Paragraph({ text: "Solde Net", alignment: AlignmentType.CENTER, run: { bold: true } })], shading: { fill: "E0F2FE" } }), // Blue
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: `${totalIncome.toLocaleString()} FCFA`, alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: `${totalExpense.toLocaleString()} FCFA`, alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: `${balance.toLocaleString()} FCFA`, alignment: AlignmentType.CENTER, run: { bold: true } })] }),
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: "", spacing: { after: 400 } }),

                // DETAILED TABLE
                new Paragraph({ text: "DÉTAIL DES OPÉRATIONS", heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows
                }),

                // SIGNATURES
                new Paragraph({ text: "", spacing: { after: 800 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE } },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "Le Trésorier", alignment: AlignmentType.CENTER, run: { underline: {} } })] }),
                                new TableCell({ children: [new Paragraph({ text: "Le Responsable", alignment: AlignmentType.CENTER, run: { underline: {} } })] }),
                            ]
                        })
                    ]
                })
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.href = url;
    a.download = `Bilan_Financier_${new Date().toISOString().split('T')[0]}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const isInscription = formData.category === 'Inscriptions' && formData.type === TransactionType.INCOME;
  const expectedAmount = memberData.statusSelection === 'new' ? 5000 : 2500;

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              Journal de Caisse
              {isArchiveMode && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase border border-amber-200">
                      Archive - Lecture Seule
                  </span>
              )}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez vos entrées et sorties d'argent.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
           <button 
             onClick={generateFinancialReportDocx}
             className="flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-5 py-3 rounded-2xl transition font-medium shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <FileText size={18} /> <span className="hidden sm:inline">Bilan Word</span>
          </button>
          <button 
             onClick={exportToExcel}
             className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl transition font-medium shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <Download size={18} /> <span className="hidden sm:inline">Exporter Excel</span>
          </button>
          
          {!isArchiveMode && (
            <button 
                onClick={() => setIsFormOpen(!isFormOpen)}
                className={`flex flex-1 lg:flex-none items-center justify-center gap-2 px-6 py-3 rounded-2xl transition shadow-lg font-semibold ${isFormOpen ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-200 dark:shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none'}`}
            >
                {isFormOpen ? <ChevronUp size={20} /> : <Plus size={20} strokeWidth={3} />}
                {isFormOpen ? 'Fermer' : 'Nouvelle Opération'}
            </button>
          )}
        </div>
      </div>

      {/* Inline Form Panel (HIDDEN IN ARCHIVE MODE) */}
      {isFormOpen && !isArchiveMode && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-blue-100 dark:border-slate-700 p-6 sm:p-8 animate-fade-in relative">
            <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-600 rounded-full transition"
            >
                <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                Saisir une opération
            </h3>

            {duplicateError && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 animate-fade-in">
                    <AlertTriangle size={20} />
                    <p className="font-bold text-sm">{duplicateError}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Type Toggle */}
                <div className="flex gap-4">
                   <label className={`flex-1 cursor-pointer border-2 rounded-2xl p-3 flex items-center justify-center gap-2 transition-all ${formData.type === TransactionType.INCOME ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400'}`}>
                       <input 
                         type="radio" 
                         name="type" 
                         className="hidden"
                         checked={formData.type === TransactionType.INCOME} 
                         onChange={() => setFormData({...formData, type: TransactionType.INCOME})} 
                       />
                       <ArrowDownLeft size={20} /> <span className="font-bold">Recette</span>
                   </label>
                   <label className={`flex-1 cursor-pointer border-2 rounded-2xl p-3 flex items-center justify-center gap-2 transition-all ${formData.type === TransactionType.EXPENSE ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400'}`}>
                       <input 
                         type="radio" 
                         name="type" 
                         className="hidden"
                         checked={formData.type === TransactionType.EXPENSE} 
                         onChange={() => setFormData({...formData, type: TransactionType.EXPENSE})} 
                       />
                       <ArrowUpRight size={20} /> <span className="font-bold">Dépense</span>
                   </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Date</label>
                        <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200 font-medium transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Catégorie</label>
                        <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200 font-medium transition-all"
                        >
                        {categories.filter(c => c.type === formData.type).map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        </select>
                    </div>
                    {!isInscription && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Montant (FCFA)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                placeholder="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* DYNAMIC FIELDS FOR INSCRIPTION */}
                {isInscription ? (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 animate-fade-in">
                         <div className="flex items-center gap-2 mb-4 text-blue-800 dark:text-blue-300 font-bold">
                            <UserPlus size={20} />
                            <h4>Détails de l'Enfant de Chœur</h4>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Nom</label>
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Nom de famille"
                                    value={memberData.lastName} 
                                    onChange={e => setMemberData({...memberData, lastName: e.target.value})} 
                                    className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm text-slate-800 dark:text-slate-100" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Prénom</label>
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Prénoms"
                                    value={memberData.firstName} 
                                    onChange={e => setMemberData({...memberData, firstName: e.target.value})} 
                                    className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm text-slate-800 dark:text-slate-100" 
                                />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Grade</label>
                                <select 
                                    value={memberData.grade} 
                                    onChange={e => setMemberData({...memberData, grade: e.target.value})} 
                                    className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm text-slate-800 dark:text-slate-100"
                                >
                                    <option value="">Sélectionner un grade</option>
                                    {CHOIR_GRADES.map(grade => (
                                        <option key={grade} value={grade}>{grade}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Téléphone (Parent/Enfant)</label>
                                <input 
                                    type="tel" 
                                    placeholder="07 00 00 00 00" 
                                    value={memberData.phone} 
                                    onChange={e => setMemberData({...memberData, phone: e.target.value})} 
                                    className="w-full p-3 bg-white dark:bg-slate-900 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm text-slate-800 dark:text-slate-100" 
                                />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/60 dark:bg-slate-900/50 p-4 rounded-2xl border border-blue-100 dark:border-slate-700">
                            <div>
                                <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-2 ml-1">Type d'inscription</label>
                                <select 
                                    value={memberData.statusSelection}
                                    onChange={handleMemberStatusChange}
                                    className="w-full p-3 bg-white dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-blue-800 dark:text-blue-300 font-bold shadow-sm transition-all"
                                >
                                    <option value="old">Ancien (2500 FCFA)</option>
                                    <option value="new">Nouveau (5000 FCFA)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 ml-1">Montant à payer (Tarif)</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={expectedAmount}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none text-slate-500 dark:text-slate-400 font-semibold cursor-not-allowed"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2 ml-1">Montant perçu (Réel)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max={expectedAmount}
                                    placeholder="0"
                                    value={formData.amount}
                                    onChange={handleAmountChange}
                                    className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-emerald-700 dark:text-emerald-400 shadow-sm transition-all"
                                />
                            </div>
                         </div>
                         <p className="text-[11px] text-blue-400 mt-4 italic">
                            * Cet enregistrement ajoutera automatiquement l'enfant à la liste des membres et créera la transaction correspondante au montant perçu.
                         </p>
                    </div>
                ) : (
                    /* STANDARD DESCRIPTION FIELD FOR OTHER TRANSACTIONS */
                    <div className="space-y-6">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Description / Motif</label>
                            <input
                                type="text"
                                required
                                placeholder={formData.type === TransactionType.INCOME ? "Ex: Cotisation de Jean Dupont..." : "Ex: Achat de bougies..."}
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200 font-medium transition-all"
                            />
                        </div>
                        
                        {/* Link to Activity (Optional) */}
                        <div>
                             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 flex items-center gap-1">
                                 <Link size={14} /> Lier à une activité (Optionnel)
                             </label>
                             <select
                                value={formData.activityId}
                                onChange={(e) => setFormData({...formData, activityId: e.target.value})}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200 font-medium transition-all"
                             >
                                 <option value="">Aucune activité liée</option>
                                 {activities.map(act => (
                                     <option key={act.id} value={act.id}>{act.name} ({new Date(act.date).toLocaleDateString('fr-FR')})</option>
                                 ))}
                             </select>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-2xl transition font-bold shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2"
                    >
                        <Plus size={18} /> Enregistrer
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* Search and Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative group flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            </div>
            <input 
            type="text"
            placeholder="Rechercher une opération..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border-none focus:ring-2 focus:ring-blue-500/20 focus:shadow-lg transition-all outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
        </div>
        <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl transition font-bold border ${showFilters ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]'}`}
        >
            <Filter size={18} />
            <span>Filtres</span>
        </button>
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-700 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Période (Début)</label>
                      <div className="relative">
                          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                          <input 
                            type="date" 
                            value={filterDateStart}
                            onChange={e => setFilterDateStart(e.target.value)}
                            className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-none focus:ring-2 focus:ring-blue-200 outline-none text-sm text-slate-700 dark:text-slate-300"
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Période (Fin)</label>
                      <div className="relative">
                          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                          <input 
                            type="date" 
                            value={filterDateEnd}
                            onChange={e => setFilterDateEnd(e.target.value)}
                            className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-none focus:ring-2 focus:ring-blue-200 outline-none text-sm text-slate-700 dark:text-slate-300"
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Type</label>
                      <select 
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as any)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-none focus:ring-2 focus:ring-blue-200 outline-none text-sm text-slate-700 dark:text-slate-300"
                      >
                          <option value="ALL">Tout afficher</option>
                          <option value={TransactionType.INCOME}>Recettes</option>
                          <option value={TransactionType.EXPENSE}>Dépenses</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Catégorie</label>
                      <select 
                         value={filterCategory}
                         onChange={e => setFilterCategory(e.target.value)}
                         className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border-none focus:ring-2 focus:ring-blue-200 outline-none text-sm text-slate-700 dark:text-slate-300"
                      >
                          <option value="ALL">Toutes les catégories</option>
                          {categories.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                      </select>
                  </div>
              </div>
              <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => {
                        setFilterDateStart('');
                        setFilterDateEnd('');
                        setFilterType('ALL');
                        setFilterCategory('ALL');
                    }}
                    className="text-sm text-red-500 hover:text-red-700 font-bold hover:underline"
                  >
                      Réinitialiser les filtres
                  </button>
              </div>
          </div>
      )}

      {/* Transaction List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th 
                    className="p-6 font-bold text-slate-400 dark:text-slate-500 uppercase text-xs tracking-wider cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors select-none group"
                    onClick={() => handleSort('date')}
                >
                    <div className="flex items-center gap-1">
                        Date
                        <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'date' ? 'opacity-100 text-blue-500' : 'opacity-0 group-hover:opacity-50'}`} />
                    </div>
                </th>
                <th className="p-6 font-bold text-slate-400 dark:text-slate-500 uppercase text-xs tracking-wider">Type / Activité</th>
                <th className="p-6 font-bold text-slate-400 dark:text-slate-500 uppercase text-xs tracking-wider">Description</th>
                <th 
                    className="p-6 font-bold text-slate-400 dark:text-slate-500 uppercase text-xs tracking-wider text-right cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors select-none group"
                    onClick={() => handleSort('amount')}
                >
                    <div className="flex items-center justify-end gap-1">
                         <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === 'amount' ? 'opacity-100 text-blue-500' : 'opacity-0 group-hover:opacity-50'}`} />
                         Montant
                    </div>
                </th>
                <th className="p-6 font-bold text-slate-400 dark:text-slate-500 uppercase text-xs tracking-wider text-right bg-slate-50/50 dark:bg-slate-700/30">Solde</th>
                <th className="p-6 font-bold text-slate-400 dark:text-slate-500 uppercase text-xs tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filteredAndSortedTransactions.map((t) => {
                  const activityName = getActivityName(t.activityId);
                  // Locked if explicitely archived OR if global archive mode is on
                  const isLocked = t.isArchived || isArchiveMode;
                  
                  return (
                    <tr key={t.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition duration-150 group ${isLocked ? 'opacity-90' : ''}`}>
                    <td className="p-6 text-slate-500 dark:text-slate-300 whitespace-nowrap font-medium">
                        {new Date(t.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </td>
                    <td className="p-6">
                        <div className="flex flex-col items-start gap-1">
                            {activityName ? (
                                t.type === TransactionType.INCOME ? (
                                    <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100 dark:border-emerald-900/30">
                                        <Link size={14} strokeWidth={2.5} /> {activityName}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100 dark:border-red-900/30">
                                        <Link size={14} strokeWidth={2.5} /> {activityName}
                                    </span>
                                )
                            ) : (
                                t.type === TransactionType.INCOME ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100 dark:border-emerald-900/30">
                                    <ArrowDownLeft size={14} strokeWidth={2.5} /> {t.category}
                                </span>
                                ) : (
                                <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100 dark:border-red-900/30">
                                    <ArrowUpRight size={14} strokeWidth={2.5} /> {t.category}
                                </span>
                                )
                            )}
                        </div>
                    </td>
                    <td className="p-6 text-slate-700 dark:text-slate-300 font-medium">
                        {t.description}
                    </td>
                    <td className={`p-6 text-right font-bold text-base ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString()}
                    </td>
                    <td className="p-6 text-right font-mono text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-700/20 font-medium">
                        {t.balanceAfter.toLocaleString()}
                    </td>
                    <td className="p-6 text-center">
                        {isLocked ? (
                            <div className="flex items-center justify-center text-slate-400" title="Transaction Archivée (Lecture Seule)">
                                <Lock size={18} />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {t.type === TransactionType.INCOME ? (
                                <button onClick={() => printReceipt(t)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl" title="Reçu">
                                    <Printer size={18} />
                                </button>
                                ) : (
                                    <button onClick={() => printVoucher(t)} className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-xl" title="Bon">
                                        <Printer size={18} />
                                    </button>
                                )}
                                <button 
                                onClick={() => handleDeleteClick(t.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition"
                                title="Supprimer"
                                >
                                <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                    </td>
                    </tr>
                  );
              })}
              {filteredAndSortedTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                    Aucune opération trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal (Kept as modal for safety) */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDeleteId(null)}></div>
           <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-6 animate-fade-in z-10">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-4">
                    <AlertTriangle size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Confirmer la suppression</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
                    Êtes-vous sûr de vouloir supprimer cette transaction ?
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setDeleteId(null)}
                      className="flex-1 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="flex-1 py-3 bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 dark:shadow-none rounded-xl transition font-semibold"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
           </div>
        </div>
      )}
    </div>
  );
};
