# Mob Inventory (Expo SDK 49)

App React Native/Expo (TypeScript) para controle de patrimonio e inventario, com navegacao, componentes reutilizaveis e persistencia local via SQLite + Secure Store.

## Requisitos
- Node 18+ e npm.
- Expo CLI opcional (`npm install -g expo-cli`).

## Como rodar
1. Instale dependencias:
```bash
npm install
```
2. Inicie o bundler:
```bash
npm start
```
3. Targets rapidos:
- Android: `npm run android`
- iOS (macOS): `npm run ios`
- Web: `npm run web`

## Scripts uteis
- `npm run lint` — ESLint + Prettier.
- `npm run format` — Prettier no projeto todo.

## Estrutura principal (src/)
- `components/` – UI reutilizavel (ConfirmModal, AlertBanner/Toast, EmptyState, LoadingOverlay, Button, Input, Surface, Screen layout).
- `navigation/` – React Navigation com AuthStack (Login, Cadastro, Recuperacao) e AppTabs (Dashboard, Areas, Patrimonio, Inventario, Backup/Restore, Configuracoes).
- `screens/` – Telas do sistema.
- `services/` – Autenticacao com SQLite + Secure Store, contexto de sessao.
- `repositories/` – Acesso a dados (User, Area, AssetItem, Session).
- `db/` – Conexao SQLite + migracoes versionadas (schema_version).
- `utils/` – Helpers (hash com salt, delay).
- `types/` – Tipos globais (sessao, modelos).
- `theme/` – Paleta de cores e espacamentos compartilhados.

## Persistencia e autenticacao
- Banco local com `expo-sqlite`, migracoes em `src/db` criando tabelas `users`, `areas`, `asset_items` e `schema_version`.
- **Primeiro Acesso**: Nao ha usuario padrao. O app detecta a ausencia de usuarios e direciona para a tela de cadastro do administrador.
- **Recuperacao de Senha**: Via pergunta de seguranca definida no cadastro.
- Hash de senha com salt via `expo-crypto` (SHA-256 + salt randomico); sessao salva no `expo-secure-store` com `userId`, `username`, `timestamp`.
- Login real valida usuario/senha no SQLite; erros retornam Toast (AlertBanner).

## Patrimonio
- Lista paginada (20), filtros por area, busca por nome/numero, ordenacao por `updated_at`.
- Formulario com validacoes (area obrigatoria, quantidade/valor >= 0) e opcao de gerar numero automaticamente (`PAT-000001` sequencial, unica).
- Detalhe com botoes editar/excluir (ConfirmModal) e atualizacao das listas apos operacoes.
- Exportacao de relatorios: PDF (expo-print) e XLSX (xlsx + expo-file-system + expo-sharing) respeitando filtros e exibindo totais.

## Inventario
- Tabelas: `inventories`, `inventory_snapshot_items` (leitura 0), `inventory_read_items` (leituras).
- Criar inventario define escopo (todas as areas ou uma area) e gera Leitura 0 com snapshot do patrimonio.
- Lista paginada com status (aberto/finalizado) e acoes de abrir/finalizar.
- Tela de leitura permite buscar patrimonio (autocomplete) e registrar itens encontrados ou novos observados (sem numero), com validacao de duplicidade.
- Comparacao L1 x L0 gera divergencias persistidas (`inventory_diff`): OK, Divergente, Ausente, Novo. Tela com filtros/paginacao e exportacao PDF/XLSX.
- Leitura 2: recontagem apenas de divergentes. Resolucao permite escolher L1/L2/ignorar e opcional nota, aplica ajuste transacional (logs em `inventory_adjustment_log`) e finaliza inventario; relatorio final PDF/XLSX.

## Backup/Restore
- Exportar backup gera arquivo `.json` com `schema_version`, usuarios (hash+salt, sem senha em texto), areas, patrimonios, sequencias e inventarios (snapshot + leituras); checksum SHA-256 garante integridade. Usa expo-document-picker/expo-sharing.
- Importar backup valida estrutura/versao, mostra ConfirmModal e restaura em transacao SQLite (limpa e recria tabelas, atualiza sequences). Após restaurar, navega para o Dashboard.

## Configuracoes e testes
- Tela Configuracoes: itens por pagina, regra para ausente (zerar/manter), permitir criar novos no ajuste, formato do numero de patrimonio (`PAT-{seq}`).
- Testes unitarios leves (ts-node) para gerador de patrimonio e regras de comparacao/ajuste: `npm test`.

## Observacoes
- O campo `asset_number` (numero de patrimonio) e obrigatorio; `unit_value` e opcional.
- Repositorios expostos: `userRepository`, `areaRepository`, `assetRepository`, `sessionRepository`.
- Mantenha a sessao segura: deslogue com o botao em Configuracoes limpa o Secure Store.
