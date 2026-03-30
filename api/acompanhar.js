const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQ-bsIZXPm85zoUXXt1X2QUfyHO7j0kfPrTuMswhnea4jr_cPupn0iIrbKLRfzBGxv/exec';

export default async function handler(req, res) {
  try {
    const pedido = req.query.pedido || '';
    const matricula = req.query.matricula || '';

    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=acompanharPedido&pedido=${encodeURIComponent(pedido)}&matricula=${encodeURIComponent(matricula)}`
    );

    const text = await response.text();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}