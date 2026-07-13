/* Service Worker do APR Campo NR12.
   Função ÚNICA e exclusiva: decidir qual versão do código do app (o arquivo
   index.html) é entregue ao abrir/recarregar a página — nada além disso.

   MUITO IMPORTANTE: este arquivo NUNCA lê, grava, apaga ou de qualquer forma
   acessa o IndexedDB (onde ficam os projetos/áreas/máquinas/riscos) nem o
   localStorage (onde fica a sessão do OneDrive). Esses dados moram num
   "armazém" completamente separado do que este arquivo controla — o
   Cache Storage, que guarda só uma cópia do código do app, não dos dados
   preenchidos em campo. Trocar/atualizar essa cópia de código, por mais
   vezes que aconteça, nunca apaga nem altera nada que o usuário já cadastrou.

   Estratégia: "rede primeiro, cache como reserva".
   - Com internet: busca sempre a versão mais nova publicada no GitHub e
     guarda uma cópia fresca no Cache Storage.
   - Sem internet: usa essa última cópia guardada, para o app continuar
     abrindo normalmente offline, sem travar nem dar tela em branco.
*/
const CACHE_NAME = "apr-campo-shell-v1";

self.addEventListener("install", () => {
  // Ativa esta versão do Service Worker imediatamente, sem esperar todas as
  // abas abertas fecharem primeiro.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Remove cópias de código de versões antigas deste Service Worker (se
    // algum dia o nome do cache mudar), para não acumular lixo com o tempo.
    // Isto só apaga cópias de CÓDIGO guardadas por este próprio arquivo —
    // nunca IndexedDB, nunca localStorage.
    const nomesExistentes = await caches.keys();
    await Promise.all(
      nomesExistentes.filter(nome => nome !== CACHE_NAME).map(nome => caches.delete(nome))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  // Só entra em ação para a navegação principal (abrir o app ou recarregar a
  // página) — chamadas feitas pelo próprio app (Microsoft Graph, login da
  // Microsoft, etc.) passam direto, sem nenhuma interferência deste arquivo.
  if(event.request.mode !== "navigate") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try{
      // "no-store" força ignorar qualquer cache HTTP no meio do caminho e
      // buscar a versão realmente publicada agora no GitHub.
      const respostaDaRede = await fetch(event.request, { cache: "no-store" });
      cache.put(event.request, respostaDaRede.clone());
      return respostaDaRede;
    }catch(erro){
      // Sem internet (ou falha pontual de rede) — usa a última cópia do
      // código que já estava guardada, para o app abrir offline mesmo assim.
      const respostaGuardada = await cache.match(event.request);
      if(respostaGuardada) return respostaGuardada;
      throw erro;
    }
  })());
});
