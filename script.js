const SUPABASE_URL = "https://hpjiwmmslyvuqrkllmvb.supabase.co";
const SUPABASE_KEY = "sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const listaProdutos = document.getElementById("lista-produtos");
const botoes = document.querySelectorAll(".filtro");
const paginacao = document.getElementById("paginacao");
const campoBusca = document.getElementById("campo-busca");

const modal = document.getElementById("modal-produto");
const fecharModal = document.getElementById("fechar-modal");
const modalNome = document.getElementById("modal-nome");
const modalImagem = document.getElementById("modal-imagem");
const modalDescricao = document.getElementById("modal-descricao");
const modalPreco = document.getElementById("modal-preco");
const modalWhatsapp = document.getElementById("modal-whatsapp");
const modalMiniaturas = document.getElementById("modal-miniaturas");

const VENDEDORES = [
  { nome: "Mauricio", numero: "5521982814052" }
  /*{ nome: "Hazelmam", numero: "5521974690154" },
  { nome: "Teste", numero: "5521984525497" } */
];

const destaqueWhatsapp = document.getElementById("destaque-whatsapp");

const abrirAcompanhamento = document.getElementById("abrir-acompanhamento");
const modalAcompanhamento = document.getElementById("modal-acompanhamento");
const fecharAcompanhamento = document.getElementById("fechar-acompanhamento");
const formAcompanhamento = document.getElementById("form-acompanhamento");
const mensagemAcompanhamento = document.getElementById("mensagem-acompanhamento");

const PRODUTOS_POR_PAGINA = 30;
const DESCONTO_PIX = 0.04;

let categoriaAtual = "Todos";
let paginaAtual = 1;

function obterPrecoNumerico(preco) {
  if (typeof preco === "number") {
    return preco;
  }

  return Number(
    String(preco)
      .replace(/R\$\s*/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  );
}

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function obterPrecoPix(preco) {
  return obterPrecoNumerico(preco) * (1 - DESCONTO_PIX);
}

function renderizarPrecos(preco) {
  return `
    <div class="precos-produto">
      <div class="preco-base">
        <span class="preco-base-label">Preço do produto</span>
        <span class="preco-base-valor">${preco}</span>
      </div>

      <div class="preco-pix-box">
        <span class="preco-pix-label">À vista no PIX</span>
        <span class="preco-pix">${formatarPreco(obterPrecoPix(preco))}</span>
        <span class="condicao-pix">4% de desconto para pagamento à vista</span>
      </div>
    </div>
  `;
}

function obterTextoPrecoPix(preco) {
  return formatarPreco(obterPrecoPix(preco));
}

function mostrarProdutos(categoria, pagina = 1) {

  categoriaAtual = categoria;
  paginaAtual = pagina;

  listaProdutos.innerHTML = "";

  const textoBusca = campoBusca.value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const produtosFiltrados = produtos.filter(function(produto) {

    const nomeProduto = produto.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const correspondeBusca =
      nomeProduto.includes(textoBusca);

    const correspondeCategoria =
      categoria === "Todos" ||
      produto.categoria === categoria;

    return correspondeBusca && correspondeCategoria;
  });


  const inicio = (pagina - 1) * PRODUTOS_POR_PAGINA;
  const fim = inicio + PRODUTOS_POR_PAGINA;

  const produtosDaPagina = produtosFiltrados.slice(inicio, fim);

  produtosDaPagina.forEach(function(produto) {

    const card = document.createElement("div");

    card.className = "produto";

    card.innerHTML = `
      <h3>${produto.nome}</h3>

      <img
        src="${produto.imagem}"
        alt="${produto.nome}"
      >

      <p>${produto.descricao}</p>

      ${renderizarPrecos(produto.preco)}
    `;

    card.addEventListener("click", function() {
      abrirModal(produto);
    });

    listaProdutos.appendChild(card);
  });

  criarPaginacao(produtosFiltrados.length);
}


function criarPaginacao(totalProdutos) {

  paginacao.innerHTML = "";

  const totalPaginas = Math.ceil(
    totalProdutos / PRODUTOS_POR_PAGINA
  );

  if (totalPaginas <= 1) {
    return;
  }


  if (paginaAtual > 1) {

    const anterior = document.createElement("button");

    anterior.textContent = "Anterior";

    anterior.addEventListener("click", function() {
      mostrarProdutos(categoriaAtual, paginaAtual - 1);
    });

    paginacao.appendChild(anterior);
  }


  for (let pagina = 1; pagina <= totalPaginas; pagina++) {

    const botao = document.createElement("button");

    botao.textContent = pagina;

    if (pagina === paginaAtual) {
      botao.classList.add("ativo");
    }

    botao.addEventListener("click", function() {
      mostrarProdutos(categoriaAtual, pagina);
    });

    paginacao.appendChild(botao);
  }


  if (paginaAtual < totalPaginas) {

    const proximo = document.createElement("button");

    proximo.textContent = "Próxima";

    proximo.addEventListener("click", function() {
      mostrarProdutos(categoriaAtual, paginaAtual + 1);
    });

    paginacao.appendChild(proximo);
  }
}


function abrirModal(produto) {

  modalNome.textContent = produto.nome;

  modalImagem.src = produto.imagem;
  modalImagem.alt = produto.nome;

  modalMiniaturas.innerHTML = "";

  const imagensProduto = [
    produto.imagem,
    ...(produto.imagens || [])
  ];

  if (imagensProduto.length > 1) {

    imagensProduto.forEach(function(imagem, index) {

      const miniatura = document.createElement("img");

      miniatura.src = imagem;
      miniatura.alt = produto.nome;

      if (index === 0) {
        miniatura.classList.add("ativa");
      }

      miniatura.addEventListener("click", function(event) {

        event.stopPropagation();

        modalImagem.src = imagem;

        document
          .querySelectorAll(".modal-miniaturas img")
          .forEach(function(item) {
            item.classList.remove("ativa");
          });

        miniatura.classList.add("ativa");
      });

      modalMiniaturas.appendChild(miniatura);

    });

  }


  modalDescricao.textContent = produto.descricao;

  // Mostra os detalhes completos quando existirem
  if (produto.detalhes) {
    modalDescricao.textContent = produto.detalhes;
  }

  modalPreco.innerHTML = renderizarPrecos(produto.preco);

  const mensagem =
    `Olá! Tenho interesse no produto "${produto.nome}". Poderia me passar mais informações?`;

  const vendedor =
    VENDEDORES[Math.floor(Math.random() * VENDEDORES.length)];

  modalWhatsapp.href =
    `https://wa.me/${vendedor.numero}?text=${encodeURIComponent(mensagem)}`;

  modal.classList.add("aberto");
}


function fecharModalProduto() {
  modal.classList.remove("aberto");
}


fecharModal.addEventListener("click", function() {
  fecharModalProduto();
});

abrirAcompanhamento.addEventListener("click", function() {
  modalAcompanhamento.classList.add("aberto");
});

fecharAcompanhamento.addEventListener("click", function() {
  modalAcompanhamento.classList.remove("aberto");
});

modalAcompanhamento.addEventListener("click", function(event) {
  if (event.target === modalAcompanhamento) {
    modalAcompanhamento.classList.remove("aberto");
  }
});

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, function(caractere) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[caractere];
  });
}

function formatarData(data) {
  if (!data) return "";
  const partes = String(data).split("-");
  if (partes.length !== 3) return data;
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function formatarDataHora(data) {
  if (!data) return "";
  const dataObj = new Date(String(data).replace(" ", "T"));
  if (Number.isNaN(dataObj.getTime())) return String(data);
  return dataObj.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(",", " às");
}

function obterPrimeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}

function classeEtapa(etapaAtual, indice, total) {
  if (indice < etapaAtual) return "concluida";
  if (indice === etapaAtual) return "atual";
  return "";
}

function renderizarAcompanhamento(pedido) {
  const status = pedido.status_entrega;

  if (status === "Cancelado" || status === "Devolvido") {
    const devolvido = status === "Devolvido";
    mensagemAcompanhamento.className = "mensagem-acompanhamento resultado-acompanhamento";
    mensagemAcompanhamento.innerHTML =
      '<div class="acompanhamento-resultado">' +
        '<div class="resultado-alerta ' + (devolvido ? "devolvido" : "cancelado") + '">' +
          '<i class="fa-solid ' + (devolvido ? "fa-rotate-left" : "fa-circle-xmark") + '"></i>' +
          '<div><strong>' + (devolvido ? "Pedido devolvido" : "Pedido cancelado") + '</strong>' +
          '<span>Entre em contato conosco pelo WhatsApp caso tenha dúvidas.</span></div>' +
        '</div>' +
      '</div>';
    mensagemAcompanhamento.style.display = "block";
    return;
  }

  const etapas = [
    "Pedido recebido",
    "Pedido confirmado",
    "Em preparação",
    "Em trânsito",
    "Entrega realizada"
  ];

  const mapaStatus = {
    "Pendente": 0,
    "Reservado": 1,
    "Aguardando recolhimento": 2,
    "Em trânsito": 3,
    "Concluído": 4
  };

  const etapaAtual = mapaStatus[status] ?? 0;

  const timeline = etapas.map(function(etapa, indice) {
    const classe = classeEtapa(etapaAtual, indice, etapas.length);
    const icone = indice < etapaAtual ? "fa-check" : indice === etapaAtual ? "fa-circle" : "fa-circle";
    return '<div class="acompanhamento-etapa ' + classe + '">' +
      '<div class="etapa-marcador"><i class="fa-solid ' + icone + '"></i></div>' +
      '<div class="etapa-texto">' + escaparHtml(etapa) + '</div>' +
    '</div>';
  }).join("");

  const produtos = Array.isArray(pedido.itens) && pedido.itens.length
    ? pedido.itens.map(function(item) {
        return '<li><span>' + escaparHtml(item.produto) + '</span><strong>Qtd. ' + escaparHtml(item.quantidade) + '</strong></li>';
      }).join("")
    : '<li><span>Itens do pedido</span></li>';

  const nomeCliente = escaparHtml(obterPrimeiroNome(pedido.cliente_nome) || "cliente");
  const nomeRecebido = obterPrimeiroNome(pedido.recebido_por);

  mensagemAcompanhamento.className = "mensagem-acompanhamento resultado-acompanhamento";
  mensagemAcompanhamento.innerHTML =
    '<div class="acompanhamento-resultado">' +
      '<div class="resultado-cabecalho">' +
        '<div><span>Pedido</span><strong>#' + escaparHtml(pedido.numero_pedido) + '</strong></div>' +
        '<div><span>Cliente</span><strong>' + nomeCliente + '</strong></div>' +
      '</div>' +
      '<div class="resultado-datas">' +
        '<p>Pedido realizado em <strong>' + formatarDataHora(pedido.data_pedido) + '</strong></p>' +
        (pedido.previsao_entrega ? '<p>Previsão de entrega: <strong>' + formatarData(pedido.previsao_entrega) + '</strong></p>' : '') +
      '</div>' +
      '<div class="acompanhamento-timeline">' + timeline + '</div>' +
      (status === "Concluído" ? '<div class="entrega-realizada-box"><strong>Entrega realizada</strong>' + (nomeRecebido ? '<span>Recebido por <strong>' + escaparHtml(nomeRecebido) + '</strong></span>' : '<span>Recebimento não registrado</span>') + (pedido.data_entrega ? '<span>Entregue em <strong>' + formatarData(pedido.data_entrega) + '</strong></span>' : '') + '</div>' : '') +
      '<div class="itens-acompanhamento"><h3>Produtos do pedido</h3><ul>' + produtos + '</ul></div>' +
    '</div>';
  mensagemAcompanhamento.style.display = "block";
}

formAcompanhamento.addEventListener("submit", async function(event) {
  event.preventDefault();

  const numero = document.getElementById("numero-pedido-acompanhamento").value.trim();
  const documento = document.getElementById("documento-acompanhamento").value.trim();

  mensagemAcompanhamento.className = "mensagem-acompanhamento";
  mensagemAcompanhamento.textContent = "";
  mensagemAcompanhamento.style.display = "none";

  if (!/^\d+$/.test(numero) || !documento) {
    mensagemAcompanhamento.textContent = "Informe o número do pedido e o CPF ou CNPJ.";
    mensagemAcompanhamento.style.display = "block";
    return;
  }

  const botao = formAcompanhamento.querySelector(".botao-consultar-pedido");
  const textoOriginal = botao.innerHTML;
  botao.disabled = true;
  botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Consultando...';

  try {
    const { data, error } = await db.rpc("consultar_pedido_publico", {
      p_numero_pedido: Number(numero),
      p_documento: documento
    });

    if (error) throw error;

    const pedido = Array.isArray(data) ? data[0] : data;

    if (!pedido) {
      mensagemAcompanhamento.textContent = "Não encontramos um pedido com esses dados.";
      mensagemAcompanhamento.style.display = "block";
      return;
    }

    renderizarAcompanhamento(pedido);
  } catch (erro) {
    console.error("Erro ao consultar pedido:", erro);
    mensagemAcompanhamento.textContent = "Não foi possível consultar o pedido agora. Tente novamente em instantes.";
    mensagemAcompanhamento.style.display = "block";
  } finally {
    botao.disabled = false;
    botao.innerHTML = textoOriginal;
  }
});


modal.addEventListener("click", function(event) {

  if (event.target === modal) {
    fecharModalProduto();
  }

});


document.addEventListener("keydown", function(event) {

  if (event.key === "Escape") {
    fecharModalProduto();
    modalAcompanhamento.classList.remove("aberto");
  }

});


botoes.forEach(function(botao) {

  botao.addEventListener("click", function(event) {

    event.preventDefault();

    botoes.forEach(function(item) {
      item.classList.remove("ativo");
    });

    botao.classList.add("ativo");

    const categoriaSelecionada = botao.textContent.trim();

    mostrarProdutos(categoriaSelecionada, 1);
  });

});


campoBusca.addEventListener("input", function() {
  mostrarProdutos(categoriaAtual, 1);
});


destaqueWhatsapp.addEventListener("click", function(event) {

  const vendedor =
    VENDEDORES[Math.floor(Math.random() * VENDEDORES.length)];

  const mensagem =
    "Olá! Gostaria de mais informações sobre os produtos do catálogo.";

  destaqueWhatsapp.href =
    `https://wa.me/${vendedor.numero}?text=${encodeURIComponent(mensagem)}`;

});


mostrarProdutos("Todos", 1);
