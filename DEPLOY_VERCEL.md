# Vercel = sistema web no navegador (não app mobile)

Na Vercel você publica a **versão web** do App Faccionista: o faccionista abre o **link no Chrome/Edge/Safari** e faz login — igual a um site.

**Não** use na Vercel:

- EAS Build / `eas build`
- `expo prebuild`
- Build para Android (`apk`/`aab`) ou iOS (`ipa`)
- Framework preset que instala “app” no celular

O comando de deploy é só:

```bash
expo export --platform web
```

Isso gera a pasta `dist/` com `index.html` + JavaScript — um site estático.

---

## Configuração no painel da Vercel

Repositório no GitHub = pasta do projeto Expo (raiz com `package.json`):

| Campo | Valor |
|--------|--------|
| **Framework Preset** | **Other** (não escolha “Expo” se pedir build nativo) |
| **Root Directory** | *(vazio — raiz do repo)* |
| **Build Command** | `npm run build:web` ou deixe vazio se existir `vercel.json` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

O arquivo `vercel.json` na raiz do repo já define isso.

### Variáveis de ambiente (obrigatório)

**Project → Settings → Environment Variables**

| Nome | Valor |
|------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | chave anon |

Marque Production, Preview e Development.

**Importante:** o Expo grava `EXPO_PUBLIC_*` **no momento do build**. Se você adicionar as variáveis depois, precisa **Redeploy** (não basta salvar — o site antigo continua sem URL/chave).

Erro `supabaseUrl is required` = variáveis ausentes no build ou Redeploy pendente.

---

## Como saber se deu certo

No log do deploy deve aparecer:

```text
Exported: dist
› Files: index.html, favicon.ico, ...
```

Ao abrir a URL da Vercel:

- Abre a **tela de login** no navegador
- **Não** baixa arquivo
- **Não** pede para instalar app

---

## Testar no PC antes do deploy

```bash
npm install
npm run build:web
npx serve dist
```

Abra `http://localhost:3000`.

---

## App no celular (opcional, fora da Vercel)

- **Android/iOS nativo:** use `expo start` no PC ou EAS Build — isso é outro fluxo, não a Vercel.
- **Web no celular:** abra o mesmo link da Vercel no navegador do telefone (pode “Adicionar à tela inicial” — continua sendo web).

---

## Subir configuração para o GitHub

Garanta commit de: `vercel.json`, `app.json`, `package.json` (com `build:web` e `vercel-build`).

Depois: push → Vercel redeploy automático.
