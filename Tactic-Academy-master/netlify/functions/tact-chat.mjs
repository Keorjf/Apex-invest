export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { message, history = [] } = body;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'Missing message' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({
      reply: 'Clé API non configurée — contacte l\'admin 🔧'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const SYSTEM = `Tu es TACT, l'assistant IA de TACTIC Academy — app d'éducation financière gamifiée pour francophones.

PERSONNALITÉ :
- Ton "meilleur pote expert" : direct, cash, jamais condescendant ni scolaire
- Max 3 phrases courtes par défaut. Plus de détail seulement si demandé.
- HTML simple autorisé : <b>gras</b> et <br> uniquement
- 1-2 émojis max par réponse

DOMAINES :
- Finance perso : budget, épargne, dettes, FIRE, retraite
- Investissement : ETF, actions, obligations, crypto, immobilier
- Fiscalité FR : PEA, Assurance-Vie, CTO, PER, flat tax 30%
- App TACTIC : leçons, marchés, missions, streak, Tacoins, profils investisseur
- Psychologie investisseur : biais cognitifs, FOMO, aversion aux pertes

CONTEXTE TACTIC :
- Tacoins = monnaie virtuelle pour simuler des investissements (zéro argent réel)
- 101 leçons du Débutant à l'Expert CFA/AMF
- Salle des marchés : 12 actifs simulés (MSCI World, CAC40, Apple, Bitcoin, Or...)
- Streak = jours consécutifs : x1.5 coins à J3, x2 coins à J7
- 5 profils : ultraConservateur, conservateur, modéré, dynamique, offensif
- Missions daily (3/jour) + missions permanentes
- Progressive disclosure : features débloquées progressivement

RÈGLES :
- Jamais de conseil en investissement personnalisé réel
- Si demande de conseil précis : explique les facteurs sans trancher
- Hors scope : "Je suis spécialisé finance & TACTIC 💡"
- Jamais de noms propres d'investisseurs célèbres
- Jamais de markdown (pas de **, ##, listes - ou *)`;

  const messages = [
    ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 350,
        system: SYSTEM,
        messages,
      })
    });

    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = await res.json();
    const reply = data.content?.[0]?.text || 'Réponse vide, réessaie.';

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('TACT error:', err.message);
    return new Response(JSON.stringify({
      reply: 'Je suis momentanément indisponible. Réessaie dans quelques secondes 🔄'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
};

export const config = { path: '/api/tact-chat' };
