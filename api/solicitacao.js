const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_BikI2IBbhDmHGInnFfkouO0gzfTpB4lRjrrmtyKVHar_rxbPZohxy-FN8aDnXno6/exec';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(req.body)
    });

  const text = await response.text();

    let json; 
    try { 
      json = JSON.parse(text); 
    } catch(err) { 
      return res.status(500).json({ ok: false, error: 'Resposta inválida do Google', debug: text.slice(0,500) }); 
    }

    res.status(200).json(json);

  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}