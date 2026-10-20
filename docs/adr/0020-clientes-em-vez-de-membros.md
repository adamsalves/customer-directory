# 0020. "Clientes" em vez de "membros"

- **Status:** Aceita (a URL `/clientes` passa a ser `/customers` pela [ADR-0021](0021-url-publica-em-ingles.md))
- **Data:** 2026-10-17

## Contexto

O repositório se chama `customer-directory` e o código já fala em `customer` (`normalizeCustomer`, `queryCustomers`, ADR-0006). O protótipo e as ADRs 0006 e 0017 usavam "membros" na interface e na URL. Eram dois termos para a mesma coisa.

## Decisão

- A interface usa **cliente(s)**: URL pública `/clientes` e `/clientes/[id]`, título "Diretório de clientes", H1 "Lista de clientes".
- Os arquivos de página ficam em `pages/customers/`, e o caminho público continua vindo de `definePageMeta({ path })` (ADR-0017).
- Os demais textos do protótipo não mudam (por exemplo, "Usuários" no breadcrumb).
- Os arquivos `docs/design/diretorio-de-membros*.html` mantêm o nome, porque são o export do Claude Design.

## Consequências

- Um termo só, do nome do repositório à URL.
- As ADRs 0006 e 0017 seguem valendo; só o termo da URL e da pasta de páginas muda.
- O desvio de texto entra na tabela da ADR-0013.
