# 0017. Código em inglês, interface em pt-BR

- **Status:** Aceita (a URL pública passa a ser em inglês, `/customers?page=`, pela [ADR-0021](0021-url-publica-em-ingles.md))
- **Data:** 2026-10-15

## Contexto

O público é brasileiro e a URL é compartilhada, então ela faz parte da interface. O código segue a convenção da indústria (inglês).

## Decisão

- **Inglês:** identificadores, arquivos, classes CSS, custom properties, `data-testid`, parâmetros da API interna, comentários e commits.
- **pt-BR:** tudo que o usuário vê, incluindo a URL pública (`/membros`, `?busca=&estados=&genero=&ordem=&pagina=&por=`), e a documentação.
- Os arquivos de página são em inglês (`pages/members/`) e o caminho público vem de `definePageMeta({ path })`.
- `shared/utils/listQuery.ts` é a **única** fronteira entre a URL em pt-BR e o `IListQuery` em inglês, nos dois sentidos.

## Consequências

- Uma tradução só, testada em ida e volta.
- Quem lê o código não mistura idiomas; quem usa o app não vê inglês.
