const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzC08d5PhrMEDRsxSde4E8yg9r4AU8yoYC5H20yQufsqanqgkuw6tb7ZXHIorFM9bsg/exec';

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