export type Lang = "pt" | "en";

export const translations = {
  pt: {
    // Header
    brandSubtitle: "Cinema Daily",
    howToPlay: "Como Jogar",
    stats: "Estatísticas",
    becomeVip: "VIRAR VIP",
    vipArea: "ÁREA VIP",
    signIn: "Entrar",
    signOut: "Sair",
    switchLang: "Mudar para Inglês",

    // Session Status
    infinite: "Infinito",
    archive: "Arquivo",
    daily: "Diário",
    infinitePoster: "Cartaz Infinito",
    dailyPoster: (n: number) => `Cartaz do Dia #${n}`,
    attempts: "Tentativas",
    loading: "Carregando…",
    tryAgain: "Tentar de novo",

    // Prompt
    guessQuestion: "De qual filme é este cartaz?",
    guessSubtitle: "O zoom se afasta e revela mais detalhes a cada tentativa incorreta.",

    // Guess Input
    inputPlaceholder: "Qual é o filme? Digite para buscar…",
    gameOver: "Fim de jogo",
    skip: "Pular",
    skipTitle: "Pular (conta como erro e revela mais)",
    noMovieFound: "Nenhum filme encontrado.",
    correctBanner: "Você acertou!",
    eraBanner: "Era…",
    resultBtn: "Resultado",

    // Feedback & Toasts
    closeHint: "Quase! O ano é próximo.",
    wrongHint: "Não é esse… o cartaz abriu mais!",
    connectionError: "Falha de conexão. Tente novamente.",
    letterRevealed: "Letra revelada!",

    // Accordion / Clues
    dossierTitle: "Ficha Técnica · Pistas",
    allRevealed: "Todas reveladas",
    cluesAvailable: (u: number, t: number) => `${u} de ${t} disponíveis`,
    revealedTitleLetters: "Letras Reveladas do Título",
    releaseYear: "Ano de Lançamento",
    officialTheatrical: "Estreia oficial nos cinemas",
    mainCast: "Elenco Principal",
    castNotAvailable: "Informação não disponível",
    director: "Direção",
    directorGeneral: "· Diretor(a) Geral",
    officialSynopsis: "Sinopse Oficial",
    revealed: "Revelado",
    unlocksOnAttempt: (n: number) => `Desbloqueia no ${n}º palpite`,
    openTake: "Bater Claquete (Abrir)",
    closeTake: "Fechar Claquete",
    takeReady: "Disponível para Bater",
    clickToRevealSynopsis: "Clique para revelar a sinopse",
    clickToHide: "Clique para ocultar",
    clickToReveal: "Clique para revelar",
    clickToCloseTake: "Clique para fechar take",
    script: "Roteiro",

    // Ads & Bonus
    adSponsored: "AD · Espaço Publicitário",
    adPublicidade: "AD · Publicidade",
    adSpace: "Espaço de Anúncio",
    bonusClue: "Dica bônus",
    watchAdToReveal: "Assistir Anúncio Patrocinado para Revelar Letra",
    vipRevealLetter: "Revelar uma letra do título (VIP)",
    removeAdsWithVip: "Remover anúncios com VIP",
    sponsoredAd: "Anúncio Patrocinado",
    adRewardDesc: "Ao término deste anúncio, sua letra bônus será liberada automaticamente.",
    waitSecondsToClaim: (s: number) => `Aguarde ${s}s para resgatar…`,
    claimBonusClue: "Resgatar dica bônus",

    // Result Modal
    wonTitle: "Acertou!",
    lostTitle: "Fim da sessão",
    youGuessed: "Você acertou",
    theMovieWas: "O filme era",
    share: "Compartilhar",
    copied: "Copiado!",
    playAnother: "Jogar Outro",
    nextPosterIn: "Próximo cartaz em",

    // Stats
    gamesPlayed: "Jogos",
    winRate: "% Vitórias",
    streak: "Sequência",
    bestStreak: "Recorde",

    // Help Modal
    helpTitle: "Como jogar",
    helpDesc: "Descubra o filme do dia em até 5 palpites. A cada palpite incorreto, o zoom se afasta revelando mais do cartaz oficial do filme e novas pistas são desbloqueadas.",
    steps: [
      "Frame com zoom extremo em um detalhe do cartaz.",
      "Zoom reduzido — visão ampliada do detalhe.",
      "Plano médio do cartaz + ano de lançamento.",
      "Quase todo o cartaz + 3 atores principais.",
      "Cartaz quase completo + Diretor e sinopse. Última chance!",
    ],
    legendCorrect: "Acertou",
    legendClose: "Ano próximo (+-3 anos)",
    legendWrong: "Errou",
    startBtn: "Começar",

    // Premium Modal
    vipRoom: "Sala VIP",
    premiumScene: "Cena Premium",
    demoModeNotice: "Modo demonstração: Premium liberado porque o Supabase não está configurado.",
    archiveTitle: "Modo Arquivo",
    archiveDesc: "Jogue qualquer cena do passado.",
    playBtn: "Jogar",
    infiniteTitle: "Modo Infinito",
    infiniteDesc: "Filmes aleatórios sem limite de tentativas diárias.",
    startMarathon: "Começar maratona",
    benefitArchive: "Modo Arquivo — todas as cenas anteriores",
    benefitInfinite: "Modo Infinito — jogue sem parar",
    benefitNoAds: "Sem anúncios nas dicas extras",
    perMonth: "/mês",
    signInWithGoogle: "Entrar com Google para assinar",
    subscribeCard: "Assinar com cartão",
    payPix: "Pagar com Pix",

    // Footer
    footerRights: "Dados e imagens locais. Todos os direitos reservados.",
  },

  en: {
    // Header
    brandSubtitle: "Cinema Daily",
    howToPlay: "How to Play",
    stats: "Statistics",
    becomeVip: "GET VIP",
    vipArea: "VIP AREA",
    signIn: "Sign In",
    signOut: "Sign Out",
    switchLang: "Switch to Portuguese",

    // Session Status
    infinite: "Infinite",
    archive: "Archive",
    daily: "Daily",
    infinitePoster: "Infinite Poster",
    dailyPoster: (n: number) => `Daily Poster #${n}`,
    attempts: "Attempts",
    loading: "Loading…",
    tryAgain: "Try again",

    // Prompt
    guessQuestion: "Which movie is this poster from?",
    guessSubtitle: "The zoom pulls back to reveal more details after each incorrect guess.",

    // Guess Input
    inputPlaceholder: "Which movie? Type to search…",
    gameOver: "Game over",
    skip: "Skip",
    skipTitle: "Skip (counts as a guess and reveals more)",
    noMovieFound: "No movies found.",
    correctBanner: "You got it!",
    eraBanner: "It was…",
    resultBtn: "Result",

    // Feedback & Toasts
    closeHint: "Close! The release year is within 3 years.",
    wrongHint: "Not this one… the poster zoomed out!",
    connectionError: "Connection failed. Please try again.",
    letterRevealed: "Letter revealed!",

    // Accordion / Clues
    dossierTitle: "Film Dossier · Clues",
    allRevealed: "All unlocked",
    cluesAvailable: (u: number, t: number) => `${u} of ${t} unlocked`,
    revealedTitleLetters: "Revealed Title Letters",
    releaseYear: "Release Year",
    officialTheatrical: "Official theatrical release",
    mainCast: "Main Cast",
    castNotAvailable: "Information not available",
    director: "Director",
    directorGeneral: "· Film Director",
    officialSynopsis: "Official Synopsis",
    revealed: "Unlocked",
    unlocksOnAttempt: (n: number) => `Unlocks on guess ${n}`,
    openTake: "Clap Slate (Reveal)",
    closeTake: "Close Slate",
    takeReady: "Ready to Clap",
    clickToRevealSynopsis: "Click to reveal synopsis",
    clickToHide: "Click to hide",
    clickToReveal: "Click to reveal",
    clickToCloseTake: "Click to close take",
    script: "Screenplay",

    // Ads & Bonus
    adSponsored: "AD · Sponsored Space",
    adPublicidade: "AD · Advertising",
    adSpace: "Ad Space",
    bonusClue: "Bonus clue",
    watchAdToReveal: "Watch Sponsored Ad to Reveal Letter",
    vipRevealLetter: "Reveal a title letter (VIP)",
    removeAdsWithVip: "Remove ads with VIP",
    sponsoredAd: "Sponsored Ad",
    adRewardDesc: "When this ad finishes, your bonus letter will be unlocked automatically.",
    waitSecondsToClaim: (s: number) => `Wait ${s}s to claim…`,
    claimBonusClue: "Claim bonus clue",

    // Result Modal
    wonTitle: "You won!",
    lostTitle: "Session over",
    youGuessed: "You guessed correctly",
    theMovieWas: "The movie was",
    share: "Share",
    copied: "Copied!",
    playAnother: "Play Another",
    nextPosterIn: "Next poster in",

    // Stats
    gamesPlayed: "Played",
    winRate: "Win %",
    streak: "Streak",
    bestStreak: "Best Streak",

    // Help Modal
    helpTitle: "How to Play",
    helpDesc: "Guess the movie of the day in up to 5 attempts. With each incorrect guess, the zoom pulls back revealing more of the official movie poster, and new clues are unlocked.",
    steps: [
      "Extreme zoom frame focused on a poster detail.",
      "Reduced zoom — wider view of the detail.",
      "Medium poster framing + release year unlocked.",
      "Nearly full poster + 3 lead actors unlocked.",
      "Almost complete poster + Director and synopsis. Last chance!",
    ],
    legendCorrect: "Correct",
    legendClose: "Close year (+-3 years)",
    legendWrong: "Wrong",
    startBtn: "Start",

    // Premium Modal
    vipRoom: "VIP Lounge",
    premiumScene: "Premium Scene",
    demoModeNotice: "Demo mode: Premium unlocked because Supabase is not configured.",
    archiveTitle: "Archive Mode",
    archiveDesc: "Play any past movie poster.",
    playBtn: "Play",
    infiniteTitle: "Infinite Mode",
    infiniteDesc: "Random movies with unlimited daily attempts.",
    startMarathon: "Start marathon",
    benefitArchive: "Archive Mode — all past posters",
    benefitInfinite: "Infinite Mode — play non-stop",
    benefitNoAds: "No ads on bonus clues",
    perMonth: "/month",
    signInWithGoogle: "Sign in with Google to subscribe",
    subscribeCard: "Subscribe with card",
    payPix: "Pay with Pix",

    // Footer
    footerRights: "Local data & images. All rights reserved.",
  },
};
