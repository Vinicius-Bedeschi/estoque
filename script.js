const API_URL = "/api";

let dadosBase = {
  itens: [],
  locais: [],
  departamentos: []
};

let carrinho = [];

const matriculaInput = document.getElementById('matricula');
const nomeInput = document.getElementById('nome');
const telefoneInput = document.getElementById('telefone');
const localSelect = document.getElementById('local');
const departamentoSelect = document.getElementById('departamento');
const itemSelect = document.getElementById('item');
const itemSugestoes = document.getElementById('itemSugestoes');
const quantidadeInput = document.getElementById('quantidade');
const observacaoInput = document.getElementById('observacao');
const tabelaItens = document.getElementById('tabelaItens');
const successBox = document.getElementById('successBox');
const errorBox = document.getElementById('errorBox');
const btnEnviar = document.getElementById('btnEnviar');
const btnAdicionar = document.getElementById('btnAdicionar');
const itemError = document.getElementById('itemError');
const itemInfoBox = document.getElementById('itemInfoBox');
const itemInfoText = document.getElementById('itemInfoText');
const itemInfoBadge = document.getElementById('itemInfoBadge');
const stockBarFill = document.getElementById('stockBarFill');
const totalPedidoBox = document.getElementById('totalPedidoBox');
const totalPedidoValor = document.getElementById('totalPedidoValor');

btnAdicionar.addEventListener('click', adicionarItem);
document.getElementById('btnLimpar').addEventListener('click', limparPedido);
document.getElementById('btnEnviar').addEventListener('click', enviarPedido);
matriculaInput.addEventListener('blur', buscarFuncionario);

itemSelect.addEventListener('input', pesquisarItens);
itemSelect.addEventListener('focus', () => renderizarSugestoesItens(itemSelect.value));

document.addEventListener('click', (event) => {
  if (!event.target.closest('.item-search')) {
    esconderSugestoesItens();
  }
});
quantidadeInput.addEventListener('input', validarQuantidadeAtual);

init();

// --- INÍCIO ATUALIZAÇÃO ESTOQUE ---
let tempoDaUltimaBusca = 0;
const intervaloDeEspera = 15000; // 15 segundos de trava anti-spam

async function atualizarNumerosEmSilencio() {
  if (document.visibilityState === 'visible') {
    const momentoAtual = Date.now();
    
    if (momentoAtual - tempoDaUltimaBusca > intervaloDeEspera) {
      tempoDaUltimaBusca = momentoAtual;
      
      try {
        
        const res = await fetch(`${API_URL}/init`);
        const json = await res.json();

        if (json.ok) {
          
          dadosBase = json.data;
          
          
          if (itemSelect.value !== '') {
            atualizarInfoItem(); 
          }
        }
      } catch (erro) {
        
        console.warn("Falha na conexão ao atualizar o estoque.", erro);
      }
    }
  }
}

document.addEventListener('visibilitychange', atualizarNumerosEmSilencio);
window.addEventListener('focus', atualizarNumerosEmSilencio);
// --- FIM ATUALIZAÇÃO ESTOQUEL ---

async function init() {
  try {
    const res = await fetch(`${API_URL}/init`);
    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || 'Erro ao carregar dados iniciais.');
    }

    dadosBase = json.data;
    preencherSelects();
  } catch (error) {
    mostrarErro(error.message);
  }
}

function preencherSelects() {
  itemSelect.value = '';
  esconderSugestoesItens();

  localSelect.innerHTML = '<option value="">Selecione</option>';
  dadosBase.locais.forEach(local => {
    const option = document.createElement('option');
    option.value = local;
    option.textContent = local;
    localSelect.appendChild(option);
  });

  departamentoSelect.innerHTML = '<option value="">Selecione</option>';
  dadosBase.departamentos.forEach(dep => {
    const option = document.createElement('option');
    option.value = dep;
    option.textContent = dep;
    departamentoSelect.appendChild(option);
  });
}

function normalizarBusca(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanciaLevenshtein(a, b) {
  a = normalizarBusca(a);
  b = normalizarBusca(b);

  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matriz = [];

  for (let i = 0; i <= b.length; i++) {
    matriz[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matriz[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matriz[i][j] = matriz[i - 1][j - 1];
      } else {
        matriz[i][j] = Math.min(
          matriz[i - 1][j - 1] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j] + 1
        );
      }
    }
  }

  return matriz[b.length][a.length];
}

function termoCombinaComItem(termo, itemNormalizado) {
  if (!termo) return true;

  if (itemNormalizado.includes(termo)) return true;

  const palavrasItem = itemNormalizado.split(' ');

  return palavrasItem.some(palavra => {
    if (palavra.includes(termo)) return true;
    if (termo.length >= 4 && distanciaLevenshtein(termo, palavra) <= 2) return true;
    if (termo.length >= 3 && distanciaLevenshtein(termo, palavra) <= 1) return true;

    return false;
  });
}

function pontuarItem(itemNome, busca) {
  const itemNormalizado = normalizarBusca(itemNome);
  const buscaNormalizada = normalizarBusca(busca);

  if (!buscaNormalizada) return 1;

  const termos = buscaNormalizada.split(' ').filter(Boolean);

  const todosTermosCombinam = termos.every(termo =>
    termoCombinaComItem(termo, itemNormalizado)
  );

  if (!todosTermosCombinam) return 0;

  let pontos = 10;

  if (itemNormalizado.startsWith(buscaNormalizada)) pontos += 30;
  if (itemNormalizado.includes(buscaNormalizada)) pontos += 20;

  termos.forEach(termo => {
    if (itemNormalizado.startsWith(termo)) pontos += 10;
    if (itemNormalizado.includes(termo)) pontos += 5;
  });

  return pontos;
}

function pesquisarItens() {
  limparErroItem();
  renderizarSugestoesItens(itemSelect.value);
  atualizarInfoItem();
}

function renderizarSugestoesItens(busca) {
  if (!itemSugestoes) return;

  const resultados = dadosBase.itens
    .map(item => ({
      nome: item.nome,
      pontos: pontuarItem(item.nome, busca)
    }))
    .filter(item => item.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome))
    .slice(0, busca ? 10 : dadosBase.itens.length);

  if (resultados.length === 0) {
    itemSugestoes.innerHTML = `
      <div class="item-sugestao-vazio">
        Nenhum item encontrado. Se não aparece na lista, não está disponível para pedido.
      </div>
    `;
    itemSugestoes.classList.remove('hidden');
    return;
  }

  itemSugestoes.innerHTML = resultados.map(item => `
    <button type="button" class="item-sugestao" onclick="selecionarItem('${escapeHtml(item.nome)}')">
      ${escapeHtml(item.nome)}
    </button>
  `).join('');

  itemSugestoes.classList.remove('hidden');
}

function selecionarItem(itemNome) {
  itemSelect.value = itemNome;
  esconderSugestoesItens();
  atualizarInfoItem();
  quantidadeInput.focus();
}

function esconderSugestoesItens() {
  if (!itemSugestoes) return;
  itemSugestoes.classList.add('hidden');
  itemSugestoes.innerHTML = '';
}

function escapeHtml(texto) {
  return String(texto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function atualizarInfoItem() {
  limparErroItem();

  const itemNome = itemSelect.value;

  if (!itemNome) {
    esconderInfoItem();
    btnAdicionar.disabled = false;
    return;
  }

  const itemBase = getItemBase(itemNome);

  if (!itemBase) {
    esconderInfoItem();
    btnAdicionar.disabled = true;
    return;
  }

  const estoque = Number(itemBase.estoque || 0);
  const minimo = Number(itemBase.minimo || 0);
  const valorUnitario = Number(itemBase.valorUnitario || 0);
  const grupo = itemBase.grupo || '-';

  itemInfoText.innerHTML = `
    <strong>Estoque disponível:</strong> ${estoque}
    &nbsp; | &nbsp;
      <strong>Valor unitário:</strong> ${formatarMoeda(valorUnitario)}
  `;

  itemInfoBadge.textContent = getStatusEstoqueTexto(estoque, minimo);

  stockBarFill.className = 'stock-bar-fill';
  stockBarFill.classList.add(getStatusEstoqueClasse(estoque, minimo));
  stockBarFill.style.width = getLarguraBarra(estoque, minimo);

  itemInfoBox.classList.remove('hidden');

  validarQuantidadeAtual();
}

function esconderInfoItem() {
  itemInfoText.textContent = '';
  itemInfoBadge.textContent = '';
  stockBarFill.className = 'stock-bar-fill';
  stockBarFill.style.width = '0%';
  itemInfoBox.classList.add('hidden');
}

function getItemBase(itemNome) {
  return dadosBase.itens.find(i => i.nome === itemNome);
}

function getStatusEstoqueTexto(estoque, minimo) {
  if (estoque <= minimo) return 'ESTOQUE CRÍTICO';
  if (estoque <= minimo * 1.5) return 'ESTOQUE BAIXO';
  return 'ESTOQUE OK';
}

function getStatusEstoqueClasse(estoque, minimo) {
  if (estoque <= minimo) return 'stock-low';
  if (estoque <= minimo * 1.5) return 'stock-mid';
  return 'stock-ok';
}

function getLarguraBarra(estoque, minimo) {
  if (estoque <= 0) return '0%';

  const referencia = Math.max(minimo * 2, 1);
  const percentual = Math.min((estoque / referencia) * 100, 100);

  return `${percentual}%`;
}

function validarQuantidadeAtual() {
  limparErroItem();

  const itemNome = itemSelect.value;
  const quantidade = Number(quantidadeInput.value);

  if (!itemNome) {
    btnAdicionar.disabled = false;
    return true;
  }

  const itemBase = getItemBase(itemNome);

  if (!itemBase) {
    mostrarErroItem('Selecione um item válido da lista de sugestões.');
    btnAdicionar.disabled = true;
    return false;
  }

  const estoque = Number(itemBase.estoque || 0);
  const valorUnitario = Number(itemBase.valorUnitario || 0);
  const existente = carrinho.find(i => i.item === itemNome);
  const jaNoCarrinho = existente ? Number(existente.quantidade) : 0;

  if (!quantidadeInput.value) {
    btnAdicionar.disabled = false;
    return true;
  }

  if (!quantidade || quantidade <= 0) {
    mostrarErroItem('Informe uma quantidade válida.');
    btnAdicionar.disabled = true;
    return false;
  }

  if (quantidade + jaNoCarrinho > estoque) {
    mostrarErroItem(`Quantidade acima do disponível. Estoque: ${estoque}. Já no pedido: ${jaNoCarrinho}.`);
    btnAdicionar.disabled = true;
    return false;
  }

  const valorEstimado = quantidade * valorUnitario;
  const minimo = Number(itemBase.minimo || 0);
  const grupo = itemBase.grupo || '-';

  itemInfoText.innerHTML = `
    <strong>Estoque disponível:</strong> ${estoque}
    &nbsp; | &nbsp;
    <strong>Valor unitário:</strong> ${formatarMoeda(valorUnitario)}
    &nbsp; | &nbsp;
    <strong>Valor estimado:</strong> ${formatarMoeda(valorEstimado)}
  `;

  btnAdicionar.disabled = false;
  return true;
}

function mostrarErroItem(msg) {
  itemError.textContent = msg;
  itemError.classList.remove('hidden');
  quantidadeInput.classList.add('input-error');
  itemSelect.classList.add('input-error');
  criarToast(msg, 'error');
}

function limparErroItem() {
  itemError.textContent = '';
  itemError.classList.add('hidden');
  quantidadeInput.classList.remove('input-error');
  itemSelect.classList.remove('input-error');
}

async function buscarFuncionario() {
  limparMensagens(); 

  const matricula = matriculaInput.value.trim();
  nomeInput.value = '';

  // 1. Limpa todas as mensagens de erro relacionadas à matrícula
  document.querySelectorAll('.erro-matricula-dinamico').forEach(caixa => caixa.remove());

  if (!matricula) return;

  // 2. Prepara a tela para a busca
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  
  loadingText.innerText = 'Localizando funcionário...';
  loadingOverlay.classList.remove('hidden'); 

  try {
    const res = await fetch(`${API_URL}/funcionario?matricula=${encodeURIComponent(matricula)}`);
    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || 'Erro ao buscar funcionário.');
    }

    if (json.data && json.data.nome) {
      nomeInput.value = json.data.nome;
    } else {
      throw new Error('Matrícula não encontrada.');
    }

} catch (error) {
    
    const divErro = document.createElement('div');
    divErro.className = 'erro-matricula-dinamico';
        
    divErro.style.gridColumn = '1 / -1'; 

    divErro.innerHTML = `
        <div style="padding: 14px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; color: #991b1b; font-size: 13px; line-height: 1.5; text-align: left; box-shadow: 0 2px 4px rgba(153, 27, 27, 0.05);">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 16px;">⚠️</span>
                <strong style="font-size: 14px; color: #b91c1c;">Funcionário não encontrado!</strong>
            </div>
            
            <p style="margin: 0 0 12px 0;">Não localizamos esta matrícula no sistema. Por favor, entre em contato com a <b>Ouvidoria</b> para realizar o seu cadastro.</p>
            
            <div style="font-size: 12px; color: #7f1d1d; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 8px;">
                📍 Atendimento presencial ou pelo WhatsApp:<br>
                📱 <a href="https://wa.me/5532987091799" target="_blank" style="color: #b91c1c; font-weight: bold; text-decoration: none; font-size: 13px;">(32) 98709-1799</a>
            </div>
        </div>
    `;
    
    
    document.querySelectorAll('.erro-matricula-dinamico').forEach(caixa => caixa.remove());
    
    
    nomeInput.parentNode.insertAdjacentElement('afterend', divErro);
    
  } finally {
    loadingOverlay.classList.add('hidden');
  }
}

function adicionarItem() {
  limparMensagens();

  const itemNome = itemSelect.value;
  // Pegamos o texto exato que está no campo, removendo espaços
  const quantidadeTexto = quantidadeInput.value.trim(); 
  const quantidade = Number(quantidadeTexto);

  if (!itemNome) {
    mostrarErroItem('Selecione um item.');
    return;
  }

// Se o campo estiver vazio, for zero, negativo ou for número que não seja inteiro, barra
  if (quantidadeTexto === '' || quantidade <= 0 || !Number.isInteger(quantidade)) {
    mostrarErroItem('Por favor, informe uma quantidade inteira e válida.');
    return;
  }

  if (!validarQuantidadeAtual()) {
    return;
  }

  const itemBase = getItemBase(itemNome);

  if (!itemBase) {
    mostrarErroItem('Selecione um item válido da lista de sugestões.');
    return;
  }

  const estoque = Number(itemBase.estoque || 0);
  const valorUnitario = Number(itemBase.valorUnitario || 0);
  const existente = carrinho.find(i => i.item === itemNome);

  if (existente) {
    if (existente.quantidade + quantidade > estoque) {
      mostrarErroItem(`Total excede o estoque. Estoque atual: ${estoque}.`);
      return;
    }

    existente.quantidade += quantidade;
    existente.valorTotal = existente.quantidade * valorUnitario;
  } else {
    carrinho.push({
      item: itemNome,
      quantidade,
      valorUnitario,
      valorTotal: quantidade * valorUnitario
    });
  }

  itemSelect.value = '';
  quantidadeInput.value = '';
  esconderInfoItem();
  limparErroItem();
  btnAdicionar.disabled = false;

  renderizarTabela();
}

function renderizarTabela() {
  if (carrinho.length === 0) {
    tabelaItens.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
      Nenhum item adicionado.
      </div>
    `;
    atualizarTotalPedido();
    return;
  }

  tabelaItens.innerHTML = carrinho.map((item, index) => `
    <div class="cartao-item">
      <div class="cartao-dados">
        <span class="cartao-titulo">${item.item}</span>
        <span class="cartao-detalhe">Qtd: ${item.quantidade}</span>
        <span class="cartao-destaque">${formatarMoeda(item.valorTotal)}</span>
      </div>
      <button class="btn danger btn-remover" onclick="removerItem(${index})">Remover</button>
    </div>
  `).join('');

  atualizarTotalPedido();
}

function atualizarTotalPedido() {
  if (!totalPedidoBox || !totalPedidoValor) return;

  const total = carrinho.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);

  if (carrinho.length === 0) {
    totalPedidoBox.classList.add('hidden');
    totalPedidoValor.textContent = 'R$ 0,00';
    return;
  }

  totalPedidoValor.textContent = formatarMoeda(total);
  totalPedidoBox.classList.remove('hidden');
}

function removerItem(index) {
  carrinho.splice(index, 1);
  renderizarTabela();
}

function limparPedido() {
  carrinho = [];
  observacaoInput.value = '';
  itemSelect.value = '';
  quantidadeInput.value = '';
  esconderInfoItem();
  limparErroItem();
  btnAdicionar.disabled = false;
  renderizarTabela();
  limparMensagens();
}

function observacaoParecePedidoDeMaterial(texto) {
  if (!texto) return false;

  const linhas = texto
    .split(/\n+/)
    .map(linha => linha.trim())
    .filter(Boolean);

  const textoNormalizado = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const palavrasDeMaterial = [
    'caixa', 'caixas',
    'pacote', 'pacotes',
    'pct', 'pcts',
    'unidade', 'unidades',
    'rolo', 'rolos',
    'frasco', 'frascos',
    'litro', 'litros',
    'lampada', 'lampadas',
    'papel', 'copo', 'copos',
    'desinfetante', 'detergente',
    'sabonete', 'sabao',
    'saco', 'sacos',
    'toalha', 'perflex',
    'agua sanitaria', 'aguas sanitarias',
    'acucar', 'cafe'
  ];

  const temMuitasLinhas = linhas.length >= 3;

  const quantidadeNoInicio = linhas.filter(linha =>
    /^\s*\d+\s+[a-zA-ZÀ-ÿ]/.test(linha)
  ).length;

  const palavrasEncontradas = palavrasDeMaterial.filter(palavra =>
    textoNormalizado.includes(palavra)
  ).length;

  // Bloqueia lista clara de materiais
  if (temMuitasLinhas && palavrasEncontradas >= 1) return true;

  // Bloqueia várias linhas começando com quantidade
  if (quantidadeNoInicio >= 2) return true;

  // Bloqueia uma linha começando com quantidade + palavra de material
  if (quantidadeNoInicio >= 1 && palavrasEncontradas >= 1) return true;

  // Bloqueia texto curto claramente pedindo material
  if (palavrasEncontradas >= 3) return true;

  return false;
}

function validarFormulario() {
  if (!matriculaInput.value.trim()) return 'Informe a matrícula.';
  if (!nomeInput.value.trim()) return 'Matrícula não encontrada.';
  if (!telefoneInput.value.trim()) return 'Informe o telefone.';
  if (!localSelect.value) return 'Selecione o local.';
  if (!departamentoSelect.value) return 'Selecione o departamento.';
  if (carrinho.length === 0) return 'Adicione pelo menos um item.';

  if (observacaoParecePedidoDeMaterial(observacaoInput.value.trim())) {
    return 'A observação não deve ser usada para solicitar materiais. Adicione os itens pelo campo ITEM. Se o item não aparece na lista, ele não está disponível para pedido.';
  }

  return '';
}

async function enviarPedido() {
  limparMensagens();

  btnEnviar.disabled = true;

  const erro = validarFormulario();
  if (erro) {
    mostrarErro(erro);
    btnEnviar.disabled = false;
    return;
  }

  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  
  loadingText.innerText = 'Enviando solicitação, aguarde...';
  loadingOverlay.classList.remove('hidden');

  try {
    const payload = {
      action: 'salvarSolicitacao',
      matricula: matriculaInput.value.trim(),
      telefone: telefoneInput.value.trim(),
      local: localSelect.value,
      departamento: departamentoSelect.value,
      observacao: observacaoInput.value.trim(),
      itens: carrinho.map(item => ({
        item: item.item,
        quantidade: item.quantidade
      }))
    };

    const res = await fetch(`${API_URL}/solicitacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || 'Erro ao enviar solicitação.');
    }

    resetarFormulario();

    const htmlSucesso = `
      <div class="alerta-sucesso-pedido">
        <div class="alerta-icone-trofeu">✓</div>
        <div class="alerta-texto-sucesso">
          <span>Sua solicitação foi registrada com sucesso, clique em <b>Consultar pedidos</b> para visualizar o status.</span>
          <strong>Nº do pedido: <span class="destaque-numero-pedido">${json.data.numeroPedido || 'Gerado'}</span></strong>
        </div>
      </div>
    `;

    successBox.innerHTML = htmlSucesso;
    successBox.classList.remove('hidden');
    errorBox.classList.add('hidden');

    criarToast('Solicitação enviada com sucesso!', 'success');

  } catch (error) {
    mostrarErro(error.message || 'Ocorreu um erro ao enviar o pedido.');
  } finally {
    btnEnviar.disabled = false;
    loadingOverlay.classList.add('hidden');
  }
}

function resetarFormulario() {
  matriculaInput.value = '';
  nomeInput.value = '';
  telefoneInput.value = '';
  localSelect.value = '';
  departamentoSelect.value = '';
  itemSelect.value = '';
  quantidadeInput.value = '';
  observacaoInput.value = '';
  carrinho = [];
  esconderInfoItem();
  limparErroItem();
  btnAdicionar.disabled = false;
  renderizarTabela();
}

function mostrarErro(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
  successBox.classList.add('hidden');
  criarToast(msg, 'error');
}

function mostrarSucesso(msg) {
  successBox.innerHTML = msg;
  successBox.classList.remove('hidden');
  errorBox.classList.add('hidden');
  criarToast(msg, 'success');
}

function limparMensagens() {
  successBox.classList.add('hidden');
  errorBox.classList.add('hidden');
}

function criarToast(mensagem, tipo = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;

  const icone = tipo === 'success' ? '✔' : '✖';
  const titulo = tipo === 'success' ? 'Sucesso!' : 'Erro!';
  
  toast.innerHTML = `
    <div class="toast-icone">${icone}</div>
    <div class="toast-conteudo">
      <strong>${titulo}</strong>
      <span>${mensagem}</span>
    </div>
  `;

  document.body.appendChild(toast);

  // O tempo do toast na tela (3.5 segundos)
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function abrirModalConsulta() {
  document.getElementById('modalConsulta').classList.remove('hidden');
}

function fecharModalConsulta() {
  document.getElementById('modalConsulta').classList.add('hidden');
}

async function consultarPedidos() {
  const pedido = document.getElementById('consultaPedido').value.trim();
  const matricula = document.getElementById('consultaMatricula').value.trim();

  const container = document.getElementById('resultadoConsulta');
  const btnBuscar = document.getElementById('btnBuscarPedidos');

  // 1. Trava: Exige pelo menos a matrícula para buscar
  if (!matricula && !pedido) {
      container.innerHTML = `
        <div style="padding: 12px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; color: #92400e; font-size: 13px; margin-top: 16px; text-align: left;">
           ⚠️ <strong>Aviso:</strong> Por favor, digite pelo menos a sua Matrícula para buscar.
        </div>`;
      return;
  }

  // 2. MÁGICA DO CARREGAMENTO (Spinner no próprio resultado)
  container.innerHTML = `
    <div style="text-align: center; padding: 30px 10px; margin-top: 16px;">
      <div style="display: inline-block; width: 35px; height: 35px; border: 3px solid #e5e7eb; border-top: 3px solid #0d9488; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <p style="margin-top: 12px; color: #4b5563; font-size: 14px; font-weight: 500;">Buscando seus pedidos, aguarde...</p>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>
  `;

  if (btnBuscar) {
    btnBuscar.disabled = true;
    btnBuscar.textContent = "Buscando...";
  }

  try {
    const res = await fetch(`${API_URL}/acompanhar?pedido=${pedido}&matricula=${matricula}`);
    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || 'Erro ao consultar pedidos.');
    }

    const itens = json.data.itens || [];

    // 3. SE NÃO ACHAR NADA: Mostra a mensagem chique
    if (itens.length === 0) {
        container.innerHTML = `
            <div style="padding: 24px 16px; background-color: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 12px; text-align: center; margin-top: 16px;">
                <span style="font-size: 32px; display: block; margin-bottom: 8px;">📭</span>
                <strong style="color: #374151; font-size: 15px;">Nenhum pedido encontrado</strong>
                <p style="color: #6b7280; font-size: 13px; margin-top: 6px; margin-bottom: 0;">Não localizamos histórico com esses dados.</p>
            </div>
        `;
        return;
    }

    // 4. SE ACHAR: Agrupa e mostra os cards que você já criou
    const pedidosAgrupados = {};

    itens.forEach(item => {
      const numero = item.numeroPedido;
      if (!pedidosAgrupados[numero]) {
        pedidosAgrupados[numero] = {
          numeroPedido: numero,
          data: item.data,
          itens: []
        };
      }
      pedidosAgrupados[numero].itens.push(item);
    });

    renderizarPedidosAgrupados(Object.values(pedidosAgrupados));

  } catch (error) {
    console.error(error);
    container.innerHTML = `
        <div style="padding: 12px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; font-size: 13px; margin-top: 16px; text-align: left;">
           ❌ Ocorreu um erro de conexão ao buscar os pedidos. Tente novamente.
        </div>`;
  } finally {
    if (btnBuscar) {
      btnBuscar.disabled = false;
      btnBuscar.textContent = "Buscar";
    }
  }
}

function renderizarPedidosAgrupados(pedidos) {
  const container = document.getElementById('resultadoConsulta');

  if (!pedidos.length) {
    container.innerHTML = '<p>Nenhum pedido encontrado.</p>';
    return;
  }

  container.innerHTML = pedidos.map(pedido => {
    const info = pedido.itens[0];

    return `
      <div class="pedido-card">
        <div class="pedido-header">
          <strong>Pedido:</strong> ${pedido.numeroPedido}<br>
          <strong>Local:</strong> ${info.local || '-'}<br>

          <strong>Data disponível para retirada:</strong>
          <span class="retirada-destaque">${getTextoRetirada(info)}</span><br>

          <strong>Status:</strong>
          <span class="${getStatusClass(info.status)}">
            ${info.status || '-'}
          </span><br>

          <strong>Data:</strong> ${formatarData(pedido.data)}
        </div>

        <div class="pedido-itens">
          ${pedido.itens.map(item => `
            <div class="pedido-item">
              <div><b>Item:</b> ${item.item}</div>
              <div><b>Qtd Pedida:</b> ${item.quantidade}</div>
              <div><b>Qtd Separada:</b> ${item.quantidadeSeparada ?? '-'}</div>
              
              ${item.obsSeparacao ? `
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 8px; margin-top: 8px; font-size: 12.5px; color: #92400e; border-radius: 4px;">
                  💡 <b>Observação:</b> ${item.obsSeparacao}
                </div>
              ` : ''}
              
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

function getStatusClass(status) {
  const s = (status || "").toUpperCase().trim();

  if (s === "PENDENTE") return "status status-pendente";
  if (s === "EM SEPARAÇÃO" || s === "EM SEPARACAO") return "status status-em-separacao";
  if (s === "SEPARADO") return "status status-separado";
  if (s === "ENTREGUE") return "status status-entregue";

  return "status";
}

function getTextoRetirada(info) {
  const prazo = String(info.prazoAtendimento || '').toUpperCase().trim();

  if (prazo === 'IMEDIATO') {
    return 'Retirar no local';
  }

  return formatarData(info.dataDisponivel);
}