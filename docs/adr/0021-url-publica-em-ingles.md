# 0021. URL pública em inglês

- **Status:** Aceita
- **Data:** 2026-10-20

## Contexto

A ADR-0017 tratava a URL pública como interface e a deixava em pt-BR (`/clientes?pagina=2&por=18`), com `definePageMeta({ path })` para separar o caminho público do arquivo da página e o `parseListQuery` traduzindo as chaves para o `IListQuery` em inglês. Isso deixava dois idiomas no mesmo caminho do código: o arquivo `pages/customers/` servindo `/clientes`, e chaves da URL diferentes dos campos do objeto.

## Decisão

- Tudo dentro do projeto é escrito em inglês, **incluindo as URLs**: `/customers`, `/customers/[id]` e `?search=&states=&gender=&sort=&page=&perPage=`.
- O caminho público vem do nome do arquivo da página (`pages/customers/`), sem `definePageMeta({ path })`.
- As chaves da URL têm o mesmo nome dos campos do `IListQuery`. O `parseListQuery` continua sendo o único ponto que valida `route.query` e `getQuery` (ADR-0016), mas sem tradução de chaves.
- Continua em pt-BR o que o usuário lê na tela: textos, `aria-label`, toasts e meta (ADR-0017).

## Consequências

- Um idioma só do arquivo da página até o objeto da query; a ida e volta do `listQuery` fica mais simples.
- A URL compartilhada deixa de estar em português, o que é aceito.
- Substitui a parte de URL das ADRs 0017 e 0020; o resto delas segue valendo.
