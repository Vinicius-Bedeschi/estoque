const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQ-bsIZXPm85zoUXXt1X2QUfyHO7j0kfPrTuMswhnea4jr_cPupn0iIrbKLRfzBGxv/exec';

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

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}