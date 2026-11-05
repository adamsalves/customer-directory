import { expect, test } from '@playwright/test'

// What a crawler or a link preview reads is the HTML the server sends, before any script runs, so
// this asks for it with no browser. The mobile project would only repeat the same request.
test.skip(({ isMobile }) => isMobile, 'the server HTML is the same at any width')

// The prototype's, with "clientes" (ADR-0020)
const DESCRIPTION =
  'Diretório de clientes Juntos Somos Mais: busque por nome, filtre por estado e veja os detalhes de cada cliente.'
const DESCRIPTION_TAG = `<meta name="description" content="${DESCRIPTION}">`

test('the list comes with its title and description', async ({ request }) => {
  const html = await (await request.get('/customers')).text()

  expect(html).toContain('<title>Lista de clientes · Juntos Somos Mais</title>')
  expect(html).toContain(DESCRIPTION_TAG)
})

test('a customer comes with its title, description and photo', async ({ request }) => {
  const html = await (await request.get('/customers/alejandra-rodrigues')).text()

  expect(html).toContain('<title>Alejandra Rodrigues · Juntos Somos Mais</title>')
  expect(html).toContain(DESCRIPTION_TAG)
  expect(html).toContain(
    '<meta property="og:title" content="Alejandra Rodrigues · Juntos Somos Mais">',
  )
  expect(html).toContain(
    '<meta property="og:image" content="https://randomuser.me/api/portraits/women/18.jpg">',
  )
})
