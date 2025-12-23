# &#128230; Mob Inventory

Mob Inventory e um aplicativo **React Native (Expo SDK 49)** para controle de patrimonio e inventario, com operacao offline em **SQLite**, autenticacao local e sincronizacao **Mestre <-> Coletor** via QR Code + PIN.

A solucao cobre cadastro de areas e itens, inventarios com leituras (L0/L1/L2), comparacao de divergencias, ajustes finais e exportacao de relatorios em PDF/XLSX.

---

## &#128736; Tecnologias Utilizadas

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React" width="30" height="30"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" alt="TypeScript" width="30" height="30"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg" alt="SQLite" width="30" height="30"/>
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="Node.js" width="30" height="30"/>
</p>

- **React Native + Expo** - base mobile e runtime do app
- **TypeScript** - tipagem e manutencao do codigo
- **SQLite (expo-sqlite)** - persistencia local com migracoes
- **Secure Store + Crypto** - sessao e hash de credenciais
- **React Navigation** - navegacao por stacks e tabs
- **expo-print / xlsx / expo-sharing** - relatorios PDF/XLSX
- **expo-camera / QR Code / TCP Socket** - pareamento e coleta

---

## &#128194; Estrutura do Projeto

- `App.tsx` - bootstrap do app, inicializacao do banco e AuthProvider
- `src/db/index.ts` - conexao SQLite, migracoes e transacoes
- `src/navigation/` - AuthStack, AppTabs e telas Mestre/Coletor
- `src/screens/` - telas de login, cadastro, patrimonio, inventario, backup e configuracoes
- `src/repositories/` - acesso a dados SQL (users, areas, assets, inventories, sync)
- `src/services/` - regras de negocio (auth, inventario, backup, exportacao, coletor)
- `src/components/` - UI reutilizavel e layouts
- `tests/` - testes unitarios (inventario, backup, regras)

---

## &#9989; Pre-requisitos

- **Node.js 18+** e npm
- **Expo CLI** (opcional): `npm install -g expo-cli`
- Android Studio / Xcode para emuladores (opcional)

---

## &#9881; Configuracao

1. Instale as dependencias:
```bash
npm install
```

2. Inicie o projeto:
```bash
npm start
```

3. Alvos rapidos:
   - Android: `npm run android`
   - iOS (macOS): `npm run ios`
   - Web: `npm run web`

---

## &#129514; Scripts uteis

- `npm run lint` - ESLint
- `npm run format` - Prettier
- `npm test` - testes unitarios com ts-node

---

## &#128272; Autenticacao e Sessao

- Primeiro acesso exige criar o usuario administrador.
- Senhas e respostas de seguranca usam **SHA-256 + salt**.
- Sessao persistida no **Secure Store** (fallback em memoria).

---

## &#128230; Patrimonio

- Cadastro com area obrigatoria, quantidade e valor unitario opcionais.
- Numero de patrimonio manual ou **auto-gerado** (`PAT-000001`) com formato configuravel.
- Listagem com filtros por nome, numero e area, paginacao e ordenacao por atualizacao.
- Exportacao de relatorio de patrimonio em PDF/XLSX com totais.

---

## &#128203; Inventario

- Criacao por **escopo total** ou **por area**.
- **L0 (snapshot)** registra o patrimonio existente no momento da abertura.
- **L1 (leitura)** permite registrar itens encontrados e itens novos sem numero.
- Comparacao gera status **OK**, **Divergente**, **Ausente** e **Novo**.
- **L2 (recontagem)** e resolucao final aplicam ajustes transacionais com log.

---

## &#128202; Relatorios

- Comparativo L0 x L1 (PDF/XLSX).
- Relatorio final de ajuste (PDF/XLSX).
- Patrimonio com totais por quantidade e valor.

---

## &#128257; Backup e Restore

- Exporta JSON com `schema_version`, checksum e dados completos.
- Importa e valida o arquivo antes de restaurar via transacao SQLite.

---

## &#128268; Modo Mestre e Coletor

**Mestre**
- Abre recepcao local via **TCP Socket** (porta 8080).
- Exibe **QR Code** com IP/porta e **PIN** de pareamento.
- Recebe lotes, lista e permite **aprovar** ou **rejeitar**.

**Coletor**
- Le o QR, salva IP/porta e PIN.
- Sincroniza areas do mestre e registra itens via camera ou digitacao.
- Envia lote para o mestre e registra logs locais.

---

## &#128451; Banco de Dados

- Migracoes versionadas em `schema_version`.
- Tabelas principais: `users`, `areas`, `asset_items`, `inventories`, `inventory_snapshot_items`, `inventory_read_items`, `inventory_diff`, `inventory_adjustment_log`.
- Tabelas de sincronizacao: `collector_*`, `sync_*`, `asset_import_log`.

---

## &#128204; Observacoes

- Regras de ajuste (ausentes, criacao de novos e formato do patrimonio) ficam em Configuracoes.
- O modo Mestre/Coletor pressupoe dispositivos na **mesma rede local**.
- O app e **offline-first**: toda a base roda localmente em SQLite.

---

## &#128196; Licenca

Este projeto esta licenciado sob a [MIT License](LICENSE).
