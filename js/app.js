/* ================================================
   app.js - Main Application Controller
   애니톡 학원 관리 시스템
   ================================================ */

const App = {
  currentPage: 'dashboard',
  currentConsultFilter: '전체',
  currentStudentFilter: '전체',

  // --- Initialize ---
  init() {
    Store.loadSampleData();
    this.setupNavigation();
    this.setupMobileMenu();
    this.setupForms();
    this.setupFilters();
    this.renderDashboard();
    this.updateBadges();
    
    // --- Firebase 초기화 ---
    if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
      Store.initFirebase(firebaseConfig);
      this.initAuth();
    }
    
    // --- 네이버 사진 복붙 & 드래그 드롭 설정 ---
    const pasteArea = document.getElementById('naverPasteArea');
    if (pasteArea) {
      // Ctrl+V (붙여넣기) 이벤트
      pasteArea.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            this.processNaverImageFile(file);
            e.preventDefault();
            break;
          }
        }
      });
      
      // 드래그 앤 드롭 이벤트
      pasteArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        pasteArea.style.borderColor = 'var(--primary)';
        pasteArea.style.backgroundColor = '#eff6ff';
      });
      pasteArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        pasteArea.style.borderColor = '';
        pasteArea.style.backgroundColor = '';
      });
      pasteArea.addEventListener('drop', (e) => {
        e.preventDefault();
        pasteArea.style.borderColor = '';
        pasteArea.style.backgroundColor = '';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            this.processNaverImageFile(file);
          }
        }
      });
    }
  },

  // --- Navigation ---
  setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        this.navigate(item.dataset.page);
      });
    });
  },

  navigate(page) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    // Update page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    this.currentPage = page;

    // Close mobile menu
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');

    // Render page
    switch (page) {
      case 'dashboard': this.renderDashboard(); break;
      case 'consultations': this.renderConsultations(); break;
      case 'students': this.renderStudents(); break;
      case 'new-consultation': this.setupConsultDate(); break;
    }
  },

  // --- Mobile Menu ---
  setupMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  },

  // --- Forms ---
  setupForms() {
    // Consultation form
    document.getElementById('consultationForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConsultation();
    });

    // Modal char count
    document.getElementById('modalConsultNote').addEventListener('input', (e) => {
      const count = e.target.value.length;
      document.getElementById('modalCharCount').textContent = count;
      document.getElementById('modalCharCount').parentElement.classList.toggle('warning', count >= 480);
    });

    // Reg char count
    document.getElementById('regNote').addEventListener('input', (e) => {
      const count = e.target.value.length;
      document.getElementById('regCharCount').textContent = count;
      document.getElementById('regCharCount').parentElement.classList.toggle('warning', count >= 480);
    });

    // Student search
    document.getElementById('studentSearch').addEventListener('input', () => {
      this.renderStudents();
    });
  },

  setupConsultDate() {
    const dateInput = document.getElementById('consultDate');
    if (!dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  },

  // --- Filters ---
  setupFilters() {
    // Consultation filters
    document.getElementById('consultFilterTabs').addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-tab')) {
        document.querySelectorAll('#consultFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentConsultFilter = e.target.dataset.filter;
        this.renderConsultations();
      }
    });

    // Student filters
    document.getElementById('studentFilterTabs').addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-tab')) {
        document.querySelectorAll('#studentFilterTabs .filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentStudentFilter = e.target.dataset.filter;
        this.renderStudents();
      }
    });
  },

  // --- Dashboard ---
  renderDashboard() {
    const stats = Store.getStats();
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${['일','월','화','수','목','금','토'][today.getDay()]}요일`;
    document.getElementById('dashboardDate').textContent = dateStr;

    // Stats cards
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card primary">
        <div class="stat-icon">📅</div>
        <div class="stat-info">
          <div class="stat-value">${stats.monthlyConsultations}</div>
          <div class="stat-label">이번 달 상담</div>
        </div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">${stats.monthlyRegistrations}</div>
          <div class="stat-label">이번 달 등록</div>
        </div>
      </div>
      <div class="stat-card accent">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <div class="stat-value">${stats.totalStudents}</div>
          <div class="stat-label">재학생 수</div>
        </div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon">📈</div>
        <div class="stat-info">
          <div class="stat-value">${stats.conversionRate}%</div>
          <div class="stat-label">등록 전환율</div>
        </div>
      </div>
    `;

    // Today's schedule
    const scheduleEl = document.getElementById('todaySchedule');
    if (stats.todayConsultations.length === 0) {
      scheduleEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">☀️</div>
          <h3>오늘 예정된 상담이 없습니다</h3>
        </div>`;
    } else {
      scheduleEl.innerHTML = stats.todayConsultations.map(c => `
        <div class="schedule-item">
          <div class="schedule-time">${c.time || '--:--'}</div>
          <div class="schedule-info">
            <div class="schedule-name">${c.parentName || c.name} ${c.name ? '('+c.name+')' : ''}</div>
            <div class="schedule-detail">${c.grade} · ${c.className}</div>
          </div>
          <span class="badge badge-${this._statusClass(c.status)}">${c.status}</span>
        </div>
      `).join('');
    }

    // Class chart
    const maxCount = Math.max(...Object.values(stats.classCounts), 1);
    const barClasses = { '고등반': 'bar-primary', '주니어반': 'bar-success', '취미반': 'bar-accent' };
    document.getElementById('classChart').innerHTML = `
      <div class="class-bars">
        ${Object.entries(stats.classCounts).map(([name, count]) => `
          <div class="class-bar-item">
            <div class="class-bar-label">${name}</div>
            <div class="class-bar-track">
              <div class="class-bar-fill ${barClasses[name]}" style="width: ${(count / Math.max(maxCount, 5)) * 100}%">
                ${count > 0 ? '' : ''}
              </div>
            </div>
            <div class="class-bar-count">${count}명</div>
          </div>
        `).join('')}
      </div>
    `;

    // Animate bars
    setTimeout(() => {
      document.querySelectorAll('.class-bar-fill').forEach(bar => {
        bar.style.width = bar.style.width; // trigger reflow
      });
    }, 100);
  },

  // --- Google Calendar ---
  _buildGoogleCalendarUrl(consultation) {
    const { date, time, name, grade, className, phone } = consultation;
    
    // Build start/end time (1 hour duration)
    const startDate = date.replace(/-/g, '');
    const startTime = (time || '10:00').replace(':', '') + '00';
    const endHour = String(parseInt((time || '10:00').split(':')[0]) + 1).padStart(2, '0');
    const endMin = (time || '10:00').split(':')[1] || '00';
    const endTime = endHour + endMin + '00';
    
    const start = `${startDate}T${startTime}`;
    const end = `${startDate}T${endTime}`;
    
    const title = encodeURIComponent(`[신규상담] ${name} (${grade} / ${className})`);
    const details = encodeURIComponent(
      `📋 신규상담 예약\n` +
      `신청자 이름: ${name || '-'}\n` +
      `예상 학년: ${grade}\n` +
      `상담반: ${className}\n` +
      `연락처: ${phone || '-'}\n\n` +
      `— 애니톡만화학원`
    );
    const location = encodeURIComponent('애니톡만화학원');
    
    // authuser 파라미터를 통해 특정 이메일 세션으로 강제 시도 (404 방지를 위해 /render 경로 유지)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}&authuser=anitalk3134@gmail.com`;
  },

  openGoogleCalendar(consultId) {
    const c = Store.getConsultation(consultId);
    if (!c) return;
    const url = this._buildGoogleCalendarUrl(c);
    window.open(url, 'GoogleCalendar', 'width=900,height=800,scrollbars=yes,resizable=yes');
  },

  _buildFirstClassCalendarUrl(student) {
    const { firstClassDate, time, name, grade, className, phone, parentPhone, parentName, days } = student;
    
    const startDate = firstClassDate.replace(/-/g, '');
    const startTime = (time || '14:00').replace(':', '') + '00';
    // 기본적으로 1시간 30분 수업으로 설정
    const startHour = parseInt((time || '14:00').split(':')[0]);
    const startMin = parseInt((time || '14:00').split(':')[1] || '00');
    
    let endHour = startHour + 1;
    let endMin = startMin + 30;
    if (endMin >= 60) {
      endHour += 1;
      endMin -= 60;
    }
    const endTime = String(endHour).padStart(2, '0') + String(endMin).padStart(2, '0') + '00';
    
    const start = `${startDate}T${startTime}`;
    const end = `${startDate}T${endTime}`;
    
    const title = encodeURIComponent(`[첫수업] ${name} (${grade} / ${className})`);
    const details = encodeURIComponent(
      `✨ 신규 등록 학생 첫 수업\n` +
      `학생 이름: ${name}\n` +
      `학년: ${grade} / 반: ${className}\n` +
      `수업 요일: ${days ? days.join(', ') : '-'}\n` +
      `학부모: ${parentName || '-'} (${parentPhone || '-'})\n` +
      `학생 연락처: ${phone || '-'}\n\n` +
      `— 애니톡만화학원`
    );
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${encodeURIComponent('애니톡만화학원')}&authuser=anitalk3134@gmail.com`;
  },

  // --- Naver Auto Fill ---
  parseNaverImage(event) {
    const file = event.target.files[0];
    if (file) {
      this.processNaverImageFile(file);
    }
    // 파일 input 초기화 (같은 파일 다시 올릴 수 있게)
    event.target.value = '';
  },

  async processNaverImageFile(file) {
    const statusEl = document.getElementById('ocrStatus');
    statusEl.style.display = 'block';
    statusEl.innerText = '이미지에서 글씨를 읽고 있습니다... (10~20초 소요 ⏳)';

    try {
      // Tesseract.js로 한국어 OCR 실행
      const result = await Tesseract.recognize(file, 'kor', {
        logger: m => {
          if (m.status === 'recognizing text') {
            statusEl.innerText = `글씨 판독 중... ${Math.round(m.progress * 100)}%`;
          }
        }
      });
      
      const text = result.data.text;
      document.getElementById('naverPasteArea').value = text;
      
      statusEl.innerText = '✅ 글씨 판독 완료! 폼에 입력합니다.';
      
      // 추출된 텍스트로 자동 분석 실행
      this.parseNaverText();
      
      setTimeout(() => statusEl.style.display = 'none', 3000);
      
    } catch (err) {
      console.error(err);
      statusEl.innerText = '❌ 오류가 발생했습니다. 다시 시도해 주세요.';
      this.showToast('이미지 인식에 실패했습니다.', 'error');
    }
  },

  parseNaverText() {
    const text = document.getElementById('naverPasteArea').value;
    if (!text.trim()) {
      this.showToast('붙여넣은 텍스트가 없습니다.', 'error');
      return;
    }

    // 이름 추출
    const nameMatch = text.match(/예약자\s+([^\n\r]+)/) || text.match(/확정\s+([^\n\r]+)/);
    if (nameMatch) {
      document.getElementById('consultName').value = nameMatch[1].trim();
    }

    // 번호 추출
    const phoneMatch = text.match(/전화번호\s+([\d-]+)/);
    if (phoneMatch) {
      document.getElementById('consultPhone').value = phoneMatch[1].trim();
    }

    // 날짜/시간 추출 (예: 2026. 4. 14.(화) 오후 5:30)
    const datetimeMatch = text.match(/이용일시\s+(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\..*(오전|오후)\s*(\d{1,2}):(\d{2})/);
    if (datetimeMatch) {
      const year = datetimeMatch[1];
      const month = datetimeMatch[2].padStart(2, '0');
      const day = datetimeMatch[3].padStart(2, '0');
      document.getElementById('consultDate').value = `${year}-${month}-${day}`;
      
      let ampm = datetimeMatch[4];
      let hour = parseInt(datetimeMatch[5]);
      let min = datetimeMatch[6];
      if (ampm === '오후' && hour < 12) hour += 12;
      if (ampm === '오전' && hour === 12) hour = 0;
      
      const timeVal = `${hour.toString().padStart(2, '0')}:${min}`;
      
      const select = document.getElementById('consultTime');
      const found = Array.from(select.options).some(opt => opt.value === timeVal);
      if (found) {
        select.value = timeVal;
      }
    }

    // 반/학년 유추 (옵션)
    const optionMatch = text.match(/옵션\s+([^\n\r]+)/);
    if (optionMatch) {
      const optStr = optionMatch[1];
      
      // 반 유추
      if (optStr.includes('취미')) document.getElementById('consultClass').value = '취미반';
      else if (optStr.includes('고등') || optStr.includes('입시')) document.getElementById('consultClass').value = '고등반';
      else if (optStr.includes('초등') || optStr.includes('중등') || optStr.includes('주니어')) document.getElementById('consultClass').value = '주니어반';
      
      // 학년 유추
      if (optStr.includes('성인') || optStr.includes('직장인') || optStr.includes('대학생')) document.getElementById('consultGrade').value = '성인';
      
      document.getElementById('consultMemo').value = optStr.trim();
    }

    this.showToast('✨ 네이버 예약 정보가 자동 입력되었습니다!');
    // textarea 비우기
    document.getElementById('naverPasteArea').value = '';
  },

  // --- Consultations ---
  async saveConsultation() {
    const data = {
      date: document.getElementById('consultDate').value,
      time: document.getElementById('consultTime').value,
      grade: document.getElementById('consultGrade').value,
      className: document.getElementById('consultClass').value,
      name: document.getElementById('consultName').value,
      phone: document.getElementById('consultPhone').value,
      memo: document.getElementById('consultMemo').value,
    };

    // 데이터 저장 (비동기 완료 대기)
    const consultation = await Store.addConsultation(data);
    document.getElementById('consultationForm').reset();
    
    // 구글 캘린더 추가 링크 자동 열기 (새 창 팝업)
    if (consultation) {
      const calUrl = this._buildGoogleCalendarUrl(consultation);
      window.open(calUrl, 'GoogleCalendar', 'width=900,height=800,scrollbars=yes,resizable=yes');
    }
    
    this.showToast('상담 예약이 등록되고 구글 캘린더가 새 창에서 열렸습니다! 📅');
    this.updateBadges();
    this.navigate('consultations');
  },

  renderConsultations() {
    let consultations = Store.getConsultations();

    if (this.currentConsultFilter !== '전체') {
      consultations = consultations.filter(c => c.status === this.currentConsultFilter);
    }

    const tbody = document.getElementById('consultationTableBody');
    const emptyState = document.getElementById('consultEmptyState');

    if (consultations.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = consultations.map(c => `
      <tr>
        <td>${this._formatDate(c.date)}</td>
        <td>${c.time || '-'}</td>
        <td><strong>${c.name || '-'}</strong></td>
        <td>${c.grade}</td>
        <td><span class="badge badge-class">${c.className}</span></td>
        <td>${c.phone}</td>
        <td><span class="badge badge-${this._statusClass(c.status)}">${c.status}</span></td>
        <td class="action-cell">
          <div class="action-grid">
            <button class="btn-action" onclick="App.openGoogleCalendar('${c.id}')" title="구글 캘린더">📅</button>
            <button class="btn-action" onclick="App.openConsultComplete('${c.id}')" title="상담 기록/수정">
              <span class="icon">✏️</span> 수정
            </button>
            ${c.status !== '예약됨' ? `
              <button class="btn-action" onclick="App.viewReportByConsultation('${c.id}')" title="보고서 보기">
                <span class="icon">📄</span> 보고서
              </button>
            ` : ''}
            ${['보류', '등록대기'].includes(c.status) ? `
              <button class="btn btn-sm btn-success" onclick="App.openRegisterModal('${c.id}', '등록')" style="padding: 4px 8px; font-size: 11px;">등록</button>
            ` : ''}
            <button class="btn-action" onclick="App.deleteConsultation('${c.id}')" style="color:var(--danger);" title="삭제">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openConsultComplete(id) {
    const c = Store.getConsultation(id);
    if (!c) return;
    document.getElementById('modalConsultId').value = id;
    document.getElementById('modalConsultNote').value = c.consultNote || '';
    document.getElementById('modalCharCount').textContent = (c.consultNote || '').length;
    document.getElementById('modalConsultResult').value = '상담완료';
    this.openModal('consultCompleteModal');
  },

  completeConsultation() {
    const id = document.getElementById('modalConsultId').value;
    const note = document.getElementById('modalConsultNote').value;
    const result = document.getElementById('modalConsultResult').value;

    if (result === '등록') {
      // 등록을 선택한 경우
      Store.updateConsultation(id, { consultNote: note, status: '등록대기' });
      this.closeModal('consultCompleteModal');
      this.renderConsultations();
      this.updateBadges();
      this.openRegisterModal(id, '등록');
    } else if (result === '보류') {
      // 보류를 선택한 경우에도 등록 창을 열어 정보를 더 입력할 수 있게 함
      Store.updateConsultation(id, { consultNote: note, status: '보류' });
      this.closeModal('consultCompleteModal');
      this.renderConsultations();
      this.updateBadges();
      this.openRegisterModal(id, '보류');
    } else {
      Store.updateConsultation(id, { consultNote: note, status: result });
      this.closeModal('consultCompleteModal');
      this.showToast('상담 내용과 결과가 저장되었습니다! 📝');
      this.renderConsultations();
      this.updateBadges();
    }
  },

  deleteConsultation(id) {
    if (confirm('이 상담 예약을 삭제하시겠습니까?')) {
      Store.deleteConsultation(id);
      this.showToast('상담이 삭제되었습니다.', 'warning');
      this.renderConsultations();
      this.updateBadges();
    }
  },

  // --- Registration ---
  openRegisterModal(consultId, type = '등록') {
    const c = Store.getConsultation(consultId);
    if (!c) return;

    this.currentRegType = type; // 상태 저장
    const submitBtn = document.getElementById('regSubmitBtn');
    
    if (type === '보류') {
      submitBtn.innerHTML = '💾 저장';
      submitBtn.className = 'btn btn-primary btn-lg'; // 파란색으로 변경
    } else {
      submitBtn.innerHTML = '✅ 등록 완료';
      submitBtn.className = 'btn btn-success btn-lg'; // 초록색 유지
    }

    document.getElementById('regConsultId').value = consultId;
    document.getElementById('regName').value = ''; // 학생 이름은 등록 시 정확히 입력받도록 비움
    document.getElementById('regParentName').value = c.name || ''; // 상담 신청자를 학부모란에 기본 세팅
    document.getElementById('regGrade').value = c.grade;
    document.getElementById('regClass').value = c.className;
    document.getElementById('regParentPhone').value = c.phone || ''; // 상담 시 번호를 학부모 번호에 우선 세팅
    document.getElementById('regNote').value = c.consultNote || '';
    document.getElementById('regCharCount').textContent = (c.consultNote || '').length;
    document.getElementById('regFirstDate').value = '';
    document.getElementById('regTime').value = '';

    // Reset day checkboxes
    document.querySelectorAll('.checkbox-pill').forEach(cb => cb.checked = false);

    this.openModal('registerModal');
  },

  async registerStudent() {
    const consultId = document.getElementById('regConsultId').value;
    const c = Store.getConsultation(consultId);

    const selectedDays = Array.from(document.querySelectorAll('.checkbox-pill:checked')).map(cb => cb.value);
    const firstDate = document.getElementById('regFirstDate').value;
    const time = document.getElementById('regTime').value;

    // '등록'일 때만 필수 항목 검사 수행
    if (this.currentRegType === '등록') {
      if (selectedDays.length === 0) {
        this.showToast('수업 요일을 선택해 주세요.', 'error');
        return;
      }
      if (!firstDate) {
        this.showToast('첫 수업일을 입력해 주세요.', 'error');
        return;
      }
      if (!time) {
        this.showToast('수업 시간을 입력해 주세요.', 'error');
        return;
      }
    }

    const regName = document.getElementById('regName').value.trim();
    if (!regName) {
      this.showToast('학생 이름을 입력해 주세요.', 'error');
      return;
    }

    const studentData = {
      consultationId: consultId,
      name: regName,
      parentName: document.getElementById('regParentName').value,
      grade: c.grade,
      className: document.getElementById('regClass').value,
      days: selectedDays,
      time: time,
      firstClassDate: firstDate,
      phone: c.phone,
      parentPhone: document.getElementById('regParentPhone').value,
      consultNote: document.getElementById('regNote').value,
    };

    if (this.currentRegType === '보류') {
      // 보류인 경우 학생으로 등록하지 않고 상담 기록만 상세히 업데이트
      await Store.updateConsultation(consultId, { 
        status: '보류', 
        consultNote: studentData.consultNote,
        className: studentData.className,
        days: studentData.days,
        time: studentData.time,
        firstClassDate: studentData.firstClassDate,
        parentPhone: studentData.parentPhone
      });
      this.closeModal('registerModal');
      this.showToast('💾 상담 정보가 보류 상태로 안전하게 저장되었습니다.');
      this.renderConsultations();
      this.updateBadges();
      return; // 학생 등록(addStudent) 단계로 넘어가지 않음
    }

    // 등록 완료인 경우에만 학생 데이터 생성
    const newStudent = await Store.addStudent(studentData);
    await Store.updateConsultation(consultId, { status: '등록완료', consultNote: studentData.consultNote });

    // 2. 모달 닫기 및 UI 갱신
    this.closeModal('registerModal');
    this.showToast('🎉 학생 등록 완료! 첫 수업 일정이 캘린더에 추가되었습니다.');
    this.renderConsultations();
    this.renderStudents();
    this.updateBadges();

    // 3. 구글 캘린더 자동 팝업 (등록완료일 때만 실행)
    if (newStudent) {
      const calUrl = this._buildFirstClassCalendarUrl(newStudent);
      setTimeout(() => {
        window.open(calUrl, 'GoogleCalendar', 'width=1000,height=850,scrollbars=yes,resizable=yes');
      }, 100);
    }
  },

  // --- Students ---
  renderStudents() {
    let students = Store.getStudents().filter(s => s.status === '재학');
    const searchQuery = document.getElementById('studentSearch').value.trim().toLowerCase();

    if (this.currentStudentFilter !== '전체') {
      students = students.filter(s => s.className === this.currentStudentFilter);
    }

    if (searchQuery) {
      students = students.filter(s => s.name.toLowerCase().includes(searchQuery));
    }

    const tbody = document.getElementById('studentTableBody');
    const emptyState = document.getElementById('studentEmptyState');

    if (students.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = students.map(s => `
      <tr>
        <td>${Store.getConsultation(s.consultationId) ? this._formatDate(Store.getConsultation(s.consultationId).date) : '-'}</td>
        <td>${this._formatDate(s.registeredAt)}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.grade}</td>
        <td><span class="badge badge-class">${s.className}</span></td>
        <td>${s.days ? s.days.join(', ') : '-'}</td>
        <td>${s.time || '-'}</td>
        <td>${s.phone || s.parentPhone || '-'}</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="App.viewReport('${s.id}')">📄 보고서</button>
          <button class="btn btn-sm btn-ghost" onclick="App.openEditStudentModal('${s.id}')">✏️ 수정</button>
          <button class="btn btn-sm btn-ghost" onclick="App.deleteStudent('${s.id}')" style="color:var(--danger);">🗑️ 삭제</button>
        </td>
      </tr>
    `).join('');
  },

  // --- Report ---
  viewReport(data) {
    const s = data;
    const monthlyClasses = s.days ? Store.calculateMonthlyClasses(s.days, s.firstClassDate) : '-';

    document.getElementById('reportContent').innerHTML = `
      <div class="report-card">
        <div class="report-header">
          <h2>AniTalk Academy Consultation Report</h2>
        </div>
        <table class="report-table">
          <tbody>
            <tr>
              <th>1. 상담일</th>
              <td><input type="text" id="reportEditDate" class="report-input" value="${s.consultDate || s.registeredAt || ''}" placeholder="YYYY-MM-DD"></td>
            </tr>
            <tr>
              <th>2. 상담자</th>
              <td>
                학 년: <input type="text" id="reportEditGrade" class="report-input-inline" style="width: 80px;" value="${s.grade || ''}">
                이 름: <input type="text" id="reportEditName" class="report-input-inline" style="width: 120px; font-weight: bold;" value="${s.name || ''}">
              </td>
            </tr>
            <tr>
              <th>3. 소속반</th>
              <td><input type="text" id="reportEditClass" class="report-input" value="${s.className || ''}"></td>
            </tr>
            <tr>
              <th>4. 첫수업일</th>
              <td><input type="text" id="reportEditFirstDate" class="report-input" value="${s.firstClassDate || ''}" placeholder="YYYY-MM-DD"></td>
            </tr>
            <tr>
              <th>5. 이번달 수업수</th>
              <td><input type="text" id="reportEditMonthlyClasses" class="report-input-inline" style="width: 60px;" value="${monthlyClasses.toString().replace('회', '')}">회</td>
            </tr>
            <tr>
              <th>6. 상담내용</th>
              <td class="consult-note">
                <textarea id="reportEditNote" class="report-textarea" placeholder="여기에 상담 내용을 입력하세요...">${s.consultNote || ''}</textarea>
              </td>
            </tr>
            <tr>
              <th>7. 반/요일,시간</th>
              <td>
                <input type="text" id="reportEditDays" class="report-input-inline" style="width: 150px;" value="${s.days ? s.days.join(', ') : ''}" placeholder="월, 수, 금">
                <input type="text" id="reportEditTime" class="report-input-inline" style="width: 100px;" value="${s.time || ''}" placeholder="14:00">
              </td>
            </tr>
            <tr class="contact-row">
              <th rowspan="2">연락처</th>
              <td>본　인: <input type="text" id="reportEditPhone" class="report-input-inline" style="width: 200px;" value="${s.phone || ''}"></td>
            </tr>
            <tr class="contact-row">
              <td>부모님: <input type="text" id="reportEditParentPhone" class="report-input-inline" style="width: 200px;" value="${s.parentPhone || ''}"></td>
            </tr>
          </tbody>
        </table>
        <div class="report-actions">
          <button class="btn btn-primary" onclick="App.saveReportFromView('${s.id}', '${s.consultationId ? 'student' : 'consultation'}')">💾 변경사항 저장</button>
          <button class="btn btn-secondary" onclick="App.saveReportAsImage('${s.name}')" style="background-color: var(--primary); color: white; border-color: var(--primary);">📥 이미지 저장</button>
          <button class="btn btn-secondary" onclick="window.print()">🖨️ 인쇄</button>
          <button class="btn btn-secondary" onclick="App.navigate('${s.consultationId ? 'students' : 'consultations'}')">← 돌아가기</button>
        </div>
      </div>
    `;

    this.navigate('report');
    // Keep report page active (manually set since report isn't a nav item)
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-report').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  },

  saveReportAsImage(studentName) {
    const reportCard = document.querySelector('.report-card');
    if (!reportCard) return;

    // 잠시 버튼들 숨기기 (이미지에는 버튼이 안 나오게)
    const actions = reportCard.querySelector('.report-actions');
    actions.style.display = 'none';

    html2canvas(reportCard, {
      scale: 2, // 고해상도 이미지 만들기
      backgroundColor: '#ffffff'
    }).then(canvas => {
      // 버튼 다시 보이게 복구
      actions.style.display = 'flex';
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `애니톡_상담보고서_${studentName}.png`;
      link.href = imgData;
      link.click();
      
      this.showToast('보고서가 이미지로 저장되었습니다! 📥');
    }).catch(err => {
      actions.style.display = 'flex';
      console.error('이미지 저장 오류:', err);
      this.showToast('이미지 저장 중 오류가 발생했습니다.', 'error');
    });
  },

  async saveReportFromView(id, type) {
    // 모든 필드 데이터 수집
    const updates = {
      consultDate: document.getElementById('reportEditDate').value.trim(),
      grade: document.getElementById('reportEditGrade').value.trim(),
      name: document.getElementById('reportEditName').value.trim(),
      className: document.getElementById('reportEditClass').value.trim(),
      firstClassDate: document.getElementById('reportEditFirstDate').value.trim(),
      consultNote: document.getElementById('reportEditNote').value.trim(),
      time: document.getElementById('reportEditTime').value.trim(),
      phone: document.getElementById('reportEditPhone').value.trim(),
      parentPhone: document.getElementById('reportEditParentPhone').value.trim(),
    };

    // 요일 데이터 처리 (쉼표로 구분된 문자열을 배열로 변환)
    const daysStr = document.getElementById('reportEditDays').value.trim();
    if (daysStr) {
      updates.days = daysStr.split(',').map(d => d.trim()).filter(d => d);
    }

    try {
      if (type === 'student') {
        // 학생 정보 업데이트 (상담 기록도 자동 동기화됨)
        await Store.updateStudent(id, updates);
      } else {
        // 상담 정보 직접 업데이트
        await Store.updateConsultation(id, updates);
      }
      
      this.showToast('보고서의 모든 변경사항이 저장되었습니다! ✨');
      this.renderConsultations();
      this.renderStudents();
    } catch (e) {
      console.error('Report Full Save Error:', e);
      this.showToast('저장에 실패했습니다.', 'error');
    }
  },

  viewReportByConsultation(consultId) {
    const c = Store.getConsultation(consultId);
    if (!c) return;

    const student = Store.getStudents().find(s => s.consultationId === consultId);
    
    // 학생 정보가 있으면 학생 정보를, 없으면 상담 정보를 바탕으로 데이터 생성
    const reportData = student ? {
      ...student,
      id: student.id, // 명시적 ID 포함
      consultationId: student.consultationId,
      consultDate: Store.getConsultation(student.consultationId)?.date || student.registeredAt
    } : {
      id: c.id, // 상담 ID 반드시 포함 (저장 시 필요)
      consultationId: null,
      name: c.name || '',
      grade: c.grade || '',
      className: c.className || '',
      registeredAt: c.date || '',
      consultDate: c.date || '',
      phone: c.phone || '',
      parentPhone: c.parentPhone || '',
      consultNote: c.consultNote || '',
      days: null,
      firstClassDate: null
    };

    this.viewReport(reportData);
  },

  // --- Modal ---
  openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
  },

  // --- Toast ---
  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '✅'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.35s ease forwards';
      setTimeout(() => toast.remove(), 350);
    }, 3000);
  },

  // --- Badges ---
  updateBadges() {
    const consultations = Store.getConsultations();
    const reserved = consultations.filter(c => c.status === '예약됨').length;
    const badge = document.getElementById('consultBadge');
    badge.textContent = reserved > 0 ? reserved : '';
    badge.style.display = reserved > 0 ? 'inline' : 'none';
  },

  // --- Helpers ---
  _formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  _statusClass(status) {
    const map = {
      '예약됨': 'reserved',
      '상담완료': 'consulted',
      '등록완료': 'registered',
      '미등록': 'rejected',
    };
    return map[status] || 'reserved';
  },

  // --- Student Edit ---
  openEditStudentModal(id) {
    const s = Store.getStudent(id);
    if (!s) return;

    document.getElementById('editStudentId').value = id;
    document.getElementById('editName').value = s.name;
    document.getElementById('editParentName').value = s.parentName || '';
    document.getElementById('editGrade').value = s.grade;
    document.getElementById('editClass').value = s.className;
    document.getElementById('editFirstDate').value = s.firstClassDate || '';
    document.getElementById('editTime').value = s.time || '';
    document.getElementById('editParentPhone').value = s.parentPhone || '';
    document.getElementById('editNote').value = s.consultNote || '';

    // Reset and set days
    document.querySelectorAll('.edit-checkbox-pill').forEach(cb => {
      cb.checked = s.days && s.days.includes(cb.value);
    });

    this.openModal('studentEditModal');
  },

  saveStudentEdit() {
    const id = document.getElementById('editStudentId').value;
    const selectedDays = Array.from(document.querySelectorAll('.edit-checkbox-pill:checked')).map(cb => cb.value);

    const updates = {
      name: document.getElementById('editName').value.trim(),
      parentName: document.getElementById('editParentName').value.trim(),
      grade: document.getElementById('editGrade').value,
      className: document.getElementById('editClass').value,
      firstClassDate: document.getElementById('editFirstDate').value,
      days: selectedDays,
      time: document.getElementById('editTime').value.trim(),
      parentPhone: document.getElementById('editParentPhone').value.trim(),
      consultNote: document.getElementById('editNote').value.trim(),
    };

    if (!updates.name) {
      this.showToast('학생 이름을 입력해 주세요.', 'error');
      return;
    }

    Store.updateStudent(id, updates);
    this.closeModal('studentEditModal');
    this.showToast('학생 정보가 수정되었으며 연결된 상담 기록도 동기화되었습니다! ✨');
    this.renderStudents();
    this.renderConsultations(); // 상담 목록도 함께 새로고침하여 동기화 확인
  },

  deleteStudent(id) {
    if (confirm('정말 이 학생을 삭제하시겠습니까? 관련 상담 기록은 유지됩니다.')) {
      Store.deleteStudent(id);
      this.showToast('학생 정보가 삭제되었습니다.');
      this.renderStudents();
      this.updateBadges();
    }
  },


  // --- Firebase Auth ---
  initAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
      const loggedOutUI = document.getElementById('userLoggedOut');
      const loggedInUI = document.getElementById('userLoggedIn');
      
      if (user) {
        // 로그인 성공
        Store.userId = user.uid;
        document.getElementById('userName').textContent = user.displayName || '사용자';
        document.getElementById('userEmail').textContent = user.email;
        if (user.photoURL) {
          document.getElementById('userAvatar').innerHTML = `<img src="${user.photoURL}" style="width:100%; height:100%; border-radius:50%;">`;
        }

        loggedOutUI.style.display = 'none';
        loggedInUI.style.display = 'flex';

        this.showToast(`${user.displayName}님, 환영합니다! 실시간 동기화가 활성화되었습니다. ☁️`);
        
        // 원격 데이터 불러오기
        await Store.fetchRemoteData();
        this.renderDashboard();
        this.renderConsultations();
        this.renderStudents();
      } else {
        // 로그아웃 상태
        Store.userId = null;
        loggedOutUI.style.display = 'block';
        loggedInUI.style.display = 'none';
        document.getElementById('userAvatar').innerHTML = '👤';
      }
    });
  },

  async login() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
    } catch (e) {
      console.error('Login Error:', e);
      alert('로그인에 실패했습니다. Firebase 콘솔에서 Google 로그인을 활성화했는지 확인해주세요.');
    }
  },

  async logout() {
    if (confirm('로그아웃 하시겠습니까? 데이터는 로컬에 남지만 동기화는 중단됩니다.')) {
      await firebase.auth().signOut();
      location.reload(); // 상태 초기화를 위해 새로고침
    }
  },

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  },
};

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
