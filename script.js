(() => {
  "use strict";

  const TEMPO_MS = 15_000;
  const MS_POR_TIQUE = 100;
  const FAIXA_GATILHO = "-35% 0px -35% 0px";
  const ROUPA_PADRAO = "roupa1";

  const quadroArmario = document.getElementById("quadro-armario");
  const contador = document.getElementById("contador");
  const gaveta = document.getElementById("gaveta");

  let escolhido = null;
  let idCronometro = null;
  let fimDoTempo = 0;
  let observerArmario = null;

  let resetarPericia = () => {};

  /* Animações de scroll */

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
      if (!linha.classList.contains("animar-scroll")) {
        linha.classList.add("animar-scroll");
        observerScroll.observe(linha);
      }
    });
  }

  function reiniciarAnimacoesScroll() {
    document.querySelectorAll(".animar-scroll").forEach((el) => {
      el.classList.remove("visivel");
      observerScroll.unobserve(el);
      observerScroll.observe(el);
    });
  }

  /* Cronômetro */

  function iniciarCronometro() {
    pararCronometro();

    fimDoTempo = performance.now() + TEMPO_MS;

    tique();
    idCronometro = setInterval(tique, MS_POR_TIQUE);
  }

  function pararCronometro() {
    clearInterval(idCronometro);
    idCronometro = null;
    observerArmario?.disconnect();
  }

  function tique() {
    const resta = Math.max(0, fimDoTempo - performance.now());

    desenharCronometro(resta);

    if (resta === 0) {
      pararCronometro();
      tempoEsgotado();
    }
  }

  function desenharCronometro(resta) {
    contador.textContent = (resta / 1000).toFixed(1).replace(".", ",");
  }

  /* O cronômetro começa quando o quadro do armário entra na tela — não
     tem mais nada pra abrir, as roupas já estão lá. */

  function armarCronometro() {
    observerArmario?.disconnect();

    observerArmario = new IntersectionObserver(
      (entradas) => {
        if (!entradas[0].isIntersecting || escolhido) return;
        observerArmario.disconnect();
        iniciarCronometro();
      },
      { rootMargin: FAIXA_GATILHO },
    );

    observerArmario.observe(quadroArmario);
  }

  // Pra quando falhar no teste ele não aparecer os quadrinhos depois e da escolha de roupas
  function pularArmario() {
    if (escolhido) return;

    escolhido = "falha";
    pararCronometro();

    document
      .querySelectorAll(".pos-pericia")
      .forEach((linha) => linha.classList.add("escondido"));

    revelarRota("rota-roupa3");
  }

  /* Escolha e rotas */

  function revelarRota(id) {
    const rota = document.getElementById(id);

    if (!rota) {
      console.warn(`Rota ausente: ${id}`);
      return;
    }

    rota.classList.remove("escondido");
    prepararAnimacoesScroll();

    requestAnimationFrame(() => rota.scrollIntoView({ block: "start" }));
  }

  function escolherRoupa(idRoupa) {
    if (escolhido) return;

    escolhido = idRoupa;
    pararCronometro();
    quadroArmario.classList.add("resolvida");

    revelarRota(`rota-${idRoupa}`);
  }

  function tempoEsgotado() {
    if (escolhido) return;
    escolherRoupa(ROUPA_PADRAO);
  }

  gaveta.addEventListener("click", (e) => {
    const item = e.target.closest(".roupa-item");
    if (!item) return;

    escolherRoupa(item.dataset.roupa);
  });

  /* Reinício */

  document.querySelectorAll(".reiniciar").forEach((botao) => {
    botao.addEventListener("click", resetarTudo);
  });

  function resetarTudo() {
    document
      .querySelectorAll(".rota")
      .forEach((rota) => rota.classList.add("escondido"));

    escolhido = null;

    document
      .querySelectorAll(".pos-pericia")
      .forEach((linha) => linha.classList.remove("escondido"));

    quadroArmario.classList.remove("resolvida");

    pararCronometro();
    desenharCronometro(TEMPO_MS);
    reiniciarAnimacoesScroll();

    resetarPericia();

    scrollTo({ top: 0, behavior: "auto" });
    armarCronometro();
  }

  desenharCronometro(TEMPO_MS);
  prepararAnimacoesScroll();
  armarCronometro();

  /* Teste de perícia */

  const painelPericia = document.getElementById("teste-pericia");

  if (painelPericia) {
    const CENTRO = 60;
    const RAIO = 50;
    const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
    const FRACAO_ARCO = 0.2; // quanto do anel conta como acerto
    const GRAUS_ARCO = FRACAO_ARCO * 360;
    const DURACAO_VOLTA_MS = 1600; // tempo pra dar uma volta completa

    const anelWrapper = painelPericia.querySelector("#anel-pericia");
    const zona = painelPericia.querySelector("#zona");
    const ponteiro = painelPericia.querySelector("#ponteiro");
    const botaoPericia = painelPericia.querySelector("#botao-pericia");
    const resultadoPericia = painelPericia.querySelector("#resultado-pericia");

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

    function passoPericia(agora) {
      const decorrido = (agora - inicioGiro) % DURACAO_VOLTA_MS;
      anguloAtual = (decorrido / DURACAO_VOLTA_MS) * 360;

      ponteiro.setAttribute(
        "transform",
        `rotate(${anguloAtual} ${CENTRO} ${CENTRO})`,
      );

      if (rodando) idAnimacao = requestAnimationFrame(passoPericia);
    }

    function iniciarGiro() {
      anelWrapper.classList.remove("escondido");
      botaoPericia.textContent = "Parar!";

      sortearZona();

      rodando = true;
      inicioGiro = performance.now();
      idAnimacao = requestAnimationFrame(passoPericia);
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

      resultadoPericia.textContent = sucesso ? "Sucesso!" : "Falhou!";
      painelPericia.classList.toggle("sucesso", sucesso);
      painelPericia.classList.toggle("falha", !sucesso);
      painelPericia.classList.add("resolvido");

      if (!sucesso) pularArmario();
    }

    botaoPericia.addEventListener("click", () => {
      if (painelPericia.classList.contains("resolvido")) return;

      if (rodando) {
        pararEAvaliar();
      } else {
        iniciarGiro();
      }
    });

    function reiniciarPericia() {
      encerrarGiro();

      anelWrapper.classList.add("escondido");
      botaoPericia.textContent = "Testar perícia";
      resultadoPericia.textContent = "";
      painelPericia.classList.remove("sucesso", "falha", "resolvido");

      zona.removeAttribute("transform");
      ponteiro.removeAttribute("transform");
    }

    resetarPericia = reiniciarPericia;
  }
})();
