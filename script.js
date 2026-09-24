(() => {
  "use strict";

  const TEMPO_MS = 15_000;
  const FAIXA_GATILHO = "-35% 0px -35% 0px";
  const ACAO_PADRAO = "levantar";

  const RODADAS_PERICIA_FINAL = 6;
  const FRACAO_ARCO = 0.2;
  const PAUSA_ENTRE_RODADAS_MS = 700;
  const PAUSA_ANTES_DO_FINAL_MS = 900;

  const quadroArmario = document.getElementById("quadro-armario");
  const contador = document.getElementById("contador");
  const gaveta = document.getElementById("gaveta");
  const cronometroWrapper = document.querySelector(".cronometro-wrapper");
  const somAlarme = document.getElementById("som-alarme");
  const capa = document.querySelector(".capa");
  const botaoComecar = document.querySelector(".comecar");
  const audiosPagina = new Map();
  const sonsBotao = new Map();
  let escolhido = null;
  let idFrame = null;
  let fimDoTempo = 0;
  let observerArmario = null;

  /* Animações de scroll (fade-in das .linha) */

  const observerScroll = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visivel");
      });
    },
    { threshold: 0.1 },
  );

  function prepararAnimacoesScroll() {
    document.querySelectorAll(".linha").forEach((linha) => {
      linha.classList.add("animar-scroll");
      observerScroll.observe(linha);
    });
  }

  function reiniciarAnimacoesScroll() {
    document.querySelectorAll(".animar-scroll").forEach((el) => {
      el.classList.remove("visivel");
      observerScroll.unobserve(el);
      observerScroll.observe(el);
    });
  }

  /* Som da página */

  const observerAudio = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        const audio = audiosPagina.get(e.target);
        if (!audio) return;

        if (e.isIntersecting) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      });
    },
    { rootMargin: FAIXA_GATILHO },
  );

  document.querySelectorAll("[data-audio]").forEach((el) => {
    const audio = new Audio(el.dataset.audio);
    audio.preload = "none";
    audio.loop = el.hasAttribute("data-audio-loop");
    audio.volume = Number(el.dataset.audioVolume ?? 1);

    audiosPagina.set(el, audio);
    observerAudio.observe(el);
  });

  function pararAudiosPagina() {
    audiosPagina.forEach((audio) => audio.pause());
  }

  /* Sons dos botões */

  function tocarSom(src, volume = 1) {
    let audio = sonsBotao.get(src);

    if (!audio) {
      audio = new Audio(src);
      sonsBotao.set(src, audio);
    }

    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch((err) => console.warn("Som falhou:", src, err.name));
  }

  function tocarSomBotao(alvo, atributo) {
    const el = alvo.closest(`[${atributo}]`);
    if (!el) return;
    tocarSom(el.getAttribute(atributo), Number(el.dataset.somVolume ?? 1));
  }

  document.addEventListener("click", (e) => {
    tocarSomBotao(e.target, "data-som-clique");
  });

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const el = e.target.closest("[data-som-hover]");
    if (!el || el.contains(e.relatedTarget)) return;
    tocarSomBotao(el, "data-som-hover");
  });

  /* Cronômetro */

  function tocarAlarme() {
    if (!somAlarme) return;
    somAlarme.currentTime = 0;
    somAlarme.play().catch(() => {});
  }

  function pararAlarme() {
    if (!somAlarme) return;
    somAlarme.pause();
    somAlarme.currentTime = 0;
  }

  function iniciarCronometro() {
    pararCronometro();
    fimDoTempo = performance.now() + TEMPO_MS;
    idFrame = requestAnimationFrame(tique);
    tocarAlarme();
  }

  function pararCronometro() {
    if (idFrame !== null) cancelAnimationFrame(idFrame);
    idFrame = null;
    observerArmario?.disconnect();
    pararAudiosPagina();
    pararAlarme();
  }

  function tique() {
    const resta = Math.max(0, fimDoTempo - performance.now());

    desenharCronometro(resta);

    if (resta === 0) {
      escolherAcao(ACAO_PADRAO);
      return;
    }

    idFrame = requestAnimationFrame(tique);
  }

  function formatarTempo(ms) {
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const milisegundos = Math.floor(ms % 1000);

    const mm = String(minutos).padStart(2, "0");
    const ss = String(segundos).padStart(2, "0");
    const mmm = String(milisegundos).padStart(3, "0");

    return `${mm}:${ss}.${mmm}`;
  }

  function desenharCronometro(resta) {
    contador.textContent = formatarTempo(resta);
  }

  function armarCronometro() {
    observerArmario?.disconnect();

    let primeiraChamada = true;

    observerArmario = new IntersectionObserver(
      (entradas) => {
        const intersectando = entradas[0].isIntersecting;
        if (primeiraChamada) {
          primeiraChamada = false;
          if (intersectando) return;
        }

        if (!intersectando || escolhido) return;
        observerArmario.disconnect();
        iniciarCronometro();
      },
      { rootMargin: FAIXA_GATILHO },
    );

    observerArmario.observe(quadroArmario);
  }

  /* Escolha e rotas */

  function revelarRota(id) {
    const rota = document.getElementById(id);

    if (!rota) {
      console.warn(`Rota ausente: ${id}`);
      return;
    }

    rota.hidden = false;
    requestAnimationFrame(() => rota.scrollIntoView({ block: "start" }));

    travasCelular
      .filter((trava) => trava.rota === rota)
      .forEach((trava) => trava.reiniciar());

    requestAnimationFrame(() => rota.scrollIntoView({ block: "start" }));
  }

  function escolherAcao(acao) {
    if (escolhido) return;

    escolhido = acao;
    pararCronometro();
    quadroArmario.classList.add("resolvida");
    cronometroWrapper.classList.add("escondido");

    revelarRota(`rota-${acao}`);
  }

  gaveta.addEventListener("click", (e) => {
    const item = e.target.closest(".acao-item");
    if (!item) return;

    escolherAcao(item.dataset.acao);
  });

  document.querySelectorAll(".reiniciar").forEach((botao) => {
    botao.addEventListener("click", resetarTudo);
  });

  /* Capa */

  botaoComecar?.addEventListener("click", (e) => {
    e.preventDefault();
    document.body.classList.remove("na-capa");
    capa.classList.add("escondido");
    scrollTo({ top: 0, behavior: "auto" });
  });

  function resetarTudo() {
    document.querySelectorAll(".rota").forEach((rota) => {
      rota.hidden = true;
    });

    escolhido = null;

    quadroArmario.classList.remove("resolvida");
    cronometroWrapper.classList.remove("escondido");

    pararCronometro();
    desenharCronometro(TEMPO_MS);
    reiniciarAnimacoesScroll();

    sequenciasPericia.forEach((sequencia) => sequencia.reiniciar());
    travasCelular.forEach((trava) => trava.reiniciar());

    capa.classList.remove("escondido");
    document.body.classList.add("na-capa");

    scrollTo({ top: 0, behavior: "auto" });
    armarCronometro();
  }

  /* Skillcheck */

  function criarAnelPericia(
    painel,
    { fracaoArco, duracaoVoltaMs = 1600, aoResolver },
  ) {
    const CENTRO = 60;
    const RAIO = 50;
    const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
    const GRAUS_ARCO = fracaoArco * 360;

    const anelWrapper = painel.querySelector(".anel-pericia");
    const zona = painel.querySelector(".anel-zona");
    const ponteiro = painel.querySelector(".anel-ponteiro");
    const botao = painel.querySelector(".botao-pericia");
    const resultado = painel.querySelector(".resultado");
    const textoInicial = botao.textContent;

    let rodando = false;
    let idAnimacao = null;
    let inicioGiro = 0;
    let anguloAtual = 0;
    let inicioZonaGraus = 0;

    zona.setAttribute(
      "stroke-dasharray",
      `${(GRAUS_ARCO / 360) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`,
    );

    function sortearZona() {
      inicioZonaGraus = Math.random() * 360;
      zona.setAttribute(
        "transform",
        `rotate(${inicioZonaGraus} ${CENTRO} ${CENTRO})`,
      );
    }

    function dentroDaZona(angulo) {
      const fim = inicioZonaGraus + GRAUS_ARCO;

      if (fim <= 360) {
        return angulo >= inicioZonaGraus && angulo <= fim;
      }

      return angulo >= inicioZonaGraus || angulo <= fim - 360;
    }

    function passo(agora) {
      const decorrido = (agora - inicioGiro) % duracaoVoltaMs;
      anguloAtual = (decorrido / duracaoVoltaMs) * 360;

      ponteiro.setAttribute(
        "transform",
        `rotate(${anguloAtual} ${CENTRO} ${CENTRO})`,
      );

      if (rodando) idAnimacao = requestAnimationFrame(passo);
    }

    function iniciarGiro() {
      anelWrapper.classList.remove("escondido");
      botao.textContent = "Parar";

      sortearZona();

      rodando = true;
      inicioGiro = performance.now();
      idAnimacao = requestAnimationFrame(passo);
    }

    function encerrarGiro() {
      if (!rodando) return;

      rodando = false;
      cancelAnimationFrame(idAnimacao);
      idAnimacao = null;
    }

    function pararEAvaliar() {
      const sucesso = dentroDaZona(anguloAtual);

      encerrarGiro();

      tocarSom(sucesso ? "audio/sucess.mp3" : "audio/fail.mp3", 0.4);

      resultado.textContent = sucesso ? "Sucesso!" : "Falhou!";
      painel.classList.toggle("sucesso", sucesso);
      painel.classList.toggle("falha", !sucesso);
      painel.classList.add("resolvido");

      aoResolver?.(sucesso);
    }

    botao.addEventListener("click", () => {
      if (painel.classList.contains("resolvido") || botao.disabled) return;

      if (rodando) {
        pararEAvaliar();
      } else {
        iniciarGiro();
      }
    });

    function reiniciar(textoBotao = textoInicial) {
      encerrarGiro();

      anelWrapper.classList.add("escondido");
      botao.textContent = textoBotao;
      resultado.textContent = "";
      painel.classList.remove("sucesso", "falha", "resolvido");

      zona.removeAttribute("transform");
      ponteiro.removeAttribute("transform");
    }

    return { reiniciar, botao };
  }

  function criarSequenciaPericia(container) {
    const painel = container.querySelector(".quadro-pericia");
    const rota = container.closest(".rota");

    let rodada = 1;

    function esconderFinais() {
      rota
        ?.querySelectorAll(".final-pericia")
        .forEach((secao) => secao.classList.add("escondido"));
    }

    function concluir(final) {
      container.classList.add("escondido");
      rota?.classList.remove("testando-pericia");

      const secaoFinal = rota?.querySelector(
        `.final-pericia[data-final="${final}"]`,
      );
      if (!secaoFinal) return;

      secaoFinal.classList.remove("escondido");
      requestAnimationFrame(() =>
        secaoFinal.scrollIntoView({ block: "start" }),
      );
    }

    const anel = criarAnelPericia(painel, {
      fracaoArco: FRACAO_ARCO,
      aoResolver: (sucesso) => {
        if (!sucesso) {
          setTimeout(() => concluir("ruim"), PAUSA_ANTES_DO_FINAL_MS);
          return;
        }

        if (rodada >= RODADAS_PERICIA_FINAL) {
          setTimeout(() => concluir("bom"), PAUSA_ANTES_DO_FINAL_MS);
          return;
        }

        rodada++;

        anel.botao.disabled = true;
        setTimeout(() => {
          anel.reiniciar("Próxima tentativa");
          anel.botao.disabled = false;
        }, PAUSA_ENTRE_RODADAS_MS);
      },
    });

    anel.botao.addEventListener("click", () =>
      painel.classList.add("em-teste"),
    );

    function reiniciar() {
      painel.classList.remove("em-teste");
      rodada = 1;

      rota?.classList.add("testando-pericia");
      anel.reiniciar();
      anel.botao.disabled = false;
      container.classList.remove("escondido");
      esconderFinais();
    }

    reiniciar();

    return { reiniciar };
  }

  const sequenciasPericia = Array.from(
    document.querySelectorAll(".sequencia-pericia"),
  ).map(criarSequenciaPericia);

  function criarTravaCelular(quadro) {
    const rolagem = quadro.querySelector(".celular-rolagem");
    const final = quadro.querySelector(".celular-final");
    const rota = quadro.closest(".rota");
    if (!rolagem || !rota) return { reiniciar() {} };

    let bloco = quadro;
    while (bloco.parentElement && bloco.parentElement !== rota) {
      bloco = bloco.parentElement;
    }

    function seguintes() {
      const lista = [];
      let el = bloco.nextElementSibling;
      while (el) {
        lista.push(el);
        el = el.nextElementSibling;
      }
      return lista;
    }

    function chegouAoFim() {
      if (rolagem.clientHeight === 0) return false;
      return (
        rolagem.scrollTop + rolagem.clientHeight >= rolagem.scrollHeight - 2
      );
    }

    function liberar() {
      final?.classList.add("visivel-final");
      seguintes().forEach((el) => el.classList.remove("travado-celular"));
    }

    function travar() {
      rolagem.scrollTo({ top: 0, behavior: "instant" });
      final?.classList.remove("visivel-final");
      seguintes().forEach((el) => el.classList.add("travado-celular"));
    }
    rolagem.addEventListener(
      "scroll",
      () => {
        if (chegouAoFim()) liberar();
      },
      { passive: true },
    );

    travar();

    return { reiniciar: travar, rota };
  }

  const travasCelular = Array.from(
    document.querySelectorAll("[data-trava-celular]"),
  ).map(criarTravaCelular);
  /* Início */

  desenharCronometro(TEMPO_MS);
  prepararAnimacoesScroll();
  armarCronometro();
})();
