const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwzsvxwJoh1L5IrqV-akL8JVOGwq8zNuWo9y0z73pjHRopmHvkpH0fuhtXwUBTIW-Yg/exec';

export default async function handler(req, res) {
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=init`);
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