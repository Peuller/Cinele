A implementação de um clone do *Wordle* focado em cinema é altamente viável e o custo de infraestrutura inicial é praticamente zero. A peça-chave é utilizar metadados e imagens providas por APIs públicas gratuitas e gerenciar a "revelação" das imagens no próprio navegador (frontend).

### 1. APIs Públicas Recomendadas

Você não precisará de um banco de dados próprio para armazenar os filmes. O ecossistema de APIs de cinema é muito robusto.

* **TMDB API (The Movie Database):** É a melhor opção absoluta para este projeto. Ela é gratuita, suporta português (pt-BR) e fornece tudo o que você precisa: título, sinopse, elenco, diretor, ano de lançamento e, o mais importante, **Backdrops** (imagens de fundo/cenas do filme em alta resolução).
* **Como gerar os "Cenários Obscurecidos":** Você não precisa de uma API que censure imagens. Você fará a chamada para o TMDB, pegará o link da imagem (Backdrop) e aplicará filtros via CSS (`filter: blur(40px) brightness(0.5)`) ou desenhará em um `<canvas>` aplicando pixelização matemática. A cada erro do jogador, você reduz a intensidade do filtro via JavaScript.

---

### 2. Arquitetura e Tech Stack

| Camada | Tecnologia | Justificativa |
| --- | --- | --- |
| **Frontend** | Next.js (React) ou SvelteKit | SSR (Server-Side Rendering) garante carregamento instantâneo. Essencial para retenção diária no mobile. Hospedagem gratuita na Vercel. |
| **Estilização** | Tailwind CSS | Facilita a criação das transições do `blur` das imagens e a grade de resultados com facilidade. |
| **Backend / DB** | Supabase (PostgreSQL) | Necessário apenas para armazenar a tabela de "Filme do Dia" (curadoria) e gerenciar o login/pagamento dos usuários Premium. |
| **Estado Local** | `localStorage` nativo | Mantém o progresso do usuário no dia. Se ele fechar o navegador e voltar, as tentativas continuam lá. |

---

### 3. Lógica do Jogo (O Motor Diário)

Para evitar que a API retorne filmes obscuros injogáveis (ex: um curta universitário da Romênia), você não usará a API de forma 100% aleatória diária.

1. **A Curadoria (Cronjob):** Você cria um script em Node.js que roda uma vez por semana. Ele puxa os 500 filmes mais populares do TMDB, seleciona 7 filmes para a semana, e salva no seu Supabase a lista: `data: 2026-10-15 | tmdb_id: 155 (Batman O Cavaleiro das Trevas)`.
2. **O Carregamento do Dia:** Quando o usuário abre o site, o Next.js verifica a data de hoje, consulta qual é o `tmdb_id` do dia, e faz o fetch na API do TMDB para pegar os dados frescos.
3. **A Escada de Dicas (Progresso de Tentativas):**
* *Tentativa 1:* Imagem (Backdrop) com blur de 50px + saturação em 0 (preto e branco).
* *Tentativa 2:* Imagem com blur de 30px + cores ativadas.
* *Tentativa 3:* Blur removido, mas imagem cortada (zoom em um canto do cenário). Revela o Ano de Lançamento.
* *Tentativa 4:* Revela os 3 atores principais (via endpoint `/credits` do TMDB).
* *Tentativa 5 (Última):* Revela o Diretor e a primeira frase da sinopse.



---

### 4. Integração de Compartilhamento e Monetização

**O Motor de Viralidade (Web Share API)**
Quando o jogador acerta (ou perde), o jogo gera um texto padronizado. O navegador utiliza a `navigator.share()` (que abre a gaveta nativa do WhatsApp/Twitter no celular) ou copia para a área de transferência:

> Cena do Dia #42 🎬
> 🟥 🟥 🟨 🟩 ⬛
> Jogue em: cenadodia.com.br

**A Monetização na Prática**

* **Rewarded Ads (Dica Extra):** Para jogos rodando no navegador do celular, integre o SDK do **Google AdSense for Games (H5 Games Ads)**. Você configura um botão "Assistir anúncio para revelar uma letra". O jogador clica, assiste a um vídeo de 15s (que roda em um iframe nativo do AdSense) e o callback da API libera a dica no jogo.
* **Assinatura Premium:** Utilize o **Stripe Payment Links** ou uma API de Pix (MercadoPago/Asaas). Ao detectar o status de assinante no Supabase (usando `Supabase Auth`), o frontend renderiza o botão "Modo Arquivo" na tela inicial, permitindo que o usuário escolha qualquer data do passado ou acesse o "Modo Infinito" (que aí sim puxa filmes aleatórios direto do TMDB, sem curadoria diária).

---

### 5. Plano de Ação (Semanas 1 a 3)

**Semana 1: O Motor Core e a API**

* Crie uma conta gratuita no TMDB e gere sua API Key.
* Crie o projeto Next.js e configure uma barra de busca (usando o endpoint `/search/movie` do TMDB) para que o usuário possa digitar e selecionar o palpite.
* Implemente o filtro de CSS na imagem. Crie a lógica de `localStorage` que avança de 1 a 5, reduzindo o blur.

**Semana 2: Curadoria e Banco de Dados**

* Configure o banco de dados no Supabase. Crie uma tabela simples `daily_movies (date, tmdb_id)`.
* Popule a tabela com 30 dias de filmes famosos.
* Conecte o frontend para buscar o filme baseado na data atual do sistema (`new Date()`).
* Implemente o gerador de matriz de emojis e o botão de compartilhamento.

**Semana 3: Refinamento e Monetização**

* Adicione animações simples (tremer a barra de busca em palpites errados, confete em caso de vitória).
* Solicite aprovação no Google AdSense para web games e insira o script do AdSense.
* Configure o sistema de login (Google Auth via Supabase) e a integração de pagamento para a liberação do "Modo Arquivo".