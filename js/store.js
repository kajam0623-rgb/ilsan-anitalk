/* ================================================
   store.js - Data Management (LocalStorage)
   애니톡 학원 관리 시스템 데이터 저장/조회
   ================================================ */

const Store = {
  KEYS: {
    CONSULTATIONS: 'anitalk_consultations',
    STUDENTS: 'anitalk_students',
  },
  db: null,
  auth: null,
  userId: null,
  isInitialized: false,

  // --- Firebase Initialization ---
  async initFirebase(config) {
    if (this.isInitialized) return;
    try {
      firebase.initializeApp(config);
      this.db = firebase.firestore();
      this.auth = firebase.auth();
      this.isInitialized = true;
      console.log('Firebase Initialized');
    } catch (e) {
      console.error('Firebase Init Error:', e);
    }
  },

  // --- Utility ---
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Store._get error:', e);
      return [];
    }
  },

  _set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Store._set error:', e);
    }
  },

  // --- Consultations ---
  getConsultations() {
    return this._get(this.KEYS.CONSULTATIONS).sort((a, b) => {
      const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
      const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
      return dateB - dateA;
    });
  },

  getConsultation(id) {
    return this.getConsultations().find(c => c.id === id);
  },

  async addConsultation(data) {
    const consultation = {
      id: this._generateId(),
      type: '신규상담',
      status: '예약됨',
      createdAt: new Date().toISOString(),
      ...data,
    };

    // 로컬 저장
    const consultations = this._get(this.KEYS.CONSULTATIONS);
    consultations.push(consultation);
    this._set(this.KEYS.CONSULTATIONS, consultations);

    // Firebase 동기화
    if (this.userId && this.db) {
      await this.db.collection('users').doc(this.userId).collection('consultations').doc(consultation.id).set(consultation);
    }

    return consultation;
  },

  async updateConsultation(id, updates) {
    const consultations = this._get(this.KEYS.CONSULTATIONS);
    const idx = consultations.findIndex(c => c.id === id);
    if (idx !== -1) {
      consultations[idx] = { ...consultations[idx], ...updates };
      this._set(this.KEYS.CONSULTATIONS, consultations);

      // --- Firebase 동기화 ---
      if (this.userId && this.db) {
        await this.db.collection('users').doc(this.userId).collection('consultations').doc(id).update(updates);
      }

      // --- 학생 정보와 동기화 ---
      // ... (기존 동기화 로직 유지)
      const students = this._get(this.KEYS.STUDENTS);
      const studentIdx = students.findIndex(s => s.consultationId === id);
      if (studentIdx !== -1) {
        const studentUpdates = {};
        if (updates.name) studentUpdates.parentName = updates.name; 
        if (updates.grade) studentUpdates.grade = updates.grade;
        if (updates.className) studentUpdates.className = updates.className;
        if (updates.phone) studentUpdates.phone = updates.phone;
        if (updates.consultNote) studentUpdates.consultNote = updates.consultNote;
        
        // --- 학생 업데이트 시에도 Firebase 동기화 필요 (updateStudent 호출 대신 직접 처리) ---
        students[studentIdx] = { ...students[studentIdx], ...studentUpdates };
        this._set(this.KEYS.STUDENTS, students);
        if (this.userId && this.db) {
          await this.db.collection('users').doc(this.userId).collection('students').doc(students[studentIdx].id).update(studentUpdates);
        }
      }

      return consultations[idx];
    }
    return null;
  },

  async deleteConsultation(id) {
    const consultations = this._get(this.KEYS.CONSULTATIONS).filter(c => c.id !== id);
    this._set(this.KEYS.CONSULTATIONS, consultations);
    if (this.userId && this.db) {
      await this.db.collection('users').doc(this.userId).collection('consultations').doc(id).delete();
    }
  },

  // --- Students ---
  getStudents() {
    return this._get(this.KEYS.STUDENTS).sort((a, b) =>
      new Date(b.registeredAt) - new Date(a.registeredAt)
    );
  },

  getStudent(id) {
    return this.getStudents().find(s => s.id === id);
  },

  async addStudent(data) {
    const student = {
      id: this._generateId(),
      status: '재학',
      registeredAt: new Date().toISOString().split('T')[0],
      ...data,
    };

    const students = this._get(this.KEYS.STUDENTS);
    students.push(student);
    this._set(this.KEYS.STUDENTS, students);

    if (this.userId && this.db) {
      await this.db.collection('users').doc(this.userId).collection('students').doc(student.id).set(student);
    }
    return student;
  },

  async updateStudent(id, updates) {
    const students = this._get(this.KEYS.STUDENTS);
    const idx = students.findIndex(s => s.id === id);
    if (idx !== -1) {
      const oldStudent = students[idx];
      students[idx] = { ...oldStudent, ...updates };
      this._set(this.KEYS.STUDENTS, students);

      if (this.userId && this.db) {
        await this.db.collection('users').doc(this.userId).collection('students').doc(id).update(updates);
      }

      // --- 상담 정보와 동기화 ---
      if (oldStudent.consultationId) {
        const consultations = this._get(this.KEYS.CONSULTATIONS);
        const consultIdx = consultations.findIndex(c => c.id === oldStudent.consultationId);
        if (consultIdx !== -1) {
          const consultUpdates = {};
          if (updates.parentName) consultUpdates.name = updates.parentName;
          if (updates.grade) consultUpdates.grade = updates.grade;
          if (updates.className) consultUpdates.className = updates.className;
          if (updates.phone) consultUpdates.phone = updates.phone;
          if (updates.consultNote) consultUpdates.consultNote = updates.consultNote;

          consultations[consultIdx] = { ...consultations[consultIdx], ...consultUpdates };
          this._set(this.KEYS.CONSULTATIONS, consultations);
          if (this.userId && this.db) {
            await this.db.collection('users').doc(this.userId).collection('consultations').doc(oldStudent.consultationId).update(consultUpdates);
          }
        }
      }

      return students[idx];
    }
    return null;
  },

  async deleteStudent(id) {
    const students = this._get(this.KEYS.STUDENTS).filter(s => s.id !== id);
    this._set(this.KEYS.STUDENTS, students);
    if (this.userId && this.db) {
      await this.db.collection('users').doc(this.userId).collection('students').doc(id).delete();
    }
  },

  // --- Remote Fetching ---
  async fetchRemoteData() {
    if (!this.userId || !this.db) return;
    
    const consultsSnapshot = await this.db.collection('users').doc(this.userId).collection('consultations').get();
    const remoteConsults = consultsSnapshot.docs.map(doc => doc.data());
    this._set(this.KEYS.CONSULTATIONS, remoteConsults);

    const studentsSnapshot = await this.db.collection('users').doc(this.userId).collection('students').get();
    const remoteStudents = studentsSnapshot.docs.map(doc => doc.data());
    this._set(this.KEYS.STUDENTS, remoteStudents);
  },

  // --- Statistics ---
  getStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const today = now.toISOString().split('T')[0];

    const consultations = this.getConsultations();
    const students = this.getStudents();

    // 이번 달 상담
    const monthlyConsultations = consultations.filter(c => {
      const d = new Date(c.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // 이번 달 등록
    const monthlyRegistrations = students.filter(s => {
      const d = new Date(s.registeredAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // 오늘 상담
    const todayConsultations = consultations.filter(c => c.date === today);

    // 반별 인원
    const classCounts = {
      '고등반': students.filter(s => s.className === '고등반' && s.status === '재학').length,
      '주니어반': students.filter(s => s.className === '주니어반' && s.status === '재학').length,
      '취미반': students.filter(s => s.className === '취미반' && s.status === '재학').length,
    };

    // 전환율
    const totalConsultations = monthlyConsultations.length;
    const totalRegistrations = monthlyRegistrations.length;
    const conversionRate = totalConsultations > 0
      ? Math.round((totalRegistrations / totalConsultations) * 100)
      : 0;

    return {
      monthlyConsultations: monthlyConsultations.length,
      monthlyRegistrations: monthlyRegistrations.length,
      totalStudents: students.filter(s => s.status === '재학').length,
      conversionRate,
      todayConsultations,
      classCounts,
      recentStudents: students.slice(0, 5),
    };
  },

  // --- Calculate class days this month ---
  calculateMonthlyClasses(days, firstClassDate) {
    if (!days || days.length === 0) return 0;

    const dayMap = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = firstClassDate ? new Date(firstClassDate) : new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let count = 0;
    const current = new Date(Math.max(firstDay, new Date(year, month, 1)));

    while (current <= lastDay) {
      const dayOfWeek = current.getDay();
      if (days.some(d => dayMap[d] === dayOfWeek)) {
        if (current >= firstDay) count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  },

  // --- Sample Data (데모용) ---
  loadSampleData() {
    if (this.getConsultations().length > 0 || this.getStudents().length > 0) return;

    const sampleConsultations = [
      {
        id: 'sample1',
        date: '2026-04-14',
        time: '14:00',
        type: '신규상담',
        grade: '고1',
        className: '취미반',
        name: '조희연',
        phone: '010-8954-9597',
        parentPhone: '010-9842-9597',
        status: '등록완료',
        consultNote: '고1 자퇴생, 그림을 혼자 독학함 왕초보는 아님\n내성적임 자기 생각을 말로 표현을 잘 못함\n입시도 얘기를 해줬는데 일단 재미워주 디지털 드로잉 수업을 하고 싶어함',
        createdAt: '2026-04-14T10:00:00Z',
      },
      {
        id: 'sample2',
        date: '2026-04-15',
        time: '16:00',
        type: '신규상담',
        grade: '중2',
        className: '주니어반',
        name: '김민준',
        phone: '010-1234-5678',
        parentPhone: '010-8765-4321',
        status: '예약됨',
        consultNote: '',
        createdAt: '2026-04-14T11:00:00Z',
      },
      {
        id: 'sample3',
        date: '2026-04-12',
        time: '15:00',
        type: '신규상담',
        grade: '고2',
        className: '고등반',
        name: '박서윤',
        phone: '010-5555-7777',
        parentPhone: '010-5555-8888',
        status: '상담완료',
        consultNote: '입시 준비 목적, 기초 데생부터 시작하고 싶어함. 포트폴리오 준비 필요.',
        createdAt: '2026-04-11T09:00:00Z',
      }
    ];

    const sampleStudents = [
      {
        id: 'stu1',
        consultationId: 'sample1',
        name: '조희연',
        grade: '고1',
        className: '취미반',
        days: ['화', '목'],
        time: '18:00 - 20:00',
        firstClassDate: '2026-04-16',
        phone: '010-8954-9597',
        parentPhone: '010-9842-9597',
        registeredAt: '2026-04-14',
        consultNote: '고1 자퇴생, 그림을 혼자 독학함 왕초보는 아님\n내성적임 자기 생각을 말로 표현을 잘 못함\n입시도 얘기를 해줬는데 일단 재미워주 디지털 드로잉 수업을 하고 싶어함',
        status: '재학',
      },
      {
        id: 'stu2',
        consultationId: '',
        name: '이지훈',
        grade: '고3',
        className: '고등반',
        days: ['월', '수', '금'],
        time: '16:00 - 18:00',
        firstClassDate: '2026-03-05',
        phone: '010-2222-3333',
        parentPhone: '010-2222-4444',
        registeredAt: '2026-03-05',
        consultNote: '입시 준비, 기초 탄탄함. 포트폴리오 집중.',
        status: '재학',
      },
      {
        id: 'stu3',
        consultationId: '',
        name: '최수아',
        grade: '중1',
        className: '주니어반',
        days: ['화', '목'],
        time: '16:00 - 18:00',
        firstClassDate: '2026-03-10',
        phone: '010-6666-7777',
        parentPhone: '010-6666-8888',
        registeredAt: '2026-03-10',
        consultNote: '만화 그리기에 관심 많음. 캐릭터 디자인 위주 수업 희망.',
        status: '재학',
      },
      {
        id: 'stu4',
        consultationId: '',
        name: '정다은',
        grade: '초6',
        className: '주니어반',
        days: ['월', '수'],
        time: '14:00 - 16:00',
        firstClassDate: '2026-02-20',
        phone: '',
        parentPhone: '010-9999-1111',
        registeredAt: '2026-02-20',
        consultNote: '웹툰에 관심. 기초 드로잉부터 시작.',
        status: '재학',
      },
    ];

    this._set(this.KEYS.CONSULTATIONS, sampleConsultations);
    this._set(this.KEYS.STUDENTS, sampleStudents);
  }
};
