const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQ-bsIZXPm85zoUXXt1X2QUfyHO7j0kfPrTuMswhnea4jr_cPupn0iIrbKLRfzBGxv/exec';

// Configurar CORS apenas para origins confiáveis
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/init', async (req, res) => {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=init`);
    const text = await response.text();

    console.log('\n=== /init ===');
    console.log('STATUS:', response.status);
    console.log('URL FINAL:', response.url);
    console.log('BODY:', text.substring(0, 1000));

    res.type('text/plain').send(text);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/funcionario', async (req, res) => {
  try {
    const matricula = req.query.matricula || '';
    const response = await fetch(`${APPS_SCRIPT_URL}?action=funcionario&matricula=${encodeURIComponent(matricula)}`);
    const text = await response.text();

    console.log('\n=== /funcionario ===');
    console.log('STATUS:', response.status);
    console.log('URL FINAL:', response.url);
    console.log('BODY:', text.substring(0, 500));

    res.type('text/plain').send(text);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/solicitacao', async (req, res) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

app.get('/acompanhar', async (req, res) => {
  try {
    const pedido = req.query.pedido || '';
    const matricula = req.query.matricula || '';

    const response = await fetch(
      `${APPS_SCRIPT_URL}?action=acompanharPedido&pedido=${encodeURIComponent(pedido)}&matricula=${encodeURIComponent(matricula)}`
    );

    const data = await response.json();
    res.json(data);

  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});