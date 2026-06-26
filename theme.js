// ================= TEMA (Aero / Noturno) E COR DE DESTAQUE =================
// Isso fica salvo no navegador (não depende do Firebase) — é só preferência visual.

function aplicarTemaInicial() {
    const temaSalvo = localStorage.getItem('temaApp') || 'light';
    const corSalva = localStorage.getItem('accentApp');

    document.documentElement.setAttribute('data-theme', temaSalvo);
    atualizarIconeTema(temaSalvo);

    if (corSalva) {
        document.documentElement.style.setProperty('--accent', corSalva);
        document.documentElement.style.setProperty('--accent-2', ajustarCor(corSalva, -25));
        const picker = document.getElementById('accentColorPicker');
        if (picker) picker.value = corSalva;
    }
}

function alternarTema() {
    const atual = document.documentElement.getAttribute('data-theme');
    const novo = atual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', novo);
    localStorage.setItem('temaApp', novo);
    atualizarIconeTema(novo);
}

function atualizarIconeTema(tema) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerText = tema === 'dark' ? '☀️' : '🌙';
}

function mudarCorDestaque(corHex) {
    document.documentElement.style.setProperty('--accent', corHex);
    document.documentElement.style.setProperty('--accent-2', ajustarCor(corHex, -25));
    localStorage.setItem('accentApp', corHex);
}

// Gera uma segunda cor (mais escura/clara) a partir da cor escolhida, pro gradiente
function ajustarCor(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00FF) + percent;
    let b = (num & 0x0000FF) + percent;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

document.addEventListener('DOMContentLoaded', aplicarTemaInicial);
