# tgen

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D10.12.0-brightgreen)](https://nodejs.org/) [![Platform](https://img.shields.io/badge/platform-Windows%20|%20Linux%20|%20macOS-lightgrey)](#)

---

## O que é?

`tgen` é uma ferramenta CLI para **gerar e recriar árvores de diretórios** a partir de uma estrutura física ou de um arquivo texto com o formato da árvore.

Eu criei este projeto porque uso muito agentes de IA no meu dia a dia e frequentemente me deparo com a necessidade de compartilhar a estrutura de arquivos dos meus projetos. Criar isso manualmente é cansativo e demorado.

No começo, só queria uma função que criasse pastas e arquivos placeholder, mas como precisava enviar para a IA uma visão clara da estrutura do meu projeto, resolvi também criar um visualizador de árvore, parecido com o `tree` do Windows.

Assim, além de evitar baixar projetos prontos que não atendem exatamente às minhas necessidades, eu posso personalizar a ferramenta do meu jeito!

---

### Como usar (Windows, Linux e macOS)

É simples. Basta clonar o repositório, entrar na pasta e criar o link global com o npm:

```bash
git clone https://github.com/FabioSmuu/tgen.git
cd tgen
npm link
```
Isso irá criar um comando global **tgen** que pode ser usado em qualquer lugar no seu terminal.

### Como remover o link global
Se quiser remover o link global, também é simples:
```bash
npm unlink -g tgen
```

# Exemplos de uso
---
> Antes de mais nada, use `tgen -h` para ver todos os parametros do projeto.

Gerar a árvore de diretórios de uma pasta e mostrar no terminal:
```bash
tgen ./meuProjeto
```

Gerar a árvore e salvar em um arquivo:
```bash
tgen ./meuProjeto -o ./saida/tree.txt
```

Recriar estrutura a partir de um arquivo tree.txt (criando só pastas):
```bash
tgen ./path/tree.txt -o ./novaEstrutura
```

Recriar estrutura com pastas e arquivos placeholders (com a flag -a):
```bash
tgen ./path/tree.txt -o ./novaEstrutura -a
```

Recriar estrutura lendo do stdin (pipe):
```bash
cat ./path/tree.txt | tgen -o ./novaEstrutura -a
```

Por padrão o CLI já ignora a pasta `node_modules`, mas você pode ignorar outros arquivos/diretorios:
```bash
tgen ./meuProjeto -i .ignore
```

**Obrigado pela sua atenção!**