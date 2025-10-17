import React, { useEffect, useState } from 'react';
import { saveCaseOffline, getAllOfflineCases, clearOfflineCases, saveResearchOffline, getAllOfflineResearch, clearOfflineResearch } from './idb';
import { apiFetch, apiPost } from './api';

function App() {
  const [email, setEmail] = useState('student@example.com');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(navigator.onLine ? 'online' : 'offline');
  
  // Case form
  const [caseForm, setCaseForm] = useState({ procedure: 'cavity', notes: '', patientAge: '' });
  
  // Research form
  const [researchForm, setResearchForm] = useState({ title: '', type: 'project', description: '', status: 'ongoing' });

  useEffect(() => {
    window.addEventListener('online', () => setStatus('online'));
    window.addEventListener('offline', () => setStatus('offline'));
    if (token) fetchDashboard();
    if (navigator.onLine && token) syncOffline();
  }, [token]);

  async function login() {
    try {
      const res = await apiFetch('/auth/login', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }) 
      }, false);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Login failed');
      }
      
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
    } catch (e) { 
      console.error('Login error:', e);
      alert('Login failed: ' + e.message);
    }
  }

  async function fetchDashboard() {
    try {
      const res = await apiFetch('/dashboard', { headers: { Authorization: `Bearer ${token}` } }, false);
      const data = await res.json();
      setDashboard(data);
    } catch (e) { console.warn('Could not fetch dashboard') }
  }

  async function addCase() {
    const payload = { ...caseForm, synced: navigator.onLine };
    if (navigator.onLine) {
      try {
        const res = await apiPost('/cases', payload, token);
        const json = await res.json();
        if (json.newBadges?.length) alert(`New badges earned: ${json.newBadges.join(', ')}!`);
        setCaseForm({ procedure: 'cavity', notes: '', patientAge: '' });
        fetchDashboard();
      } catch (e) {
        await saveCaseOffline(payload);
        alert('Saved offline');
      }
    } else {
      await saveCaseOffline(payload);
      alert('Saved offline. Will sync when online.');
      setCaseForm({ procedure: 'cavity', notes: '', patientAge: '' });
    }
  }

  async function addResearch() {
    const payload = { ...researchForm, synced: navigator.onLine };
    if (navigator.onLine) {
      try {
        await apiPost('/research', payload, token);
        setResearchForm({ title: '', type: 'project', description: '', status: 'ongoing' });
        fetchDashboard();
      } catch (e) {
        await saveResearchOffline(payload);
        alert('Saved offline');
      }
    } else {
      await saveResearchOffline(payload);
      alert('Saved offline');
      setResearchForm({ title: '', type: 'project', description: '', status: 'ongoing' });
    }
  }

  async function syncOffline() {
    const offlineCases = await getAllOfflineCases();
    const offlineResearch = await getAllOfflineResearch();
    
    for (const c of offlineCases) {
      try { await apiPost('/cases', c, token); } catch (e) { console.warn('Sync failed', e); }
    }
    
    for (const r of offlineResearch) {
      try { await apiPost('/research', r, token); } catch (e) { console.warn('Research sync failed', e); }
    }
    
    if (offlineCases.length || offlineResearch.length) {
      await clearOfflineCases();
      await clearOfflineResearch();
      fetchDashboard();
      alert('Offline data synced!');
    }
  }

  async function validateItem(type, id) {
    try {
      await apiPost(`/validate/${type}/${id}`, {}, token);
      fetchDashboard();
    } catch (e) { alert('Validation failed') }
  }

  function logout() {
    setUser(null);
    setToken('');
    setDashboard(null);
    setActiveTab('dashboard');
  }

  async function deleteCase(caseId) {
    if (!confirm('Delete this case?')) return;
    try {
      const res = await apiFetch(`/cases/${caseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        fetchDashboard();
        alert('Case deleted successfully');
      } else {
        alert('Delete failed - Status: ' + res.status);
      }
    } catch (e) { 
      console.error('Delete error:', e);
      alert('Delete failed: ' + e.message);
    }
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>🦷 Student Progress Tracker</h1>
            <p>Gamified dental education platform</p>
          </div>
          
          <div className="login-form">
            <h2>Welcome Back</h2>
            <div className="form-group">
              <label>Select Account</label>
              <select value={email} onChange={e => setEmail(e.target.value)}>
                <option value="student@example.com">👨‍🎓 Student One</option>
                <option value="student2@example.com">👩‍🎓 Student Two</option>
                <option value="teacher@example.com">👨‍🏫 Teacher</option>
              </select>
            </div>
            
            <button className="login-btn" onClick={login}>
              Login to Dashboard
            </button>
            
            <div className="login-features">
              <div className="feature">
                <span>🏆</span>
                <p>Earn badges and track progress</p>
              </div>
              <div className="feature">
                <span>📱</span>
                <p>Works offline with auto-sync</p>
              </div>
              <div className="feature">
                <span>🔬</span>
                <p>Research & project tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>🦷 Student Progress Tracker</h1>
        <div className="user-info">
          <span>{user.name} ({user.role})</span>
          <span className={`status ${status}`}>{status}</span>
          <button onClick={syncOffline}>Sync</button>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        {user.role === 'student' && (
          <>
            <button className={activeTab === 'cases' ? 'active' : ''} onClick={() => setActiveTab('cases')}>Add Case</button>
            <button className={activeTab === 'research' ? 'active' : ''} onClick={() => setActiveTab('research')}>Research</button>
            <button className={activeTab === 'leaderboard' ? 'active' : ''} onClick={() => setActiveTab('leaderboard')}>Leaderboard</button>
          </>
        )}
        {user.role === 'teacher' && (
          <button className={activeTab === 'validation' ? 'active' : ''} onClick={() => setActiveTab('validation')}>Validation</button>
        )}
      </nav>

      {activeTab === 'dashboard' && dashboard && (
        <div className="dashboard">
          {user.role === 'student' ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Quota Progress</h3>
                  <div className="progress-bar">
                    <div className="progress" style={{width: `${(dashboard.user.quota.completed / dashboard.user.quota.target) * 100}%`}}></div>
                  </div>
                  <p>{dashboard.user.quota.completed}/{dashboard.user.quota.target} cases</p>
                </div>
                <div className="stat-card">
                  <h3>Current Streak</h3>
                  <div className="streak">🔥 {dashboard.user.streaks} days</div>
                </div>
                <div className="stat-card">
                  <h3>Avatar</h3>
                  <div className="avatar">{dashboard.user.avatar === 'basic' ? '👨‍⚕️' : '🏆'}</div>
                </div>
              </div>
              
              <div className="badges">
                <h3>Badges ({dashboard.user.badges.length})</h3>
                <div className="badge-grid">
                  {dashboard.badges.map(badge => (
                    <div key={badge.id} className={`badge ${dashboard.user.badges.includes(badge.id) ? 'earned' : 'locked'}`}>
                      <span>{dashboard.user.badges.includes(badge.id) ? '🏆' : '🔒'}</span>
                      <div>
                        <strong>{badge.name}</strong>
                        <p>{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="teacher-dashboard">
              <h3>Student Progress Overview</h3>
              <div className="student-grid">
                {dashboard.students.map(student => (
                  <div key={student.id} className="student-card">
                    <h4>{student.name}</h4>
                    <div className="progress-bar">
                      <div className="progress" style={{width: `${student.progress}%`}}></div>
                    </div>
                    <p>{student.progress}% complete ({student.quota.completed}/{student.quota.target})</p>
                    <p>Cases logged: {student.cases}</p>
                    <p>Streak: {student.streaks} days</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cases' && user.role === 'student' && (
        <>
          <section className="card">
            <h2>Log New Case</h2>
            <div className="form-grid">
              <select value={caseForm.procedure} onChange={e => setCaseForm({...caseForm, procedure: e.target.value})}>
                <option value="cavity">Cavity Filling</option>
                <option value="scaling">Scaling</option>
                <option value="extraction">Extraction</option>
                <option value="crown">Crown</option>
              </select>
              <input placeholder="Patient Age" value={caseForm.patientAge} onChange={e => setCaseForm({...caseForm, patientAge: e.target.value})} />
              <textarea placeholder="Case notes" value={caseForm.notes} onChange={e => setCaseForm({...caseForm, notes: e.target.value})} />
              <button onClick={addCase}>Log Case</button>
            </div>
          </section>
          
          {dashboard?.cases?.length > 0 && (
            <section className="card">
              <h2>Your Cases ({dashboard.cases.length})</h2>
              <div className="cases-list">
                {dashboard.cases.map(c => (
                  <div key={c.id} className="case-item">
                    <div className="case-info">
                      <h4>{c.procedure} - Age {c.patientAge}</h4>
                      <p>{c.notes}</p>
                      <small>{new Date(c.createdAt).toLocaleDateString()}</small>
                      {c.validated && <span className="validated">✅ Validated</span>}
                    </div>
                    <button className="delete-btn" onClick={() => deleteCase(c.id)}>🗑️</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'research' && user.role === 'student' && (
        <section className="card">
          <h2>Research & Projects</h2>
          <div className="form-grid">
            <input placeholder="Title" value={researchForm.title} onChange={e => setResearchForm({...researchForm, title: e.target.value})} />
            <select value={researchForm.type} onChange={e => setResearchForm({...researchForm, type: e.target.value})}>
              <option value="project">Project</option>
              <option value="patent">Patent</option>
              <option value="yukti">Yukti Topic</option>
              <option value="research">Research Paper</option>
            </select>
            <select value={researchForm.status} onChange={e => setResearchForm({...researchForm, status: e.target.value})}>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="published">Published</option>
            </select>
            <textarea placeholder="Description" value={researchForm.description} onChange={e => setResearchForm({...researchForm, description: e.target.value})} />
            <button onClick={addResearch}>Add Research</button>
          </div>
          
          {dashboard?.user.research?.length > 0 && (
            <div className="research-list">
              <h3>Your Research</h3>
              {dashboard.user.research.map(r => (
                <div key={r.id} className="research-item">
                  <h4>{r.title} <span className={`status ${r.status}`}>{r.status}</span></h4>
                  <p><strong>Type:</strong> {r.type}</p>
                  <p>{r.description}</p>
                  {r.validated && <span className="validated">✅ Validated</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'leaderboard' && dashboard?.leaderboard && (
        <section className="card">
          <h2>🏆 Leaderboard</h2>
          <div className="leaderboard">
            {dashboard.leaderboard.map((student, idx) => (
              <div key={idx} className="leaderboard-item">
                <span className="rank">#{idx + 1}</span>
                <span className="name">{student.name}</span>
                <span className="score">{student.completed} cases</span>
                <span className="streak">🔥 {student.streaks}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'validation' && user.role === 'teacher' && dashboard && (
        <section className="card">
          <h2>Validation Panel</h2>
          {dashboard.students.map(student => (
            <div key={student.id} className="validation-section">
              <h3>{student.name}</h3>
              <p>Pending validations for cases and research</p>
              <button onClick={() => validateItem('case', 'latest')}>Validate Latest Case</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;
