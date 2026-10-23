// ---------- DDD ----------
const ddd = document.getElementById("ddd");

ddd.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "");
});


// ---------- TELEFONE (00000-0000) ----------
const telefone = document.getElementById("telefone");

telefone.addEventListener("input", function () {
    let valor = this.value.replace(/\D/g, ""); // remove tudo que não é número

    if (valor.length <= 5) {
        this.value = valor;
    } else {
        this.value = valor.slice(0, 5) + "-" + valor.slice(5, 9);
    }
});


// ---------- CPF (000.000.000-00) ----------
const cpf = document.getElementById("cpf");

cpf.addEventListener("input", function () {
    let valor = this.value.replace(/\D/g, ""); // remove tudo que não é número

    if (valor.length <= 3) {
        this.value = valor;
    } else if (valor.length <= 6) {
        this.value = valor.slice(0, 3) + "." + valor.slice(3);
    } else if (valor.length <= 9) {
        this.value = valor.slice(0, 3) + "." + valor.slice(3, 6) + "." + valor.slice(6);
    } else {
        this.value = valor.slice(0, 3) + "." + valor.slice(3, 6) + "." + valor.slice(6, 9) + "-" + valor.slice(9, 11);
    }
});


// ---------- CEP (00000-000) + busca na API ViaCEP ----------
const cep = document.getElementById("cep");
const endereco = document.getElementById("endereco");
const bairro = document.getElementById("bairro");
const cidade = document.getElementById("cidade");
const uf = document.getElementById("uf");

// Aplica a máscara enquanto digita
cep.addEventListener("input", function () {
    let valor = this.value.replace(/\D/g, "");

    if (valor.length <= 5) {
        this.value = valor;
    } else {
        this.value = valor.slice(0, 5) + "-" + valor.slice(5, 8);
    }
});

function limparEndereco() {
    endereco.value = "";
    bairro.value = "";
    cidade.value = "";
    uf.value = "";
}

// Quando o campo perde o foco, busca o endereço
cep.addEventListener("blur", function () {
    const cepLimpo = this.value.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
        return; // CEP incompleto, não busca
    }

    fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                alert("CEP não encontrado.");
                limparEndereco();
                return;
            }

            endereco.value = data.logradouro;
            bairro.value = data.bairro;
            cidade.value = data.localidade;
            uf.value = data.uf;
        })
        .catch(() => {
            alert("Erro ao buscar o CEP. Tente novamente.");
        });
});


// ---------- TOMADAS, MESAS E CAPACIDADE (somente números) ----------
["tomadas", "mesas", "capacidade"].forEach(function (id) {
    const campo = document.getElementById(id);

    campo.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "");
    });
});


// ---------- FOTOS (máximo de 6) ----------
const MAX_FOTOS = 6;
const MAX_MB = 5;

const inputFotos = document.getElementById("fotos");
const areaUpload = document.getElementById("areaUpload");
const listaFotos = document.getElementById("listaFotos");
const contadorFotos = document.getElementById("contadorFotos");

let fotos = []; // arquivos selecionados

function atualizarFotos() {
    // Mantém o input sincronizado para o envio do formulário
    const dt = new DataTransfer();
    fotos.forEach(f => dt.items.add(f));
    inputFotos.files = dt.files;

    // Redesenha as miniaturas
    listaFotos.innerHTML = "";
    fotos.forEach(function (arquivo, indice) {
        const item = document.createElement("div");
        item.className = "foto-item";

        const img = document.createElement("img");
        img.alt = "Foto " + (indice + 1) + " do quarto";
        img.src = URL.createObjectURL(arquivo);
        img.onload = () => URL.revokeObjectURL(img.src);

        const remover = document.createElement("button");
        remover.type = "button";
        remover.textContent = "×";
        remover.setAttribute("aria-label", "Remover foto " + (indice + 1));
        remover.addEventListener("click", function () {
            fotos.splice(indice, 1);
            atualizarFotos();
        });

        item.append(img, remover);
        listaFotos.appendChild(item);
    });

    contadorFotos.textContent = fotos.length + " de " + MAX_FOTOS + " fotos";
    areaUpload.classList.toggle("cheio", fotos.length >= MAX_FOTOS);
}

function adicionarFotos(novos) {
    const avisos = [];

    Array.from(novos).forEach(function (arquivo) {
        if (fotos.length >= MAX_FOTOS) {
            if (!avisos.includes("limite")) avisos.push("limite");
            return;
        }
        if (!arquivo.type.startsWith("image/")) {
            avisos.push("“" + arquivo.name + "” não é uma imagem.");
            return;
        }
        if (arquivo.size > MAX_MB * 1024 * 1024) {
            avisos.push("“" + arquivo.name + "” passa de " + MAX_MB + " MB.");
            return;
        }
        fotos.push(arquivo);
    });

    atualizarFotos();

    if (avisos.length) {
        const mensagens = avisos.map(a =>
            a === "limite" ? "Você pode enviar no máximo " + MAX_FOTOS + " fotos." : a
        );
        alert(mensagens.join("\n"));
    }
}

inputFotos.addEventListener("change", function () {
    adicionarFotos(this.files);
});

// Arrastar e soltar
["dragenter", "dragover"].forEach(function (evento) {
    areaUpload.addEventListener(evento, function (e) {
        e.preventDefault();
        areaUpload.classList.add("arrastando");
    });
});

["dragleave", "drop"].forEach(function (evento) {
    areaUpload.addEventListener(evento, function (e) {
        e.preventDefault();
        areaUpload.classList.remove("arrastando");
    });
});

areaUpload.addEventListener("drop", function (e) {
    adicionarFotos(e.dataTransfer.files);
});


// =====================================================
// ---------- ENVIAR O QUARTO AO SERVIDOR (vira um arquivo .json) ----------
// =====================================================
const formQuarto = document.getElementById("formQuarto");

// Redimensiona e comprime a imagem, devolvendo uma string base64
function arquivoParaBase64(arquivo, larguraMax = 800, qualidade = 0.7) {
    return new Promise(function (resolve, reject) {
        const leitor = new FileReader();

        leitor.onerror = reject;
        leitor.onload = function () {
            const img = new Image();
            img.onerror = reject;
            img.onload = function () {
                const escala = Math.min(1, larguraMax / img.width);
                const canvas = document.createElement("canvas");
                canvas.width = img.width * escala;
                canvas.height = img.height * escala;

                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", qualidade));
            };
            img.src = leitor.result;
        };

        leitor.readAsDataURL(arquivo);
    });
}

formQuarto.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (fotos.length === 0) {
        alert("Envie pelo menos 1 foto do quarto.");
        return;
    }

    let fotosBase64;
    try {
        fotosBase64 = await Promise.all(fotos.map(f => arquivoParaBase64(f)));
    } catch (erro) {
        alert("Não foi possível processar as fotos. Tente outras imagens.");
        return;
    }

    const quarto = {
        titulo: document.getElementById("titulo").value.trim(),
        tipo: document.getElementById("tipo").value,                          // NOVO
        preco: Number(document.getElementById("preco").value) || 0,           // NOVO
        descricao: document.getElementById("descricao").value.trim(),         // NOVO
        telefone: "(" + ddd.value + ") " + telefone.value,
        cpf: cpf.value,
        cep: cep.value,
        endereco: endereco.value,
        bairro: bairro.value,
        cidade: cidade.value,
        uf: uf.value,
        numero: document.getElementById("numero").value,
        complemento: document.getElementById("complemento").value,
        tomadas: Number(document.getElementById("tomadas").value) || 0,
        mesas: Number(document.getElementById("mesas").value) || 0,
        capacidade: Number(document.getElementById("capacidade").value) || 0,
        fotos: fotosBase64
    };

    // Envia ao servidor, que cria um arquivo data/quartos/<id>.json
    const botao = formQuarto.querySelector("button[type='submit']");
    botao.disabled = true;
    botao.textContent = "Enviando...";

    try {
        const resposta = await fetch("/api/quartos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quarto)
        });

        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            throw new Error(erro.erro || "Erro ao salvar.");
        }

        alert("Quarto cadastrado com sucesso!");
        window.location.href = "/quartos/quartos.html"; // vai para o catálogo
    } catch (erro) {
        alert(erro.message + " Verifique se o servidor (node server.js) está rodando.");
        botao.disabled = false;
        botao.textContent = "Cadastrar";
    }
});
