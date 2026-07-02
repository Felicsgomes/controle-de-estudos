let studyData = [];
let studyHistory = [];
let studyLog = [];
let profilePhoto = '';
let currentCalendarDate = new Date();
let topicStatusSelected = null; 
let docRef = null; 
let currentChartDays = 7; 
let timerInterval = null;
let timerSeconds = 0;
let timerStartTime = 0;
let timerAccumulated = 0;

// ================= GESTÃO DE TEMA E CORES =================
function aplicarTemaInicial() {
    const temaSalvo = localStorage.getItem('temaApp') || 'light';
    document.documentElement.setAttribute('data-theme', temaSalvo);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerText = temaSalvo === 'dark' ? '☀️' : '🌙';

    carregarVariavel('--accent', 'colorAccent', 'colorAccent');
    carregarVariavel('--bg-color', 'colorBg', 'colorBg');
    carregarVariavel('--card-bg', 'colorCard', 'colorCard');
    carregarVariavel('--text-main', 'colorText', 'colorText');
    carregarVariavel('--btn-primary-bg', 'colorBtnBg', 'colorBtnBg');
    carregarVariavel('--btn-primary-text', 'colorBtnText', 'colorBtnText');
    carregarVariavel('--success', 'colorSuccess', 'colorSuccess');
    carregarVariavel('--warning', 'colorWarning', 'colorWarning');
    carregarVariavel('--danger', 'colorDanger', 'colorDanger');
    
    carregarVariavelRange('--base-font-size', 'fontSizeSlider', 'fontSizeSlider', 'px', 'fontSizeVal');
    
    const radius = localStorage.getItem('borderRadiusSlider');
    if (radius) {
        document.documentElement.style.setProperty('--radius-lg', radius + 'px');
        document.documentElement.style.setProperty('--radius-md', Math.max(0, radius - 6) + 'px');
        const slider = document.getElementById('borderRadiusSlider');
        if(slider) slider.value = radius;
        const valLabel = document.getElementById('radiusVal');
        if(valLabel) valLabel.innerText = radius + 'px';
    }
}

function alternarTema() {
    const atual = document.documentElement.getAttribute('data-theme');
    const novo = atual === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', novo);
    localStorage.setItem('temaApp', novo);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerText = novo === 'dark' ? '☀️' : '🌙';
}

function mudarVariavel(cssVar, valor, chaveStorage, sufixo = '') {
    const finalValue = valor + sufixo;
    document.documentElement.style.setProperty(cssVar, finalValue);
    localStorage.setItem(chaveStorage, valor);
}

function carregarVariavel(cssVar, storageKey, inputId) {
    const val = localStorage.getItem(storageKey);
    if (val) {
        document.documentElement.style.setProperty(cssVar, val);
        const input = document.getElementById(inputId);
        if (input) input.value = val;
    }
}

function carregarVariavelRange(cssVar, storageKey, inputId, sufixo, labelId) {
    const val = localStorage.getItem(storageKey);
    if (val) {
        document.documentElement.style.setProperty(cssVar, val + sufixo);
        const input = document.getElementById(inputId);
        if (input) input.value = val;
        const label = document.getElementById(labelId);
        if (label) label.innerText = val + sufixo;
    }
}

function resetarPersonalizacao() {
    if (!confirm("Isso apagará TODAS as cores, fontes e bordas personalizadas. Tem certeza?")) return;
    const chaves = ['colorAccent', 'colorBg', 'colorCard', 'colorText', 'colorBtnBg', 'colorBtnText', 'colorSuccess', 'colorWarning', 'colorDanger', 'fontSizeSlider', 'borderRadiusSlider'];
    chaves.forEach(k => localStorage.removeItem(k));
    document.documentElement.style = '';
    window.location.reload();
}

aplicarTemaInicial();

// ================= FIREBASE E DADOS =================
auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    docRef = db.collection('app').doc(user.uid);
    await loadData();
    updateUI();
});

function logout() { auth.signOut().then(() => { window.location.href = 'login.html'; }); }

function fixOldData() {
    studyData.forEach(subject => {
        subject.hours = parseFloat(subject.hours) || 0;
        if (subject.topics) {
            subject.topics = subject.topics.map(t => {
                if (typeof t === 'string') {
                    return { id: Date.now().toString() + Math.random().toString(36).substring(2, 5), name: t, completed: false, qTotal: 0, qCorrect: 0, lastProgress: '', revisions: [] };
                }
                t.qTotal = parseInt(t.qTotal) || 0;
                t.qCorrect = parseInt(t.qCorrect) || 0;
                if (typeof t.lastProgress !== 'string') t.lastProgress = '';
                if (!Array.isArray(t.revisions)) t.revisions = []; 
                return t;
            });
        } else { subject.topics = []; }
    });
}

async function loadData() {
    try {
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            studyData = data.studyData || [];
            studyHistory = data.studyHistory || [];
            studyLog = data.studyLog || [];
            profilePhoto = data.profilePhoto || '';
            if (profilePhoto) {
                document.getElementById('profilePhotoImg').src = profilePhoto;
                document.getElementById('profilePhotoImg').style.display = 'block';
            }
            fixOldData();
        } else {
            studyData = []; studyHistory = []; studyLog = [];
        }
    } catch (error) { console.error("Erro ao carregar:", error); }
}

async function saveData() {
    try { await docRef.set({ studyData, studyHistory, studyLog, profilePhoto }); } 
    catch (error) { console.error("Erro ao salvar:", error); }
    updateUI();
}

// ================= CRONÔMETRO =================
function updateTimerTopicSelect() {
    const sId = document.getElementById('timerSubject').value;
    const select = document.getElementById('timerTopic');
    select.innerHTML = '<option value="">-- Escolha o assunto --</option>';
    if(!sId) return;
    const subject = studyData.find(s => s.id === sId);
    if(subject) {
        select.innerHTML += `<option value="geral">Geral (Sem tópico específico)</option>`;
        subject.topics.forEach(t => {
            if(!t.id.startsWith('geral_')) select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
    }
}

function formatTime(sec) {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startTimer() {
    const sId = document.getElementById('timerSubject').value;
    if(!sId) return alert("Selecione a matéria antes de iniciar o cronômetro.");
    
    document.getElementById('btnStartTimer').style.display = 'none';
    document.getElementById('btnPauseTimer').style.display = 'inline-block';
    document.getElementById('btnStopTimer').style.display = 'inline-block';
    document.getElementById('timerSubject').disabled = true;
    document.getElementById('timerTopic').disabled = true;

    timerStartTime = Date.now();

    timerInterval = setInterval(() => {
        const now = Date.now();
        const diffSeconds = Math.floor((now - timerStartTime) / 1000);
        timerSeconds = timerAccumulated + diffSeconds;
        
        document.getElementById('timerDisplay').innerText = formatTime(timerSeconds);
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerAccumulated = timerSeconds;
    document.getElementById('btnStartTimer').style.display = 'inline-block';
    document.getElementById('btnStartTimer').innerText = '▶ Retomar';
    document.getElementById('btnPauseTimer').style.display = 'none';
}

function stopAndSaveTimer() {
    clearInterval(timerInterval);
    const hoursStudied = timerSeconds / 3600;
    
    if (hoursStudied < 0.01) { 
        if(!confirm("O tempo estudado é muito curto. Deseja salvar mesmo assim?")) {
            resetTimerUI();
            return;
        }
    }

    const sId = document.getElementById('timerSubject').value;
    const tId = document.getElementById('timerTopic').value || 'geral';
    const d = new Date();
    const dateInput = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const subject = studyData.find(s => s.id === sId);
    if (subject) {
        subject.hours = (parseFloat(subject.hours) || 0) + hoursStudied;
        
        if (tId === "geral") {
            let geralTopic = subject.topics.find(t => t.id === `geral_${subject.id}`);
            if (!geralTopic) {
                geralTopic = { id: `geral_${subject.id}`, name: "Questões Gerais", completed: false, qTotal: 0, qCorrect: 0, lastProgress: '', revisions: [] };
                subject.topics.push(geralTopic);
            }
        }

        let dayRecord = studyHistory.find(h => h.date === dateInput);
        if (dayRecord) dayRecord.hours += hoursStudied;
        else studyHistory.push({ date: dateInput, hours: hoursStudied });

        studyLog.push({
            id: Date.now().toString(),
            date: dateInput, subjectId: sId, topicId: tId,
            hours: parseFloat(hoursStudied.toFixed(2)), status: null, progressStr: "Tempo via Cronômetro"
        });
        
        saveData();
        alert(`✅ Tempo de ${formatTime(timerSeconds)} (${hoursStudied.toFixed(2)}h) salvo com sucesso!`);
    }
    resetTimerUI();
}

function resetTimerUI() {
    timerSeconds = 0;
    timerAccumulated = 0;
    timerStartTime = 0;
    document.getElementById('timerDisplay').innerText = "00:00:00";
    document.getElementById('btnStartTimer').style.display = 'inline-block';
    document.getElementById('btnStartTimer').innerText = '▶ Iniciar';
    document.getElementById('btnPauseTimer').style.display = 'none';
    document.getElementById('btnStopTimer').style.display = 'none';
    document.getElementById('timerSubject').disabled = false;
    document.getElementById('timerTopic').disabled = false;
}

// ================= PLANILHA DE REVISÕES =================
function addRevisionColumn(subjectId) {
    const subject = studyData.find(s => s.id === subjectId);
    if (subject) {
        subject.topics.forEach(t => {
            if (!t.revisions) t.revisions = [];
            // Agora adiciona apenas acertos na revisão
            t.revisions.push({ qCorrect: 0 });
        });
        saveData();
    }
}

function removeRevisionColumn(subjectId) {
    const subject = studyData.find(s => s.id === subjectId);
    if (!subject) return;
    
    let maxRev = 0;
    subject.topics.forEach(t => { if(t.revisions && t.revisions.length > maxRev) maxRev = t.revisions.length; });
    
    if (maxRev === 0) return alert("Não há colunas para remover.");
    
    if (confirm(`Atenção: Você vai APAGAR a coluna R${maxRev} inteira. Continuar?`)) {
        subject.topics.forEach(t => {
            if(t.revisions && t.revisions.length === maxRev) t.revisions.pop(); 
        });
        saveData();
    }
}

function updateProgresso(subjectId, topicId, revIndex, field, value) {
    const subject = studyData.find(s => s.id === subjectId);
    if (!subject) return;
    const topic = subject.topics.find(t => t.id === topicId);
    if (!topic) return;

    let val = Math.max(0, parseInt(value) || 0);

    if (revIndex === -1) {
        topic[field] = val;
    } else {
        if (!topic.revisions) topic.revisions = [];
        if (!topic.revisions[revIndex]) topic.revisions[revIndex] = { qCorrect: 0 };
        topic.revisions[revIndex][field] = val;
    }

    // Regras de validação (somente para Fase 1, já que revisões não tem mais qTotal individual)
    if (field === 'qTotal') {
        if (revIndex === -1 && topic.qCorrect > topic.qTotal) topic.qCorrect = topic.qTotal;
    }
    if (field === 'qCorrect') {
        if (revIndex === -1 && topic.qCorrect > topic.qTotal) topic.qTotal = topic.qCorrect;
    }
    saveData();
}

function renderProgressoTab() {
    const container = document.getElementById('progressoContainer');
    if (!container) return;
    container.innerHTML = "";

    if(studyData.length === 0) {
        container.innerHTML = "<p style='color:var(--text-muted);'>Nenhuma matéria cadastrada.</p>";
        return;
    }

    studyData.forEach(subject => {
        let maxRev = 0;
        subject.topics.forEach(t => { if (t.revisions && t.revisions.length > maxRev) maxRev = t.revisions.length; });

        let revHeaders = "";
        for (let i = 0; i < maxRev; i++) {
            // Cabeçalho da revisão agora mostra apenas (Acertos)
            revHeaders += `<th>R${i+1} <br><small style="font-weight:normal; opacity:0.7;">(Acertos)</small></th>`;
        }

        let html = `
        <div class="subject-box" style="padding: 20px;">
            <div class="subject-header">
                <h3 style="font-size: 1.15rem; color: var(--text-main);">📘 ${subject.name}</h3>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-warn" onclick="addRevisionColumn('${subject.id}')">+ Nova Coluna (R${maxRev+1})</button>
                    ${maxRev > 0 ? `<button class="btn-del" onclick="removeRevisionColumn('${subject.id}')">- Apagar R${maxRev}</button>` : ''}
                </div>
            </div>
            <div style="overflow-x: auto; padding-bottom: 10px;">
                <table class="progresso-excel-table">
                    <thead>
                        <tr>
                            <th>Assunto</th>
                            <th colspan="3" style="background: rgba(41, 197, 255, 0.1);">Fase 1</th>
                            ${maxRev > 0 ? `<th colspan="${maxRev}" style="background: rgba(245, 158, 11, 0.1);">Revisões</th>` : ''}
                        </tr>
                        <tr>
                            <th>Tópico</th>
                            <th>Acertos</th>
                            <th>Questões (Total)</th>
                            <th>%</th>
                            ${revHeaders}
                        </tr>
                    </thead>
                    <tbody>
        `;

        let subjTotalQ = 0, subjTotalA = 0;

        subject.topics.forEach(t => {
            if (!t.revisions) t.revisions = [];
            while (t.revisions.length < maxRev) t.revisions.push({ qCorrect: 0 });

            // tTotalQ puxa exclusivamente da coluna de Questões da Fase 1 (que é onde vc vai somar)
            let tTotalQ = parseInt(t.qTotal) || 0;
            // tTotalA começa com os acertos da fase 1 e soma com as revisões
            let tTotalA = parseInt(t.qCorrect) || 0;
            
            let f1Perc = calculateAccuracy(t.qCorrect, t.qTotal);
            let f1Color = f1Perc >= 80 ? 'var(--success)' : f1Perc >= 60 ? 'var(--warning)' : 'var(--danger)';
            
            let revCells = "";
            t.revisions.forEach((rev, idx) => {
                tTotalA += parseInt(rev.qCorrect) || 0;
                // Células da revisão agora têm apenas o input de Acertos
                revCells += `
                <td style="text-align: center;">
                    <input type="number" min="0" class="excel-input" value="${rev.qCorrect || ''}" onchange="updateProgresso('${subject.id}', '${t.id}', ${idx}, 'qCorrect', this.value)" placeholder="A">
                </td>`;
            });

            subjTotalQ += tTotalQ; subjTotalA += tTotalA;

            html += `
            <tr>
                <td>${t.name}</td>
                <td><input type="number" min="0" class="excel-input" value="${t.qCorrect || ''}" onchange="updateProgresso('${subject.id}', '${t.id}', -1, 'qCorrect', this.value)"></td>
                <td><input type="number" min="0" class="excel-input" value="${t.qTotal || ''}" onchange="updateProgresso('${subject.id}', '${t.id}', -1, 'qTotal', this.value)"></td>
                <td style="font-weight:bold; color: ${f1Color}">${f1Perc}%</td>
                ${revCells}
            </tr>`;
        });

        let globalPerc = calculateAccuracy(subjTotalA, subjTotalQ);
        let globalColor = globalPerc >= 80 ? 'var(--success)' : globalPerc >= 60 ? 'var(--warning)' : 'var(--danger)';

        html += `
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style="text-align: right;">TOTAL GERAL (F1 + Revisões):</td>
                            <td colspan="3" style="font-weight: 800; text-align: center;">${subjTotalA} Acertos de ${subjTotalQ} Questões</td>
                            <td colspan="${maxRev}" style="font-weight:900; color: ${globalColor}; text-align: left; padding-left: 15px;">${globalPerc}% Aprovação Global</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

function getTopicStats(topic) {
    // Para as estatísticas gerais do perfil e painel
    // totalQ usa apenas a Fase 1 (onde você digita o consolidado)
    let totalQ = parseInt(topic.qTotal) || 0;
    // totalC soma a Fase 1 com todos os acertos avulsos das revisões
    let totalC = parseInt(topic.qCorrect) || 0;
    
    if (topic.revisions) {
        topic.revisions.forEach(r => { totalC += (parseInt(r.qCorrect) || 0); });
    }
    return { totalQ, totalC };
}

// ================= DEMAIS FUNÇÕES DO SISTEMA =================
function handlePhotoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 300; canvas.height = 300;
                canvas.getContext('2d').drawImage(img, 0, 0, 300, 300);
                profilePhoto = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('profilePhotoImg').src = profilePhoto;
                document.getElementById('profilePhotoImg').style.display = 'block';
                saveData();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function showTab(tabId, element) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
}

function addSubject() {
    const name = document.getElementById('newSubjectName').value.trim();
    if (name === "") return alert("Digite o nome da matéria!");
    studyData.push({ id: Date.now().toString(), name: name, hours: 0, topics: [] });
    document.getElementById('newSubjectName').value = "";
    saveData();
}

function renameSubject(id) {
    const subject = studyData.find(s => s.id === id);
    if (!subject) return;
    const newName = prompt("Novo nome:", subject.name);
    if (newName && newName.trim() !== "") { subject.name = newName.trim(); saveData(); }
}

function deleteSubject(id) {
    const subject = studyData.find(s => s.id === id);
    if (!subject) return;
    if (confirm(`Deletar a matéria "${subject.name}"?`)) {
        studyData = studyData.filter(s => s.id !== id); saveData();
    }
}

function addTopic(subjectId) {
    const input = document.getElementById(`newTopic_${subjectId}`);
    const name = input.value.trim();
    if (name === "") return alert("Digite o nome do tópico!");
    const subject = studyData.find(s => s.id === subjectId);
    if (subject) {
        subject.topics.push({ id: Date.now().toString(), name: name, completed: false, qTotal: 0, qCorrect: 0, lastProgress: '', revisions: [] });
        input.value = ""; saveData();
    }
}

function renameTopic(sId, tId) {
    const subject = studyData.find(s => s.id === sId);
    const topic = subject?.topics.find(t => t.id === tId);
    if (!topic) return;
    const newName = prompt("Novo nome:", topic.name);
    if (newName && newName.trim() !== "") { topic.name = newName.trim(); saveData(); }
}

function deleteTopic(sId, tId) {
    const subject = studyData.find(s => s.id === sId);
    const topic = subject?.topics.find(t => t.id === tId);
    if (!topic) return;
    if (confirm(`Remover "${topic.name}"?`)) {
        subject.topics = subject.topics.filter(t => t.id !== tId); saveData();
    }
}

function toggleTopic(sId, tId) {
    const subject = studyData.find(s => s.id === sId);
    const topic = subject?.topics.find(t => t.id === tId);
    if (topic) { 
        topic.completed = !topic.completed; 
        if (!topic.completed && topic.lastProgress === "Finalizado") topic.lastProgress = ""; 
        else if (topic.completed) topic.lastProgress = "Finalizado";
        saveData(); 
    }
}

function updateTopicSelect() {
    const subjectId = document.getElementById('selectSubject').value;
    const topicSelect = document.getElementById('selectTopic');
    topicSelect.innerHTML = '<option value="">-- Escolha o assunto --</option>';
    if (!subjectId) return;
    const subject = studyData.find(s => s.id === subjectId);
    if (subject) {
        topicSelect.innerHTML += `<option value="geral">Geral (Sem tópico)</option>`;
        subject.topics.forEach(t => { if (!t.id.startsWith('geral_')) topicSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`; });
    }
    handleTopicChange();
}

function handleTopicChange() {
    const topicId = document.getElementById('selectTopic').value;
    const statusGroup = document.getElementById('topicStatusGroup');
    const progressGroup = document.getElementById('progressGroup');
    topicStatusSelected = null;
    document.getElementById('btnStatusSim').classList.remove('active');
    document.getElementById('btnStatusNao').classList.remove('active');
    document.getElementById('topicProgress').value = '';

    if (topicId && topicId !== 'geral') { statusGroup.style.display = 'block'; progressGroup.style.display = 'none'; } 
    else { statusGroup.style.display = 'none'; progressGroup.style.display = 'none'; }
}

function setTopicStatus(isFinished) {
    topicStatusSelected = isFinished;
    const btnSim = document.getElementById('btnStatusSim');
    const btnNao = document.getElementById('btnStatusNao');
    const progressGroup = document.getElementById('progressGroup');
    if (isFinished) { btnSim.classList.add('active'); btnNao.classList.remove('active'); progressGroup.style.display = 'none'; } 
    else { btnNao.classList.add('active'); btnSim.classList.remove('active'); progressGroup.style.display = 'block'; }
}

function registerStudy() {
    const dateInput = document.getElementById('studyDate').value;
    const subjectId = document.getElementById('selectSubject').value;
    const topicId = document.getElementById('selectTopic').value;
    const hours = parseFloat(document.getElementById('studyHours').value) || 0;
    
    if (!dateInput) return alert("Por favor, selecione uma data.");
    if (!subjectId || !topicId) return alert("Selecione a matéria e o assunto!");
    if (hours === 0 && topicStatusSelected === null) return alert("Preencha horas ou marque o status do tópico.");

    let progressStr = "";
    if (topicStatusSelected === false) progressStr = document.getElementById('topicProgress').value.trim();

    const subject = studyData.find(s => s.id === subjectId);
    if (subject) {
        subject.hours = (parseFloat(subject.hours) || 0) + hours;

        if (topicId !== "geral") {
            const topic = subject.topics.find(t => t.id === topicId);
            if (topic) {
                if (topicStatusSelected === true) { topic.completed = true; topic.lastProgress = "Finalizado"; } 
                else if (topicStatusSelected === false && progressStr) { topic.lastProgress = progressStr; }
            }
        }

        if (hours > 0) {
            let dayRecord = studyHistory.find(h => h.date === dateInput);
            if (dayRecord) dayRecord.hours += hours;
            else studyHistory.push({ date: dateInput, hours: hours });
        }

        studyLog.push({ id: Date.now().toString(), date: dateInput, subjectId: subjectId, topicId: topicId, hours: hours, status: topicStatusSelected, progressStr: progressStr });
        document.getElementById('studyHours').value = ""; handleTopicChange(); saveData();
        alert(`Registro manual salvo com sucesso!`);
    }
}

function deleteLog(logId) {
    const logIndex = studyLog.findIndex(l => l.id === logId);
    if (logIndex === -1) return;
    if (!confirm("Excluir este log diário? (As horas serão subtraídas)")) return;
    const log = studyLog[logIndex];
    const subject = studyData.find(s => s.id === log.subjectId);
    if (subject) subject.hours = Math.max(0, (parseFloat(subject.hours) || 0) - (parseFloat(log.hours) || 0));
    const dayRecord = studyHistory.find(h => h.date === log.date);
    if (dayRecord) dayRecord.hours = Math.max(0, dayRecord.hours - (parseFloat(log.hours) || 0));
    studyLog.splice(logIndex, 1);
    saveData();
}

function loadHistoryDay() {
    const dateVal = document.getElementById('editHistoryDate').value;
    if (!dateVal) return;
    const record = studyHistory.find(h => h.date === dateVal);
    document.getElementById('editHistoryHours').value = record ? record.hours : 0;
}

function saveHistoryDay() {
    const dateVal = document.getElementById('editHistoryDate').value;
    const newHours = parseFloat(document.getElementById('editHistoryHours').value);
    if (!dateVal) return alert("Selecione um dia primeiro.");
    if (isNaN(newHours) || newHours < 0) return alert("Insira um valor válido.");
    let record = studyHistory.find(h => h.date === dateVal);
    if (record) record.hours = newHours;
    else if (newHours > 0) studyHistory.push({ date: dateVal, hours: newHours });
    studyHistory = studyHistory.filter(h => h.hours > 0);
    saveData(); 
    alert(`Calendário corrigido!`);
}

function calculateAccuracy(correct, total) { if (total === 0 || isNaN(total)) return 0; return Math.round((correct / total) * 100); }
function getBadgeClass(percentage) { return percentage >= 80 ? 'badge-good' : percentage >= 60 ? 'badge-warn' : 'badge-bad'; }
function escapeHtml(str) { const div = document.createElement('div'); div.innerText = str || ''; return div.innerHTML; }
function formatDateBR(dateStr) { const [, m, d] = dateStr.split('-'); return `${d}/${m}`; }

function updateUI() {
    renderDashboard();
    renderPerfil();
    renderEdital();
    renderSelects();
    renderChart();
    renderCalendar();
    renderLogs(); 
    renderProgressoTab();
}

function renderDashboard() {
    let globalHours = studyHistory.reduce((acc, curr) => acc + (parseFloat(curr.hours) || 0), 0);
    let globalTotalQ = 0, globalCorrectQ = 0;

    studyData.forEach(subject => {
        let subjectTotalQ = 0, subjectCorrectQ = 0;
        subject.topics.forEach(t => { 
            const stats = getTopicStats(t); 
            subjectTotalQ += stats.totalQ; 
            subjectCorrectQ += stats.totalC; 
        });
        globalTotalQ += subjectTotalQ; 
        globalCorrectQ += subjectCorrectQ;
    });
    
    const hStr = (globalHours % 1 === 0) ? globalHours : globalHours.toFixed(1);
    
    const elTotalHours = document.getElementById('totalHours');
    if(elTotalHours) elTotalHours.innerText = `${hStr}h`;
    
    const elTotalQuestions = document.getElementById('totalQuestions');
    if(elTotalQuestions) elTotalQuestions.innerText = globalTotalQ;
    
    const elTotalCorrect = document.getElementById('totalCorrect');
    if(elTotalCorrect) elTotalCorrect.innerText = globalCorrectQ;
    
    const elOverallAccuracy = document.getElementById('overallAccuracy');
    if(elOverallAccuracy) elOverallAccuracy.innerText = `${calculateAccuracy(globalCorrectQ, globalTotalQ)}%`;
}

function renderPerfil() {
    const profileDiv = document.getElementById('detailedProfileStats');
    if (!profileDiv) return;
    profileDiv.innerHTML = "";

    studyData.forEach(subject => {
        let subjTotalQ = 0, subjCorrectQ = 0;
        let htmlBlock = `<div class="profile-subject-row" id="hdr_${subject.id}"></div>`; 
        subject.topics.forEach(topic => {
            const stats = getTopicStats(topic);
            subjTotalQ += stats.totalQ; subjCorrectQ += stats.totalC;
            if (stats.totalQ > 0 || topic.id.startsWith('geral_')) {
                let topicAcc = calculateAccuracy(stats.totalC, stats.totalQ);
                htmlBlock += `<div class="profile-topic-row"><span>↳ ${topic.name}</span><span>${stats.totalQ} qts | ${stats.totalC} certas | <span style="font-weight:bold; color: ${topicAcc >= 80 ? 'var(--success)' : topicAcc >= 60 ? 'var(--warning)' : 'var(--danger)'}">${topicAcc}%</span></span></div>`;
            }
        });
        let subjAcc = calculateAccuracy(subjCorrectQ, subjTotalQ);
        profileDiv.innerHTML += htmlBlock;
        const hdr = document.getElementById(`hdr_${subject.id}`);
        if(hdr) hdr.innerHTML = `<span>📘 ${subject.name}</span><span>${subjTotalQ} Questões Totais | <span class="badge ${getBadgeClass(subjAcc)}">${subjAcc}% Acertos</span></span>`;
    });
}

function renderLogs() {
    const html = studyLog.sort((a,b) => b.date.localeCompare(a.date)).map(log => {
        const subject = studyData.find(s => s.id === log.subjectId);
        const subjName = subject ? subject.name : 'Excluída';
        let topicName = 'Geral';
        if (log.topicId !== 'geral' && subject) { const t = subject.topics.find(x => x.id === log.topicId); if (t) topicName = t.name; }
        let statusText = '—';
        if (log.status === true) statusText = '✅ Finalizado'; else if (log.status === false && log.progressStr) statusText = `📌 ${escapeHtml(log.progressStr)}`;
        return `<tr><td>${formatDateBR(log.date)}</td><td style="font-weight: 500;">${escapeHtml(subjName)}</td><td>${escapeHtml(topicName)}</td><td>${log.hours > 0 ? log.hours + 'h' : '—'}</td><td>${statusText}</td><td><button class="btn-del btn-icon-del" onclick="deleteLog('${log.id}')" title="Excluir">✕</button></td></tr>`;
    }).join('');
    const regBody = document.getElementById('registrarLogBody');
    if (regBody) regBody.innerHTML = html || '<tr><td colspan="6" style="text-align:center; padding: 20px;">Vazio.</td></tr>';
}

function renderEdital() {
    const editalDiv = document.getElementById('editalStructure');
    if (!editalDiv) return;
    editalDiv.innerHTML = "";
    
    let totalT = 0, compT = 0;
    studyData.forEach(s => {
        s.topics.forEach(t => {
            if (!t.id.startsWith('geral_')) {
                totalT++;
                if (t.completed) compT++;
            }
        });
    });
    
    let perc = totalT > 0 ? Math.round((compT / totalT) * 100) : 0;
    
    editalDiv.innerHTML = `
        <div style="margin-bottom: 24px; padding: 20px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: 800; color: var(--text-color);">Progresso do Edital</span>
                <span style="font-weight: 800; color: var(--accent);">${perc}%</span>
            </div>
            <div style="width: 100%; background: var(--glass-border); height: 10px; border-radius: 5px; overflow: hidden;">
                <div style="width: ${perc}%; background: var(--accent); height: 100%;"></div>
            </div>
        </div>
    `;

    studyData.forEach(subject => {
        let topicsHtml = subject.topics.filter(t => !t.id.startsWith('geral_')).map(t => `
            <li class="topic-item">
                <div class="topic-content ${t.completed ? 'completed-text' : ''}">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTopic('${subject.id}', '${t.id}')">
                    <span>${t.name}</span>
                </div>
                <div class="topic-actions">
                    <button class="btn-warn" onclick="renameTopic('${subject.id}', '${t.id}')">Renomear</button>
                    <button class="btn-del" onclick="deleteTopic('${subject.id}', '${t.id}')">Deletar</button>
                </div>
            </li>`).join('');
            
        editalDiv.innerHTML += `
            <div class="subject-box">
                <div class="subject-header">
                    <h3>${subject.name}</h3>
                    <div class="subject-actions">
                        <button class="btn-warn" onclick="renameSubject('${subject.id}')">Renomear</button>
                        <button class="btn-del" onclick="deleteSubject('${subject.id}')">Deletar</button>
                    </div>
                </div>
                <ul class="topic-list">${topicsHtml || '<li>Nenhum tópico.</li>'}</ul>
            </div>`;
    });
}

    studyData.forEach(subject => {
        let topicsHtml = subject.topics.filter(t => !t.id.startsWith('geral_')).map(t => `<li class="topic-item"><div class="topic-content ${t.completed ? 'completed-text' : ''}"><input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTopic('${subject.id}', '${t.id}')"><div><span>${t.name}</span>${(!t.completed && t.lastProgress) ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">📌 ${escapeHtml(t.lastProgress)}</div>` : ''}</div></div><div class="topic-actions"><button class="btn-warn" onclick="renameTopic('${subject.id}', '${t.id}')">Renomear</button><button class="btn-del" onclick="deleteTopic('${subject.id}', '${t.id}')">Deletar</button></div></li>`).join('');
        editalDiv.innerHTML += `<div class="subject-box" style="border-left: 4px solid var(--btn-primary-bg);"><div class="subject-header"><h3>${subject.name}</h3><div class="subject-actions"><button class="btn-warn" onclick="renameSubject('${subject.id}')">Renomear</button><button class="btn-del" onclick="deleteSubject('${subject.id}')">Deletar</button></div></div><div style="display: flex; gap: 10px; margin-top: 10px; margin-bottom: 10px;"><input type="text" id="newTopic_${subject.id}" placeholder="Ex: Nova submatéria ou tópico" onkeypress="if(event.key === 'Enter') addTopic('${subject.id}')" style="flex-grow: 1;"><button onclick="addTopic('${subject.id}')">Add Tópico</button></div><ul class="topic-list">${topicsHtml || '<li>Nenhum tópico adicionado ainda.</li>'}</ul></div>`;
    });


function renderSelects() {
    const optionsHtml = '<option value="">-- Escolha a matéria primeiro --</option>' + studyData.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const select = document.getElementById('selectSubject');
    const timerSubj = document.getElementById('timerSubject');
    if (select) { const v = select.value; select.innerHTML = optionsHtml; if (v) { select.value = v; updateTopicSelect(); } }
    if (timerSubj) { const v = timerSubj.value; timerSubj.innerHTML = optionsHtml; if (v) { timerSubj.value = v; updateTimerTopicSelect(); } }
}

function changeMonth(step) { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + step); renderCalendar(); }

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthYearText = document.getElementById('calendarMonthYear');
    if (!grid) return;
    const y = currentCalendarDate.getFullYear(); const m = currentCalendarDate.getMonth();
    const mNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    monthYearText.innerText = `${mNames[m]} ${y}`;
    let html = `<div class="calendar-day-header">Dom</div><div class="calendar-day-header">Seg</div><div class="calendar-day-header">Ter</div><div class="calendar-day-header">Qua</div><div class="calendar-day-header">Qui</div><div class="calendar-day-header">Sex</div><div class="calendar-day-header">Sáb</div>`;
    for (let i = 0; i < new Date(y, m, 1).getDay(); i++) html += `<div class="calendar-day empty-day"></div>`;
    for (let day = 1; day <= new Date(y, m + 1, 0).getDate(); day++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = studyHistory.find(h => h.date === dateStr);
        const h = record ? record.hours : 0;
        let heat = 'heat-0';
        if (h > 6) heat = 'heat-4'; else if (h > 4) heat = 'heat-3'; else if (h > 2) heat = 'heat-2'; else if (h > 0) heat = 'heat-1';
        html += `<div class="calendar-day ${heat}"><span class="date-num">${day}</span><span class="hours-val">${h > 0 ? (h % 1 === 0 ? h : h.toFixed(1)) + 'h' : ''}</span></div>`;
    }
    grid.innerHTML = html;
}

function setChartDays(days) { currentChartDays = days; renderChart(); }

function renderChart() {
    const canvas = document.getElementById('studyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window.myChart) window.myChart.destroy();
    const labels = [], dataHours = [], daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = currentChartDays - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        labels.push(`${daysOfWeek[d.getDay()]} (${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')})`);
        const record = studyHistory.find(h => h.date === dateStr);
        dataHours.push(record ? record.hours : 0);
    }
    
    const style = getComputedStyle(document.documentElement);
    let chartColor = style.getPropertyValue('--btn-primary-bg').trim();
    if(!chartColor) chartColor = '#29c5ff';

    window.myChart = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Horas', data: dataHours, backgroundColor: chartColor, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
}

document.addEventListener('DOMContentLoaded', () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (document.getElementById('studyDate')) document.getElementById('studyDate').value = todayStr;
    if (document.getElementById('editHistoryDate')) document.getElementById('editHistoryDate').value = todayStr;
});