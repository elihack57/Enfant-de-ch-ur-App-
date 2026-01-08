import { GoogleGenAI } from "@google/genai";
import { Transaction, Member, Category, Activity, TransactionType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const askFinancialAdvisor = async (
  question: string,
  transactions: Transaction[],
  members: Member[],
  categories: Category[],
  activities: Activity[]
): Promise<string> => {
  try {
    // 1. Analyse Financière Globale
    const income = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;

    // 2. Analyse par Catégorie
    const categoryStats = categories.map(cat => {
      const total = transactions
        .filter(t => t.category === cat.name && t.type === cat.type)
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: cat.name, type: cat.type, total };
    });

    // 3. Analyse des Activités
    const activityStats = activities.map(act => {
      const actTx = transactions.filter(t => t.activityId === act.id);
      const revenue = actTx.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      const spending = actTx.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
      const participantCount = actTx.filter(t => t.type === TransactionType.INCOME && t.memberId).length;
      return {
        name: act.name,
        date: act.date,
        revenue,
        spending,
        net_balance: revenue - spending,
        participants: participantCount,
        cost_child: act.costChild,
        cost_responsable: act.costResponsable
      };
    });

    // 4. Analyse des Membres et Inscriptions
    const children = members.filter(m => m.role === 'Enfant de Chœur');
    const responsables = members.filter(m => m.role !== 'Enfant de Chœur');
    
    const membersWithDebt = children.map(m => {
      const expected = m.isNewMember ? 5000 : 2500;
      const paid = m.registrationFeePaid || 0;
      return {
        name: `${m.lastName} ${m.firstName}`,
        isNew: m.isNewMember,
        paid,
        remaining: expected - paid,
        status: paid >= expected ? 'OK' : 'DETTE'
      };
    }).filter(m => m.status === 'DETTE');

    const contextData = JSON.stringify({
      global_finance: {
        total_income: income,
        total_expense: expense,
        current_balance: balance,
        currency: 'FCFA'
      },
      category_breakdown: categoryStats,
      activities_summary: activityStats,
      members_summary: {
        total_count: members.length,
        children_count: children.length,
        responsables_count: responsables.length,
        registration_debts_list: membersWithDebt // Liste précise des enfants qui doivent de l'argent
      },
      latest_transactions: transactions.slice(0, 15).map(t => ({
        date: t.date,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: t.amount
      }))
    });

    const systemInstruction = `
      Tu es l'Assistant Trésorier IA expert pour l'association "Enfants de Chœur de la Chapelle Sainte Famille".
      Tu as accès à TOUTES les données financières et administratives en temps réel via le contexte JSON fourni.

      RÈGLES MÉTIER STRICTES (A SAVOIR PAR CŒUR) :
      1. Inscription "Nouveau Membre" = 5000 FCFA.
      2. Inscription "Ancien Membre" = 2500 FCFA.
      3. Les Responsables (Premier, Trésorier, Secrétaire, etc.) ne paient PAS de frais d'inscription (0 FCFA).
      4. Chaque activité a un coût spécifique défini (cost_child pour les enfants, cost_responsable pour les responsables).
      5. Une dette d'inscription est calculée : (Montant Attendu - Montant Payé).

      TON RÔLE :
      - Analyser les finances : Si le solde est négatif, alerte gentiment.
      - Suivre les dettes : Si on te demande "Qui n'a pas payé ?", liste les noms présents dans 'registration_debts_list'.
      - Bilan d'activité : Si on te demande un bilan sur une sortie, utilise les données 'activities_summary' (Recettes vs Dépenses).
      - Être proactif : Suggère des améliorations si tu vois beaucoup de dépenses dans une catégorie.
      
      TON ETAT D'ESPRIT :
      - Professionnel, Précis, mais Bienveillant (contexte religieux/associatif).
      - Réponds toujours en Français.
      - Utilise le FCFA comme devise.
      - Sois concis sauf si on te demande un rapport détaillé.

      Si la réponse nécessite un calcul, fais-le explicitement.
    `;

    const prompt = `
      CONTEXTE DES DONNÉES (JSON) :
      ${contextData}

      QUESTION DE L'UTILISATEUR : 
      ${question}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Je n'ai pas pu générer de réponse pour le moment.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Désolé, une erreur est survenue lors de l'analyse des données. Vérifiez votre connexion.";
  }
};