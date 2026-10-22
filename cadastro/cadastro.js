const dia = document.getElementById("dia");
for (let d = 1; d <= 31; d++) {
    dia.innerHTML += `<option value="${d}">${d}</option>`;
}

const ano = document.getElementById("ano");
const anoAtual = new Date().getFullYear();
for (let a = anoAtual; a >= 1924; a--) {
    ano.innerHTML += `<option value="${a}">${a}</option>`;
}





const nome = document.getElementById("nome");

nome.addEventListener("input", function() {
    this.value = this.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
});





const ddd = document.getElementById("ddd");

ddd.addEventListener("input", function() {
    let valor = this.value.replace(/\D/g, "");
    this.value = valor
})





const telefone = document.getElementById("telefone");

telefone.addEventListener("input", function() {
    let valor = this.value.replace(/\D/g, "");    // remove tudo que não é número

    if (valor.length <= 5) {
        this.value = valor;
    } else {
        this.value = valor.slice(0, 5) + "-" + valor.slice(5, 9);
    }
});





const cpf = document.getElementById("cpf");

cpf.addEventListener("input", function() {
    let valor = this.value.replace(/\D/g, "");        // remove tudo que não é número

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


const cep = document.getElementById("cep");
const endereco = document.getElementById("endereco");
const bairro = document.getElementById("bairro");
const cidade = document.getElementById("cidade");
const uf = document.getElementById("uf");

// Aplica a máscara 00000-000 enquanto digita
cep.addEventListener("input", function() {
    let valor = this.value.replace(/\D/g, "");

    if (valor.length <= 5) {
        this.value = valor;
    } else {
        this.value = valor.slice(0, 5) + "-" + valor.slice(5, 8);
    }
});

// Quando o campo perde o foco, busca o endereço na API ViaCEP
cep.addEventListener("blur", function() {
    const cepLimpo = this.value.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
        return; // CEP incompleto, não busca
    }

    fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                alert("CEP não encontrado.");
                endereco.value = "";
                bairro.value = "";
                cidade.value = "";
                uf.value = "";
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