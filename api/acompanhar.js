const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby45PYA0plBvrDnbmgs6NAaMkUORe-Pki9ox9B1tfxeE_MVPGgd8sTM8qY01IyaOUiV/exec';

export default async function handler(req, res) {
  try {
    const pedido = req.query.pedido || '';
    const matricula = req.query.matricula || '';

    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=acompanharPedido&pedido=${encodeURIComponent(pedido)}&matricula=${encodeURIComponent(matricula)}`
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