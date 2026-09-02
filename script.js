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

/*const VENDEDORES = [
  { nome: "Lucas", numero: "5521983531564" },
  { nome: "Hazelmam", numero: "5521974690154" },
  { nome: "Teste", numero: "5521984525497" }
];*/

const destaqueWhatsapp = document.getElementById("destaque-whatsapp");

const PRODUTOS_POR_PAGINA = 30;

let categoriaAtual = "Todos";
let paginaAtual = 1;


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

      <p>
        <strong>${produto.preco}</strong>
      </p>
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

  modalPreco.textContent = produto.preco;

  const mensagem =
    `Olá! Tenho interesse no produto "${produto.nome}", no valor de ${produto.preco}.`;

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


modal.addEventListener("click", function(event) {

  if (event.target === modal) {
    fecharModalProduto();
  }

});


document.addEventListener("keydown", function(event) {

  if (event.key === "Escape") {
    fecharModalProduto();
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
    "Olá! Gostaria de mais informações sobre os produtos.";

  destaqueWhatsapp.href =
    `https://wa.me/${vendedor.numero}?text=${encodeURIComponent(mensagem)}`;

});


mostrarProdutos("Todos", 1);
