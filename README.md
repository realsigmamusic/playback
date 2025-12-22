<div align="center">

  <h1>Playback Pro</h1>
  
  <p>
    <strong>Um reprodutor de playback profissional, web PWA e offline,<br>focado em performance ao vivo.</strong>
  </p>

  <p>
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="#-como-usar">Como Usar</a> •
    <a href="#-estrutura-dos-arquivos">Estrutura JSON</a> •
    <a href="#-instalação">Instalação</a>
  </p>

  ![Badge PWA](https://img.shields.io/badge/PWA-Ready-purple?style=flat-square)
  ![Badge Latency](https://img.shields.io/badge/Latency-Zero-success?style=flat-square)
  ![Badge License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

</div>

---

## 📖 Sobre o Projeto

O **Playback Pro** nasceu da necessidade de igrejas e pequenos grupos que utilizam playback ou VS **(L & R)** e precisam de controle total sobre a estrutura da música ao vivo, sem depender de softwares complexos de DAW (como Ableton Live) ou operadores técnicos especializados.

O foco é a **simplicidade e segurança**: uma interface limpa, botões grandes para toque, transições sem atraso (gapless) e funcionamento 100% offline.

### 📱 Screenshots
<div align="center">
  <img src="https://via.placeholder.com/300x600?text=Tela+Player" alt="Tela do Player" width="250" />
  <img src="https://via.placeholder.com/300x600?text=Menu+Setlist" alt="Menu Setlist" width="250" />
</div>

---

## ✨ Funcionalidades

* **⚡ Zero Latency Engine:** Utiliza a *Web Audio API* com agendamento antecipado (Lookahead) para garantir que as trocas de sessão (ex: Verso -> Refrão) sejam matematicamente perfeitas, sem "buracos" no som.
* **📱 Mobile First:** Interface vertical pensada para uso com uma mão (polegar), botões grandes e feedback tátil (vibração).
* **🔄 Loop Dinâmico:** Repita qualquer sessão (Intro, Refrão) quantas vezes o momento pedir.
* **⏭️ Seamless Transitions:** Agende a próxima parte da música e o player fará a transição no tempo exato.
* **📉 Fade Out Suave:** Botão de emergência/encerramento que reduz o volume gradualmente e finaliza a música.
* **📶 100% Offline (PWA):** Pode ser instalado como aplicativo nativo no Android/iOS e funciona sem internet.
* **📂 Gestão de Arquivos Local:** Não depende de servidores. Carregue sua pasta com áudios e JSONs e toque instantaneamente.
* **📊 Barra de Progresso:** Visualização clara do tempo restante da sessão atual.

---

## 🚀 Como Usar

### 1. Preparando os Arquivos
Para cada música, você precisa de dois arquivos na mesma pasta com o **mesmo nome**:
1.  O áudio (`mp3`, `wav`, `ogg` ou `m4a`).
2.  O mapa da música (`.json`).

> Exemplo: `Música.mp3` e `Música.json`

### 2. Carregando no App
1.  Abra o **Playback Pro**.
2.  Clique no ícone de Menu (☰) no canto superior esquerdo.
3.  Clique em **CARREGAR PASTA**.
4.  Selecione a pasta onde estão suas músicas e confirme.
5.  Pronto! Sua setlist será montada automaticamente.

### 3. Durante o Culto/Show
* **Play/Pause:** Inicia ou pausa a música.
* **Loop:** Se ativado, a sessão atual (ex: REFRÃO) ficará repetindo até você desativar ou selecionar outra.
* **Botões de Sessão:**
    * *Verde:* Tocando agora.
    * *Amarelo Piscando:* Próxima sessão agendada (vai entrar assim que a atual acabar).
* **Fade Out (Ícone de Gráfico):** Abaixa o volume em 3 segundos e para o áudio (útil para finais de oração).
* **Stop (Ícone Quadrado):** Corte seco imediato.

---

## 📝 Estrutura dos Arquivos (.json)

Para que o player entenda onde começa o refrão ou o verso, você deve criar um arquivo JSON seguindo este modelo estrito:

```json
{
  "title": "Nome da Música",
  "artist": "Nome do Artista",
  "bpm": 70,
  "key": "G",
  "sections": [
    {
      "label": "Intro",
      "time": 0.00
    },
    {
      "label": "Verso",
      "time": 14.503
    },
    {
      "label": "Refrão",
      "time": 45.250
    },
    {
      "label": "Ponte",
      "time": 120.973
    },
    {
      "label": "Final",
      "time": 180.278
    }
  ]
}
```