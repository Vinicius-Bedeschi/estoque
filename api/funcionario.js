const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQ-bsIZXPm85zoUXXt1X2QUfyHO7j0kfPrTuMswhnea4jr_cPupn0iIrbKLRfzBGxv/exec';

export default async function handler(req, res) {
  try {
    const matricula = req.query.matricula || '';

    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=funcionario&matricula=${encodeURIComponent(matricula)}`
    );

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