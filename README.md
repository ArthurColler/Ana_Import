# Anava Importados

Site institucional e catálogo da **Anava Importados** — produtos de beleza e estética importados
(skincare coreano, linha capilar e perfumaria).

Site estático (HTML/CSS/JS puro), pensado para demonstração ao cliente via **GitHub Pages**.

## Estrutura

```
index.html        → Página inicial (hero, marcas, categorias, sobre, contato)
catalogo.html     → Catálogo completo com busca e filtros (marca + categoria)
imagens.html      → Página INTERNA: checklist das imagens de produto que faltam
css/style.css     → Estilos (paleta extraída da logo: sage #A7A396 / cream #F4F0E3)
js/products.js    → Base de dados dos produtos (marca, linha, categoria, nome)
js/app.js         → Renderização do catálogo, busca e filtros
img/logo.png      → (adicionar) logo oficial
img/products/     → Imagens dos produtos
```

## Como publicar no GitHub Pages

1. Envie o projeto para o GitHub (branch `main`).
2. No repositório: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. O site fica disponível em `https://<usuario>.github.io/Ana_import/`.

## Como adicionar imagens de produtos

1. Abra `imagens.html` no navegador — ela lista o **nome de arquivo esperado** de cada produto.
2. Salve a foto como **JPG quadrado** (ideal 800×800px) em `img/products/` com aquele nome.
   - Exemplo: `medicube-zero-foam-cleanser.jpg`
3. Pronto — o catálogo passa a exibir a foto automaticamente (sem mexer em código).
   Produtos sem foto mostram um placeholder elegante com a gota da marca.

> Dica: prefira as fotos oficiais dos sites das marcas (fundo branco/neutro), salvando
> localmente no repositório — não use hotlink de sites de terceiros.

## Editar produtos

Todos os produtos estão em `js/products.js`, no formato:

```js
["Marca", "Linha (opcional)", "Categoria", "Nome do produto"],
```

Categorias usadas: Limpeza, Toner, Toner Pads, Sérum, Creme, Máscara, Olhos, Lábios,
Proteção Solar, Mist, Tratamentos, Corpo & Banho, Cabelo, Perfumaria, Aparelhos, Kits.

## Pendências / próximos passos

- [ ] Substituir o número de WhatsApp placeholder em `index.html` (procure por `wa.me/5500000000000`)
- [ ] Adicionar `img/logo.png` com a logo oficial (o header atual usa texto estilizado)
- [ ] Pesquisar e adicionar as imagens dos produtos (ver `imagens.html`)
- [ ] Confirmar preços/disponibilidade por produto (hoje o catálogo não exibe preço)
- [ ] Após aprovação do cliente: domínio próprio + avaliação de e-commerce com checkout (ex.: Pagar.me)
