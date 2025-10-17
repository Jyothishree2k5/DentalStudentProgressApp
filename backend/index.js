const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://dental-student-progress-app.vercel.app',
    'https://dental-student-progress-app-mvoy.vercel.app'
  ],
  credentials: true
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data structure
const initData = {
  cases: [],
  users: [
    { id: 's1', role: 'student', name: 'Student One', email: 'student@example.com', teacherId: 't1', quota: { target: 50, completed: 0 }, streaks: 0, badges: [], avatar: 'basic', research: [] },
    { id: 's2', role: 'student', name: 'Student Two', email: 'student2@example.com', teacherId: 't1', quota: { target: 50, completed: 0 }, streaks: 0, badges: [], avatar: 'basic', research: [] },
    { id: 't1', role: 'teacher', name: 'Teacher One', email: 'teacher@example.com', students: ['s1', 's2'] }
  ],
  badges: [
    { id: 'cavity_king', name: 'Cavity King', description: 'Complete 10 cavity procedures', requirement: 10, type: 'cavity' },
    { id: 'scaling_star', name: 'Scaling Star', description: 'Complete 15 scaling procedures', requirement: 15, type: 'scaling' },
    { id: 'streak_master', name: 'Streak Master', description: 'Maintain 7-day streak', requirement: 7, type: 'streak' }
  ]
};

if (!fs.existsSync(DATA_FILE)) fs.writeJsonSync(DATA_FILE, initData, { spaces: 2 });

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Student Progress API is running!', status: 'OK' });
});

app.post('/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const data = await fs.readJson(DATA_FILE);
    console.log('Available users:', data.users.map(u => u.email));
    
    const user = data.users.find(u => u.email === email);
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ error: 'Invalid email' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    console.log('Login successful for:', user.name);
    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Dashboard data
app.get('/dashboard', verifyToken, async (req, res) => {
  const data = await fs.readJson(DATA_FILE);
  const user = data.users.find(u => u.id === req.user.id);
  
  if (user.role === 'student') {
    const userCases = data.cases.filter(c => c.studentId === user.id);
    const leaderboard = data.users.filter(u => u.role === 'student')
      .map(u => ({ name: u.name, completed: u.quota.completed, streaks: u.streaks }))
      .sort((a, b) => b.completed - a.completed);
    
    res.json({ user, cases: userCases, leaderboard, badges: data.badges });
  } else {
    const students = data.users.filter(u => user.students?.includes(u.id));
    const studentProgress = students.map(s => ({
      ...s,
      cases: data.cases.filter(c => c.studentId === s.id).length,
      progress: Math.round((s.quota.completed / s.quota.target) * 100)
    }));
    res.json({ user, students: studentProgress });
  }
});

// Cases
app.get('/cases', verifyToken, async (req, res) => {
  const data = await fs.readJson(DATA_FILE);
  const cases = req.user.role === 'student' 
    ? data.cases.filter(c => c.studentId === req.user.id)
    : data.cases;
  res.json(cases);
});

app.delete('/cases/:id', verifyToken, async (req, res) => {
  try {
    console.log('Delete case request:', req.params.id, 'by user:', req.user.id);
    const data = await fs.readJson(DATA_FILE);
    const caseIndex = data.cases.findIndex(c => c.id === req.params.id && c.studentId === req.user.id);
    
    if (caseIndex === -1) {
      console.log('Case not found');
      return res.status(404).json({ error: 'Case not found' });
    }
    
    data.cases.splice(caseIndex, 1);
    
    // Update user quota
    const user = data.users.find(u => u.id === req.user.id);
    if (user && user.quota.completed > 0) {
      user.quota.completed--;
    }
    
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
    console.log('Case deleted successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/cases', verifyToken, async (req, res) => {
  const caseObj = { ...req.body, studentId: req.user.id };
  const data = await fs.readJson(DATA_FILE);
  
  caseObj.id = 'case_' + Date.now();
  caseObj.createdAt = new Date().toISOString();
  caseObj.validated = false;
  
  data.cases.push(caseObj);
  
  let newBadges = [];
  
  // Update user quota and check badges
  const user = data.users.find(u => u.id === req.user.id);
  if (user) {
    user.quota.completed++;
    user.streaks = (user.streaks || 0) + 1;
    
    // Check for new badges
    newBadges = data.badges.filter(badge => {
      if (user.badges.includes(badge.id)) return false;
      if (badge.type === 'streak' && user.streaks >= badge.requirement) return true;
      if (badge.type === caseObj.procedure && user.quota.completed >= badge.requirement) return true;
      return false;
    });
    
    newBadges.forEach(badge => user.badges.push(badge.id));
  }
  
  await fs.writeJson(DATA_FILE, data, { spaces: 2 });
  res.json({ success: true, case: caseObj, newBadges: newBadges.map(b => b.name) });
});

// Research tracking
app.get('/research', verifyToken, async (req, res) => {
  const data = await fs.readJson(DATA_FILE);
  const user = data.users.find(u => u.id === req.user.id);
  res.json(user.research || []);
});

app.post('/research', verifyToken, async (req, res) => {
  const data = await fs.readJson(DATA_FILE);
  const user = data.users.find(u => u.id === req.user.id);
  
  const research = {
    id: 'research_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    validated: false
  };
  
  if (!user.research) user.research = [];
  user.research.push(research);
  
  await fs.writeJson(DATA_FILE, data, { spaces: 2 });
  res.json({ success: true, research });
});

// Validation (teacher)
app.post('/validate/:type/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Teacher only' });
  
  const data = await fs.readJson(DATA_FILE);
  const { type, id } = req.params;
  
  if (type === 'case') {
    const caseObj = data.cases.find(c => c.id === id);
    if (caseObj) caseObj.validated = true;
  } else if (type === 'research') {
    const user = data.users.find(u => u.research?.some(r => r.id === id));
    if (user) {
      const research = user.research.find(r => r.id === id);
      if (research) research.validated = true;
    }
  }
  
  await fs.writeJson(DATA_FILE, data, { spaces: 2 });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log('Backend running on port', PORT);
});
