import { expect, test } from '@playwright/test'
import { contarMensagens, entrarPelaTela, lerCodigo, sql, telefoneUnico } from './ajudantes'

// T04 — A01 (entrar), A02 (trocar número) e D04-papéis. Rodam nos viewports mobile e desktop. WhatsApp e Google
// reais não entram: o provedor de mensagens é um fake que grava o código num arquivo (homologação real é a T38).

test.describe('A01 — entrar', () => {
  test('login completo: telefone → código → nome → aceite → volta ao deep link', async ({ page }) => {
    const tel = telefoneUnico()
    await entrarPelaTela(page, tel, 'Ana E2E', '/app/perfil/numero')
    await expect(page).toHaveURL(/\/app\/perfil\/numero$/)
    await expect(page.getByRole('heading', { name: 'Trocar WhatsApp' })).toBeVisible()
    // Sessão de verdade: recarregar a página mantém a pessoa logada (não volta para /entrar).
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Trocar WhatsApp' })).toBeVisible()
  })

  test('segundo login (conta existente) entra só com o código, sem nome nem aceite', async ({ page, context }) => {
    const tel = telefoneUnico()
    await entrarPelaTela(page, tel, 'Bia E2E', '/app/perfil/numero')
    await expect(page).toHaveURL(/\/app\/perfil\/numero$/)
    await context.clearCookies() // "novo aparelho"
    await page.goto('/entrar?voltar=/app/perfil/numero')
    await page.getByTestId('telefone').fill(tel.digitado)
    await page.getByTestId('enviar-codigo').click()
    await page.getByTestId('codigo').fill(await lerCodigo(tel.e164, 1))
    await page.getByTestId('confirmar-codigo').click()
    await expect(page).toHaveURL(/\/app\/perfil\/numero$/)
  })

  test('estados de erro: telefone inválido, código errado e reenvio invalida o anterior', async ({ page }) => {
    await page.goto('/entrar')
    await page.getByTestId('telefone').fill('12345')
    await page.getByTestId('enviar-codigo').click()
    await expect(page.getByTestId('erro')).toContainText('WhatsApp brasileiro')

    const tel = telefoneUnico()
    await page.getByTestId('telefone').fill(tel.digitado)
    await page.getByTestId('enviar-codigo').click()
    const primeiro = await lerCodigo(tel.e164)
    await page.getByTestId('codigo').fill(primeiro === '000000' ? '111111' : '000000')
    await page.getByTestId('confirmar-codigo').click()
    await expect(page.getByTestId('erro')).toContainText('Código inválido ou expirado')

    await page.getByTestId('reenviar').click()
    const segundo = await lerCodigo(tel.e164, 1)
    await page.getByTestId('codigo').fill(primeiro)
    await page.getByTestId('confirmar-codigo').click()
    if (primeiro !== segundo) await expect(page.getByTestId('erro')).toContainText('Código inválido ou expirado')
    await page.getByTestId('codigo').fill(segundo)
    await page.getByTestId('confirmar-codigo').click()
    await expect(page.getByTestId('nome')).toBeVisible() // código novo vale: segue para nome e aceite
  })

  test('sem aceitar os documentos não há como concluir', async ({ page }) => {
    const tel = telefoneUnico()
    await page.goto('/entrar')
    await page.getByTestId('telefone').fill(tel.digitado)
    await page.getByTestId('enviar-codigo').click()
    await page.getByTestId('codigo').fill(await lerCodigo(tel.e164))
    await page.getByTestId('confirmar-codigo').click()
    await page.getByTestId('nome').fill('Caio E2E')
    await expect(page.getByTestId('concluir')).toBeDisabled()
    await page.getByTestId('aceite').check()
    await expect(page.getByTestId('concluir')).toBeEnabled()
  })

  test('destino malicioso em `voltar` é ignorado (sem redirect aberto)', async ({ page }) => {
    const tel = telefoneUnico()
    await entrarPelaTela(page, tel, 'Duda E2E', '//evil.example/roubo')
    await expect(page).toHaveURL(/localhost:\d+\/$/)
  })
})

test.describe('A02 — trocar o número', () => {
  test('troca com código no número novo e mostra o novo número mascarado', async ({ page }) => {
    const antigo = telefoneUnico()
    const novo = telefoneUnico()
    await entrarPelaTela(page, antigo, 'Eli E2E', '/app/perfil/numero')
    await page.getByTestId('novo-telefone').fill(novo.digitado)
    await page.getByTestId('enviar-codigo').click()
    await page.getByTestId('codigo').fill(await lerCodigo(novo.e164))
    await page.getByTestId('confirmar').click()
    await expect(page.getByTestId('trocado')).toContainText('Seu WhatsApp agora é')
    const ativos = await sql<{ telefone: string }>(
      `select telefone from vinculos_telefone where ativo and telefone = any($1)`,
      [[antigo.e164, novo.e164]],
    )
    expect(ativos.map((a) => a.telefone)).toEqual([novo.e164])
  })

  test('número de outra conta é rejeitado com orientação de suporte', async ({ page, browser, baseURL }) => {
    const dono = telefoneUnico()
    const outroContexto = await browser.newContext({ baseURL: baseURL ?? '' })
    await entrarPelaTela(await outroContexto.newPage(), dono, 'Dono do Número', '/')
    await outroContexto.close()

    const eu = telefoneUnico()
    await entrarPelaTela(page, eu, 'Fábio E2E', '/app/perfil/numero')
    await page.getByTestId('novo-telefone').fill(dono.digitado)
    await page.getByTestId('enviar-codigo').click()
    await page.getByTestId('codigo').fill(await lerCodigo(dono.e164, 1))
    await page.getByTestId('confirmar').click()
    await expect(page.getByTestId('erro')).toContainText('Procure a barbearia')
  })
})

test.describe('D04 — papéis da equipe', () => {
  test('quem não é admin vê acesso restrito', async ({ page }) => {
    await entrarPelaTela(page, telefoneUnico(), 'Gabi E2E', '/admin/equipe/papeis')
    await expect(page.getByTestId('sem-acesso')).toBeVisible()
  })

  test('admin concede e revoga papel; com login antigo a tela pede reautenticação e repete a ação', async ({ page, browser, baseURL }) => {
    const admin = telefoneUnico()
    const alvo = telefoneUnico()
    const nomeAlvo = `Hugo ${alvo.e164.slice(-4)}`
    const outroContexto = await browser.newContext({ baseURL: baseURL ?? '' })
    await entrarPelaTela(await outroContexto.newPage(), alvo, nomeAlvo, '/')
    await outroContexto.close()

    await entrarPelaTela(page, admin, 'Admin E2E', '/')
    await sql(
      `insert into papeis_usuario (id, barbearia_id, usuario_id, papel)
       select gen_random_uuid(), u.barbearia_id, u.id, 'admin' from usuarios u join vinculos_telefone v on v.usuario_id = u.id
       where v.telefone = $1 and v.ativo`,
      [admin.e164],
    )

    await page.goto('/admin/equipe/papeis')
    await page.getByTestId('busca-telefone').fill(alvo.digitado)
    await page.getByTestId('buscar').click()
    await expect(page.getByTestId('achado')).toContainText(nomeAlvo)
    await page.getByTestId('conceder-barbeiro').click()
    await expect(page.getByTestId('aviso')).toContainText('concedido')
    await expect(page.getByTestId('membros')).toContainText(nomeAlvo)

    // Login "antigo" (2 h): a revogação exige autenticação recente.
    await sql(
      `update auth_sessoes set auth_time = now() - interval '2 hours'
       where usuario_id = (select usuario_id from vinculos_telefone where telefone = $1 and ativo)`,
      [admin.e164],
    )
    page.once('dialog', (d) => void d.accept())
    await page.getByRole('row', { name: new RegExp(nomeAlvo) }).getByTestId('revogar-barbeiro').click()
    await expect(page.getByTestId('reautenticar')).toBeVisible()
    const antes = contarMensagens(admin.e164)
    await page.getByTestId('reauth-enviar').click()
    await page.getByTestId('reauth-codigo').fill(await lerCodigo(admin.e164, antes))
    await page.getByTestId('reauth-confirmar').click()
    // A ação original é repetida sozinha depois da reautenticação.
    await expect(page.getByTestId('aviso')).toContainText('removido')
    await expect(page.getByTestId('membros')).not.toContainText(nomeAlvo)
  })
})
