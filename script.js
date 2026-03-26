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
const quantidadeInput = document.getElementById('quantidade');
const observacaoInput = document.getElementById('observacao');
const tabelaItens = document.getElementById('tabelaItens');
const successBox = document.getElementById('successBox');
const errorBox = document.getElementById('errorBox');
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

itemSelect.addEventListener('change', atualizarInfoItem);
quantidadeInput.addEventListener('input', validarQuantidadeAtual);

init();

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
  itemSelect.innerHTML = '<option value="">Selecione um item</option>';

  dadosBase.itens.forEach(item => {
    const option = document.createElement('option');
    option.value = item.nome;
    option.textContent = item.nome;
    itemSelect.appendChild(option);
  });

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
    mostrarErroItem('Item inválido.');
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

  if (!matricula) return;

  try {
    const res = await fetch(`${API_URL}/funcionario?matricula=${encodeURIComponent(matricula)}`);
    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || 'Erro ao buscar funcionário.');
    }

    nomeInput.value = json.data.nome || '';

    if (!json.data.nome) {
      mostrarErro('Matrícula não encontrada.');
    }
  } catch (error) {
    mostrarErro(error.message);
  }
}

function adicionarItem() {
  limparMensagens();

  const itemNome = itemSelect.value;
  const quantidade = Number(quantidadeInput.value);

  if (!itemNome) {
    mostrarErroItem('Selecione um item.');
    return;
  }

  if (!validarQuantidadeAtual()) {
    return;
  }

  const itemBase = getItemBase(itemNome);

  if (!itemBase) {
    mostrarErroItem('Item inválido.');
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
      <tr>
        <td colspan="4" class="empty">Nenhum item adicionado.</td>
      </tr>
    `;
    atualizarTotalPedido();
    return;
  }

  tabelaItens.innerHTML = carrinho.map((item, index) => `
    <tr>
      <td>${item.item}</td>
      <td>${item.quantidade}</td>
      <td>${formatarMoeda(item.valorTotal)}</td>
      <td><button class="btn danger" onclick="removerItem(${index})">Remover</button></td>
    </tr>
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

function validarFormulario() {
  if (!matriculaInput.value.trim()) return 'Informe a matrícula.';
  if (!nomeInput.value.trim()) return 'Matrícula não encontrada.';
  if (!telefoneInput.value.trim()) return 'Informe o telefone.';
  if (!localSelect.value) return 'Selecione o local.';
  if (!departamentoSelect.value) return 'Selecione o departamento.';
  if (carrinho.length === 0) return 'Adicione pelo menos um item.';
  return '';
}

async function enviarPedido() {
  limparMensagens();

  const erro = validarFormulario();
  if (erro) {
    mostrarErro(erro);
    return;
  }

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

  try {
    const res = await fetch(`${API_URL}/solicitacao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || 'Erro ao enviar solicitação.');
    }

    mostrarSucesso(`✔ Solicitação registrada com sucesso | Nº do pedido: ${json.data.numeroPedido}`);
    resetarFormulario();
  } catch (error) {
    mostrarErro(error.message);
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
  successBox.textContent = msg;
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
  toast.textContent = mensagem;

  document.body.appendChild(toast);

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

  container.innerHTML = `
    <div class="loading-consulta">
      <div class="loading-spinner"></div>
      <span>Buscando pedidos...</span>
    </div>
  `;

  if (btnBuscar) {
    btnBuscar.disabled = true;
    btnBuscar.textContent = "Buscando...";
  }
 
  try {

    const res = await fetch(`${API_URL}/acompanhar?pedido=${pedido}&matricula=${matricula}`);
    const json = await res.json();

    console.log('CONSULTA:', json);

    if (!json.ok) {
      throw new Error(json.error || 'Erro ao consultar pedidos.');
    }

    const itens = json.data.itens || [];

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

    container.innerHTML = "<p>Erro ao consultar pedidos.</p>";

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