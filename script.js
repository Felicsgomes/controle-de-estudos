let studyData = [];
let studyHistory = [];
let currentCalendarDate = new Date();
let docRef = null; // definido depois que soubermos qual usuário está logado

// Protege a página: só usuários logados podem ver o app.
// Cada usuário tem seu próprio documento no Firestore (separado por uid).
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    docRef = db.collection('app').doc(user.uid);
    await loadData();
    updateUI();
});

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// Corrige dados antigos (ex: tópicos salvos como string em vez de objeto)
function fixOldData() {
    studyData.forEach(subject => {
        subject.hours = subject.hours || 0;
        if (subject.topics) {
            subject.topics = subject.topics.map(t => {
                if (typeof t === 'string') {
                    return { id: Date.now().toString() + Math.random().toString(36).substring(2, 5), name: t, completed: false, qTotal: 0, qCorrect: 0 };
                }
                t.qTotal = parseInt(t.qTotal) || 0;
                t.qCorrect = parseInt(t.qCorrect) || 0;
                return t;
            });
        } else {
            subject.topics = [];
        }
    });
}

// Carrega os dados do Firestore (substitui o antigo localStorage.getItem)
async function loadData() {
    try {
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            studyData = data.studyData || [];
            studyHistory = data.studyHistory || [];
            fixOldData();
        } else {
            studyData = [];
            studyHistory = [];
        }
    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
        alert("Não foi possível carregar seus dados. Verifique sua conexão.");
    }
}

// Salva os dados no Firestore (substitui o antigo localStorage.setItem)
async function saveData() {
    try {
        await docRef.set({
            studyData: studyData,
            studyHistory: studyHistory
        });
    } catch (error) {
        console.error("Erro ao salvar dados no Firebase:", error);
        alert("Não foi possível salvar seus dados. Verifique sua conexão.");
    }
    updateUI();
}

function showTab(tabId, element) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
}

// ================= MATÉRIAS E TÓPICOS =================
function addSubject() {
    const nameInput = document.getElementById('newSubjectName');
    const name = nameInput.value.trim();
    if (name === "") return alert("Por favor, digite o nome da matéria!");
    studyData.push({ id: Date.now().toString(), name: name, hours: 0, topics: [] });
    nameInput.value = "";
    saveData();
}

function renameSubject(subjectId) {
    const subject = studyData.find(s => s.id === subjectId);
    if (!subject) return;
    const newName = prompt("Digite o novo nome para a matéria:", subject.name);
    if (newName && newName.trim() !== "") { subject.name = newName.trim(); saveData(); }
}

function deleteSubject(subjectId) {
    const subject = studyData.find(s => s.id === subjectId);
    if (!subject) return;
    if (confirm(`Deletar a matéria "${subject.name}" e todos os seus tópicos/questões?`)) {
        studyData = studyData.filter(s => s.id !== subjectId);
        saveData();
    }
}

function addTopic(subjectId) {
    const topicInput = document.getElementById(`newTopic_${subjectId}`);
    const topicName = topicInput.value.trim();
    if (topicName === "") return alert("Digite o nome do tópico!");
    const subject = studyData.find(s => s.id === subjectId);
    if (subject) {
        subject.topics.push({ id: Date.now().toString(), name: topicName, completed: false, qTotal: 0, qCorrect: 0 });
        topicInput.value = "";
        saveData();
    }
}

function renameTopic(subjectId, topicId) {
    const subject = studyData.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);
    if (!topic) return;
    const newName = prompt("Digite o novo nome para o tópico:", topic.name);
    if (newName && newName.trim() !== "") { topic.name = newName.trim(); saveData(); }
}

function deleteTopic(subjectId, topicId) {
    const subject = studyData.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);
    if (!topic) return;
    if (confirm(`Remover o tópico "${topic.name}"?`)) {
        subject.topics = subject.topics.filter(t => t.id !== topicId);
        saveData();
    }
}

function toggleTopic(subjectId, topicId) {
    const subject = studyData.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);
    if (topic) { topic.completed = !topic.completed; saveData(); }
}

// ================= REGISTROS E SELECTS =================
function updateTopicSelect() {
    const subjectId = document.getElementById('selectSubject').value;
    const topicSelect = document.getElementById('selectTopic');
    topicSelect.innerHTML = '<option value="">-- Escolha o assunto --</option>';

    if (!subjectId) return;

    const subject = studyData.find(s => s.id === subjectId);
    if (subject) {
        topicSelect.innerHTML += `<option value="geral">Geral (Sem tópico específico)</option>`;
        subject.topics.forEach(t => {
            if (!t.id.startsWith('geral_')) {
                topicSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
            }
        });
    }
}

function registerStudy() {
    const dateInput = document.getElementById('studyDate').value;
    const subjectId = document.getElementById('selectSubject').value;
    const topicId = document.getElementById('selectTopic').value;
    const hours = parseFloat(document.getElementById('studyHours').value) || 0;
    const qTotal = parseInt(document.getElementById('studyQuestions').value) || 0;
    const qCorrect = parseInt(document.getElementById('correctQuestions').value) || 0;

    if (!dateInput) return alert("Por favor, selecione uma data.");
    if (!subjectId || !topicId) return alert("Selecione a matéria e o assunto!");
    if (qCorrect > qTotal) return alert("O número de acertos não pode ser maior que o total de questões!");
    if (hours === 0 && qTotal === 0) return alert("Preencha as horas ou questões.");

    const subject = studyData.find(s => s.id === subjectId);
    if (subject) {
        subject.hours += hours;

        if (topicId === "geral") {
            let geralTopic = subject.topics.find(t => t.id === `geral_${subject.id}`);
            if (!geralTopic) {
                geralTopic = { id: `geral_${subject.id}`, name: "Questões Gerais", completed: false, qTotal: 0, qCorrect: 0 };
                subject.topics.push(geralTopic);
            }
            geralTopic.qTotal += qTotal;
            geralTopic.qCorrect += qCorrect;
        } else {
            const topic = subject.topics.find(t => t.id === topicId);
            if (topic) {
                topic.qTotal += qTotal;
                topic.qCorrect += qCorrect;
            }
        }

        if (hours > 0) {
            let dayRecord = studyHistory.find(h => h.date === dateInput);
            if (dayRecord) {
                dayRecord.hours += hours;
            } else {
                studyHistory.push({ date: dateInput, hours: hours });
            }
        }

        document.getElementById('studyHours').value = "";
        document.getElementById('studyQuestions').value = "";
        document.getElementById('correctQuestions').value = "";
        saveData();

        document.getElementById('studyHours').focus();
        alert(`Registro do dia ${dateInput.split('-').reverse().join('/')} salvo com sucesso!`);
    }
}

// ================= RENDERIZAÇÃO E CÁLCULOS =================
function calculateAccuracy(correct, total) {
    if (total === 0 || isNaN(total)) return 0;
    return Math.round((correct / total) * 100);
}

function getBadgeClass(percentage) {
    if (percentage >= 80) return 'badge-good';
    if (percentage >= 60) return 'badge-warn';
    return 'badge-bad';
}

function updateUI() {
    renderDashboard();
    renderPerfil();
    renderEdital();
    renderSelects();
    renderChart();
    renderCalendar();
}

// ========= LÓGICA DO CALENDÁRIO HEATMAP =========
function changeMonth(step) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + step);
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthYearText = document.getElementById('calendarMonthYear');

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    monthYearText.innerText = `${monthNames[month]} ${year}`;

    let html = `
        <div class="calendar-day-header">Dom</div>
        <div class="calendar-day-header">Seg</div>
        <div class="calendar-day-header">Ter</div>
        <div class="calendar-day-header">Qua</div>
        <div class="calendar-day-header">Qui</div>
        <div class="calendar-day-header">Sex</div>
        <div class="calendar-day-header">Sáb</div>
    `;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day empty-day"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = studyHistory.find(h => h.date === dateStr);
        const hours = record ? record.hours : 0;

        let heatClass = 'heat-0';
        if (hours > 6) heatClass = 'heat-4';
        else if (hours > 4) heatClass = 'heat-3';
        else if (hours > 2) heatClass = 'heat-2';
        else if (hours > 0) heatClass = 'heat-1';

        html += `
            <div class="calendar-day ${heatClass}">
                <span class="date-num">${day}</span>
                <span class="hours-val">${hours > 0 ? hours + 'h' : ''}</span>
            </div>
        `;
    }

    grid.innerHTML = html;
}

function renderDashboard() {
    const tbody = document.getElementById('progressTableBody');
    tbody.innerHTML = "";

    let globalHours = 0;
    let globalTotalQ = 0;
    let globalCorrectQ = 0;

    studyData.forEach(subject => {
        globalHours += subject.hours;

        let subjectTotalQ = 0;
        let subjectCorrectQ = 0;

        subject.topics.forEach(t => {
            subjectTotalQ += t.qTotal;
            subjectCorrectQ += t.qCorrect;
        });

        globalTotalQ += subjectTotalQ;
        globalCorrectQ += subjectCorrectQ;

        let subjectAcc = calculateAccuracy(subjectCorrectQ, subjectTotalQ);

        tbody.innerHTML += `
            <tr>
                <td><strong>${subject.name}</strong></td>
                <td>${subject.hours}h</td>
                <td>${subjectTotalQ} feitas / <span class="text-success">${subjectCorrectQ} certas</span></td>
                <td><span class="badge ${getBadgeClass(subjectAcc)}">${subjectAcc}%</span></td>
            </tr>
        `;
    });

    document.getElementById('totalHours').innerText = `${globalHours}h`;
    document.getElementById('totalQuestions').innerText = globalTotalQ;
    document.getElementById('totalCorrect').innerText = globalCorrectQ;
    document.getElementById('overallAccuracy').innerText = `${calculateAccuracy(globalCorrectQ, globalTotalQ)}%`;
}

function renderPerfil() {
    const profileDiv = document.getElementById('detailedProfileStats');
    profileDiv.innerHTML = "";

    let totalTopicsCount = 0;
    let completedTopicsCount = 0;

    studyData.forEach(subject => {
        subject.topics.forEach(t => {
            if (!t.id.startsWith('geral_')) {
                totalTopicsCount++;
                if (t.completed) completedTopicsCount++;
            }
        });

        let subjTotalQ = 0;
        let subjCorrectQ = 0;
        subject.topics.forEach(t => { subjTotalQ += t.qTotal; subjCorrectQ += t.qCorrect; });
        let subjAcc = calculateAccuracy(subjCorrectQ, subjTotalQ);

        let htmlBlock = `
            <div class="profile-subject-row">
                <span>📘 ${subject.name} (Geral)</span>
                <span>${subjTotalQ} Questões | <span class="badge ${getBadgeClass(subjAcc)}">${subjAcc}% Acertos</span></span>
            </div>
        `;

        subject.topics.forEach(topic => {
            if (topic.qTotal > 0 || topic.id.startsWith('geral_')) {
                let topicAcc = calculateAccuracy(topic.qCorrect, topic.qTotal);
                htmlBlock += `
                    <div class="profile-topic-row">
                        <span>↳ ${topic.name}</span>
                        <span>${topic.qTotal} qts | ${topic.qCorrect} certas | <span style="font-weight:bold; color: ${topicAcc >= 80 ? '#27ae60' : topicAcc >= 60 ? '#f39c12' : '#e74c3c'}">${topicAcc}%</span></span>
                    </div>
                `;
            }
        });

        profileDiv.innerHTML += htmlBlock;
    });

    let editalDone = totalTopicsCount > 0 ? Math.round((completedTopicsCount / totalTopicsCount) * 100) : 0;
    document.getElementById('profilePercentageDone').innerText = `${editalDone}%`;
}

function renderEdital() {
    const editalDiv = document.getElementById('editalStructure');
    editalDiv.innerHTML = "";

    studyData.forEach(subject => {
        let topicsHtml = subject.topics
            .filter(t => !t.id.startsWith('geral_'))
            .map(t => `
            <li class="topic-item">
                <div class="topic-content ${t.completed ? 'completed-text' : ''}">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTopic('${subject.id}', '${t.id}')">
                    <span>${t.name}</span>
                </div>
                <div>
                    <button class="btn-warn" onclick="renameTopic('${subject.id}', '${t.id}')">Renomear</button>
                    <button class="btn-del" onclick="deleteTopic('${subject.id}', '${t.id}')">Deletar</button>
                </div>
            </li>
        `).join('');

        editalDiv.innerHTML += `
            <div class="subject-box" style="border-left: 4px solid var(--primary);">
                <div class="subject-header">
                    <h3>${subject.name}</h3>
                    <div class="subject-actions">
                        <button class="btn-warn" onclick="renameSubject('${subject.id}')">Renomear</button>
                        <button class="btn-del" onclick="deleteSubject('${subject.id}')">Deletar</button>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px; margin-bottom: 10px;">
                    <input type="text" id="newTopic_${subject.id}" placeholder="Ex: Nova submatéria ou tópico" onkeypress="if(event.key === 'Enter') addTopic('${subject.id}')" style="flex-grow: 1;">
                    <button onclick="addTopic('${subject.id}')">Add Tópico</button>
                </div>
                <ul class="topic-list">
                    ${topicsHtml || '<li>Nenhum tópico adicionado ainda.</li>'}
                </ul>
            </div>
        `;
    });
}

function renderSelects() {
    const select = document.getElementById('selectSubject');
    const currentVal = select.value;

    select.innerHTML = '<option value="">-- Escolha a matéria primeiro --</option>';
    studyData.forEach(subject => {
        select.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
    });

    if (currentVal) {
        select.value = currentVal;
        updateTopicSelect();
    }
}

function renderChart() {
    const ctx = document.getElementById('studyChart').getContext('2d');
    if (window.myChart) {
        window.myChart.destroy();
    }

    const labels = [];
    const dataHours = [];
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const label = `${daysOfWeek[d.getDay()]} (${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')})`;
        labels.push(label);

        const record = studyHistory.find(h => h.date === dateStr);
        dataHours.push(record ? record.hours : 0);
    }

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Horas Estudadas',
                data: dataHours,
                backgroundColor: 'rgba(0, 86, 179, 0.7)',
                borderColor: 'rgba(0, 86, 179, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Horas' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// Setando o valor de "hoje" no input date do registro
// (não precisa esperar o login, então roda direto no carregamento da página)
document.addEventListener('DOMContentLoaded', () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('studyDate').value = todayStr;
});