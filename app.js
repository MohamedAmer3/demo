// ===================================
// RETINAGUARD PWA - Main Application
// Updated to match new UI/UX design
// ===================================

// ============ CONFIGURATION ============
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
const CLOUD_API_URL = 'YOUR_FUNCTIONGRAPH_API_URL_HERE';

// Initialize Supabase Client
let supabase = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ============ STATE MANAGEMENT ============
let currentOriginalImage = null;
let currentHeatmapImage = null;
let offlineDiagnosis = '';
let specialistDiagnosis = '';
let currentUser = null; // Store logged-in user info

// ============ SERVICE WORKER REGISTRATION ============
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('✅ Service Worker registered:', reg.scope))
      .catch(err => console.error('❌ Service Worker registration failed:', err));
  });
}

// ============ SCREEN NAVIGATION ============
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
  
  // Show/hide navbar based on screen type
  const navbar = document.getElementById('main-navbar');
  const marketingScreens = ['welcome-screen', 'features-page', 'how-it-works-page', 'faq-page', 'pricing-page'];
  const authScreens = ['login-screen', 'signup-screen', 'role-selection-screen'];
  
  if (marketingScreens.includes(screenId)) {
    navbar.style.display = 'block';
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === screenId) {
        link.classList.add('active');
      }
    });
  } else if (authScreens.includes(screenId)) {
    navbar.style.display = 'none';
  } else {
    // App screens (clinician dashboard, specialist queue, etc.)
    navbar.style.display = 'none';
  }
  
  // Close mobile menu if open
  const navMenu = document.getElementById('navbar-menu');
  if (navMenu) {
    navMenu.classList.remove('active');
  }
  
  if (screenId === 'specialist-queue-screen') {
    loadCaseQueue();
  }
  
  // Scroll to top
  window.scrollTo(0, 0);
}

// ============ NAVBAR NAVIGATION ============
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    showScreen(page);
  });
});

// Get Started button (navbar)
document.getElementById('nav-get-started').addEventListener('click', () => {
  showScreen('login-screen');
});

// Logo click - go to home
document.querySelector('.navbar-logo').addEventListener('click', () => {
  showScreen('welcome-screen');
});

// Mobile menu toggle
document.getElementById('mobile-menu-toggle').addEventListener('click', () => {
  document.getElementById('navbar-menu').classList.toggle('active');
});

// ============ FAQ ACCORDION ============
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const item = question.parentElement;
    const wasActive = item.classList.contains('active');
    
    // Close all items
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    
    // Open clicked item if it wasn't active
    if (!wasActive) {
      item.classList.add('active');
    }
  });
});

// ============ PRICING TOGGLE ============
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const plan = btn.dataset.plan;
    
    // Update prices based on plan
    if (plan === 'yearly') {
      // Update to yearly prices (50% discount)
      document.querySelectorAll('.plan-price .price').forEach((price, index) => {
        if (index === 0) price.textContent = '$0'; // Free
        if (index === 1) price.textContent = '$24.50'; // Pro yearly
        if (index === 2) price.textContent = '$49.50'; // Clinic yearly
      });
      document.querySelectorAll('.plan-total').forEach((total, index) => {
        if (index === 0) total.textContent = 'Total $0 /year';
        if (index === 1) total.textContent = 'Total $294 /year';
        if (index === 2) total.textContent = 'Total $594 /year';
      });
    } else {
      // Reset to monthly prices
      document.querySelectorAll('.plan-price .price').forEach((price, index) => {
        if (index === 0) price.textContent = '$0'; // Free
        if (index === 1) price.textContent = '$49'; // Pro monthly
        if (index === 2) price.textContent = '$99'; // Clinic monthly
      });
      document.querySelectorAll('.plan-total').forEach((total, index) => {
        if (index === 0) total.textContent = 'Total $0 /year';
        if (index === 1) total.textContent = 'Total $588 /year';
        if (index === 2) total.textContent = 'Total $1,188 /year';
      });
    }
  });
});

// ============ PRICING PLAN BUTTONS ============
document.querySelectorAll('.plan-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.textContent.includes('free')) {
      showScreen('signup-screen');
    } else {
      showScreen('signup-screen');
    }
  });
});

// Check if user is logged in
function checkAuth() {
  const savedUser = localStorage.getItem('retinaguard_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    document.getElementById('user-name').textContent = currentUser.name;
    showScreen('role-selection-screen');
  } else {
    showScreen('welcome-screen');
  }
}

// ============ WELCOME SCREEN ============
document.getElementById('login-btn').addEventListener('click', () => {
  showScreen('login-screen');
});

document.getElementById('signup-btn').addEventListener('click', () => {
  showScreen('signup-screen');
});

// ============ AUTH SWITCHING ============
document.getElementById('switch-to-signup').addEventListener('click', (e) => {
  e.preventDefault();
  showScreen('signup-screen');
});

document.getElementById('switch-to-login').addEventListener('click', (e) => {
  e.preventDefault();
  showScreen('login-screen');
});

// ============ LOGIN FORM ============
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorMsg = document.getElementById('login-error');
  
  try {
    errorMsg.classList.add('hidden');
    
    if (!supabase) {
      // Mock login for testing without Supabase
      console.log('Mock login:', email);
      currentUser = {
        id: 'mock_' + Date.now(),
        email: email,
        name: email.split('@')[0],
        role: 'clinician'
      };
      localStorage.setItem('retinaguard_user', JSON.stringify(currentUser));
      document.getElementById('user-name').textContent = currentUser.name;
      showScreen('role-selection-screen');
      return;
    }
    
    // Real Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) throw error;
    
    // Get user profile from database
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    currentUser = {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || email.split('@')[0],
      role: profile?.role || 'clinician'
    };
    
    localStorage.setItem('retinaguard_user', JSON.stringify(currentUser));
    document.getElementById('user-name').textContent = currentUser.name;
    showScreen('role-selection-screen');
    
  } catch (error) {
    console.error('Login error:', error);
    errorMsg.textContent = error.message || 'Invalid email or password';
    errorMsg.classList.remove('hidden');
  }
});

// ============ SIGNUP FORM ============
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const role = document.getElementById('signup-role').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const errorMsg = document.getElementById('signup-error');
  
  try {
    errorMsg.classList.add('hidden');
    
    // Validate passwords match
    if (password !== confirm) {
      throw new Error('Passwords do not match');
    }
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    if (!supabase) {
      // Mock signup for testing without Supabase
      console.log('Mock signup:', { name, email, role });
      currentUser = {
        id: 'mock_' + Date.now(),
        email: email,
        name: name,
        role: role
      };
      localStorage.setItem('retinaguard_user', JSON.stringify(currentUser));
      document.getElementById('user-name').textContent = currentUser.name;
      showScreen('role-selection-screen');
      return;
    }
    
    // Real Supabase authentication
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password
    });
    
    if (error) throw error;
    
    // Create user profile in database
    await supabase
      .from('users')
      .insert([
        {
          id: data.user.id,
          email: email,
          name: name,
          role: role,
          created_at: new Date().toISOString()
        }
      ]);
    
    currentUser = {
      id: data.user.id,
      email: email,
      name: name,
      role: role
    };
    
    localStorage.setItem('retinaguard_user', JSON.stringify(currentUser));
    document.getElementById('user-name').textContent = currentUser.name;
    showScreen('role-selection-screen');
    
  } catch (error) {
    console.error('Signup error:', error);
    errorMsg.textContent = error.message || 'Failed to create account';
    errorMsg.classList.remove('hidden');
  }
});

// ============ LOGOUT ============
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('retinaguard_user');
    currentUser = null;
    showScreen('welcome-screen');
  } catch (error) {
    console.error('Logout error:', error);
  }
});

// ============ ROLE SELECTION ============
document.getElementById('clinician-role-btn').addEventListener('click', () => {
  showScreen('clinician-dashboard');
});

document.getElementById('specialist-role-btn').addEventListener('click', () => {
  showScreen('specialist-queue-screen');
});

// ============ START NEW SCREENING ============
document.getElementById('start-screening-btn').addEventListener('click', () => {
  // Reset state
  currentOriginalImage = null;
  currentHeatmapImage = null;
  offlineDiagnosis = '';
  specialistDiagnosis = '';
  
  // Reset UI
  document.getElementById('camera-section').classList.remove('hidden');
  document.getElementById('image-comparison-section').classList.add('hidden');
  document.getElementById('analysis-header').classList.add('hidden');
  document.getElementById('offline-result-card').classList.add('hidden');
  document.getElementById('specialist-result-card').classList.add('hidden');
  document.getElementById('get-specialist-btn').classList.add('hidden');
  document.getElementById('save-patient-btn').classList.add('hidden');
  document.getElementById('save-success').classList.add('hidden');
  document.getElementById('heatmap-box').classList.remove('show');
  
  showScreen('patient-scan-screen');
});

// ============ CAMERA CAPTURE ============
const cameraInput = document.getElementById('camera-input');
const cameraCaptureBtn = document.getElementById('camera-capture-btn');
const originalImage = document.getElementById('original-image');
const heatmapImage = document.getElementById('heatmap-image');

cameraCaptureBtn.addEventListener('click', () => {
  cameraInput.click();
});

cameraInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Read and display image
  const reader = new FileReader();
  reader.onload = async (event) => {
    currentOriginalImage = event.target.result;
    originalImage.src = currentOriginalImage;
    
    // Update UI
    document.getElementById('camera-section').classList.add('hidden');
    document.getElementById('image-comparison-section').classList.remove('hidden');
    document.getElementById('analysis-header').classList.remove('hidden');
    
    // Run offline inference
    await runOfflineInference(file);
  };
  reader.readAsDataURL(file);
});

// ============ OFFLINE AI INFERENCE ============
async function runOfflineInference(imageFile) {
  try {
    console.log('🤖 Running offline inference...');
    
    const offlineCard = document.getElementById('offline-result-card');
    const offlineText = document.getElementById('offline-result-text');
    
    offlineCard.classList.remove('hidden');
    offlineText.textContent = 'Analyzing...';

    // TODO: Day 3-4 - Add real ONNX Runtime inference
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // MOCK RESULT
    const mockResults = [
      { diagnosis: 'Possible Moderate DR', class: 'warning' },
      { diagnosis: 'Possible Severe DR', class: 'severe' },
      { diagnosis: 'No DR Detected', class: 'normal' }
    ];
    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    
    offlineDiagnosis = result.diagnosis;
    offlineText.textContent = result.diagnosis;
    offlineText.className = `result-value ${result.class}`;
    
    console.log('✅ Offline inference complete:', offlineDiagnosis);

    // Show specialist analysis card and button
    document.getElementById('specialist-result-card').classList.remove('hidden');
    
    if (navigator.onLine) {
      document.getElementById('get-specialist-btn').classList.remove('hidden');
    } else {
      document.getElementById('specialist-result-text').textContent = 
        'Offline - Connect to internet for specialist analysis';
    }

  } catch (error) {
    console.error('❌ Offline inference error:', error);
    document.getElementById('offline-result-text').textContent = 'Error processing image';
  }
}

// ============ SPECIALIST ANALYSIS ============
const getSpecialistBtn = document.getElementById('get-specialist-btn');

getSpecialistBtn.addEventListener('click', async () => {
  try {
    console.log('🌐 Requesting specialist analysis...');
    
    getSpecialistBtn.classList.add('hidden');
    const specialistText = document.getElementById('specialist-result-text');
    specialistText.textContent = 'Connecting to specialist AI...';

    // TODO: Day 5 - Connect to P1's FunctionGraph API
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // MOCK API RESPONSE
    const mockResponse = {
      label: 'CONFIRMED - SEVERE DR',
      confidence: 0.94,
      xai_heatmap: currentOriginalImage // In real version, this comes from API with heat overlay
    };

    specialistDiagnosis = mockResponse.label;
    currentHeatmapImage = mockResponse.xai_heatmap;

    // Update UI - Show heatmap comparison
    heatmapImage.src = currentHeatmapImage;
    document.getElementById('heatmap-box').classList.add('show');
    
    // Update comparison container to gradient background
    const comparisonContainer = document.querySelector('.comparison-container');
    comparisonContainer.style.background = 'linear-gradient(135deg, rgba(93, 217, 232, 0.3) 0%, rgba(61, 158, 168, 0.3) 100%)';

    // Update specialist result
    specialistText.textContent = mockResponse.label;
    specialistText.className = 'result-value severe';

    // Show save button
    document.getElementById('save-patient-btn').classList.remove('hidden');
    
    console.log('✅ Specialist analysis complete');

  } catch (error) {
    console.error('❌ Specialist analysis error:', error);
    document.getElementById('specialist-result-text').textContent = 
      'Failed to get specialist analysis. Please try again.';
    getSpecialistBtn.classList.remove('hidden');
  }
});

// ============ SAVE TO DATABASE ============
const savePatientBtn = document.getElementById('save-patient-btn');

savePatientBtn.addEventListener('click', async () => {
  try {
    console.log('💾 Saving case to database...');
    
    if (!supabase) {
      alert('⚠️ Database not configured. Add Supabase credentials in app.js');
      return;
    }

    const caseId = Math.floor(1000 + Math.random() * 9000);
    
    // TODO: Day 6 - Upload image to OBS
    const imageUrl = 'MOCK_IMAGE_URL';

    const { data, error } = await supabase
      .from('screenings')
      .insert([
        {
          case_id: caseId,
          patient_id: `P${caseId}`,
          offline_diagnosis: offlineDiagnosis,
          specialist_diagnosis: specialistDiagnosis,
          image_url: imageUrl,
          xai_heatmap: currentHeatmapImage,
          status: 'Awaiting Review',
          urgency: specialistDiagnosis.includes('SEVERE') ? 'URGENT' : 'NORMAL',
          created_at: new Date().toISOString()
        }
      ]);

    if (error) throw error;

    savePatientBtn.classList.add('hidden');
    document.getElementById('save-success').classList.remove('hidden');
    
    console.log('✅ Case saved successfully');

    setTimeout(() => {
      showScreen('clinician-dashboard');
    }, 2000);

  } catch (error) {
    console.error('❌ Save error:', error);
    alert('Failed to save case. Please try again.');
  }
});

// ============ SPECIALIST QUEUE ============
async function loadCaseQueue() {
  try {
    console.log('📊 Loading case queue...');
    
    const loading = document.getElementById('loading-queue');
    const queueList = document.getElementById('case-queue-list');
    const noMsg = document.getElementById('no-cases-msg');
    
    loading.classList.remove('hidden');
    queueList.innerHTML = '';
    noMsg.classList.add('hidden');

    if (!supabase) {
      loading.textContent = '⚠️ Database not configured';
      loading.style.color = 'rgba(255, 255, 255, 0.8)';
      return;
    }

    const { data: cases, error } = await supabase
      .from('screenings')
      .select('*')
      .order('created_at', { ascending: false });

    loading.classList.add('hidden');

    if (error) throw error;

    if (!cases || cases.length === 0) {
      noMsg.classList.remove('hidden');
      return;
    }

    cases.forEach(caseData => {
      const card = createQueueCard(caseData);
      queueList.appendChild(card);
    });

    console.log('✅ Loaded', cases.length, 'cases');

  } catch (error) {
    console.error('❌ Load queue error:', error);
    document.getElementById('loading-queue').textContent = 'Error loading cases';
  }
}

function createQueueCard(caseData) {
  const card = document.createElement('div');
  card.className = 'case-card';
  if (caseData.urgency === 'URGENT') {
    card.classList.add('urgent');
  }
  
  const diagnosis = caseData.specialist_diagnosis || caseData.offline_diagnosis;
  
  // *** FIXED TYPO AND STANDARDIZED LOGIC ***
  const severity = diagnosis.includes('Severe') || diagnosis.includes('SEVERE') ? 'SEVERE' : 
                   diagnosis.includes('Moderate') ? 'Moderate' : 'Mild';
  
  let statusIcon = '›';
  if (caseData.status === 'In Review') {
    statusIcon = '🔬';
  } else if (caseData.status === 'Revised') {
    statusIcon = '✓';
  }
  
  card.innerHTML = `
    <div class="case-info">
      <div class="case-text">
        ${caseData.urgency === 'URGENT' ? '<div class="case-main">URGENT</div>' : ''}
        <div class="case-main">CASE #${caseData.case_id} | ${severity === 'SEVERE' ? 'SEVERE' : 'AI-Flag: ' + severity}</div>
        <div class="case-status">Status: ${caseData.status}</div>
      </div>
      <div class="case-icon">${statusIcon}</div>
    </div>
  `;
  
  card.addEventListener('click', () => {
    showCaseDetail(caseData);
  });
  
  return card;
}

// ============ CASE DETAIL VIEW ============
function showCaseDetail(caseData) {
  console.log('Opening case detail:', caseData);
  
  document.getElementById('case-detail-title').textContent = `Case #${caseData.case_id}`;
  
  // Set images (use placeholders if not available)
  const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e2e8f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%2394a3b8" font-family="Arial" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E';
  
  document.getElementById('detail-original-image').src = caseData.image_url || currentOriginalImage || placeholderImg;
  document.getElementById('detail-heatmap-image').src = caseData.xai_heatmap || currentHeatmapImage || placeholderImg;
  
  const diagnosis = caseData.specialist_diagnosis || caseData.offline_diagnosis;
  
  // *** STANDARDIZED LOGIC ***
  const severity = diagnosis.includes('Severe') || diagnosis.includes('SEVERE') ? 'SEVERE' : 
                   diagnosis.includes('Moderate') ? 'MODERATE' : 'MILD';
                   
  document.getElementById('detail-diagnosis').textContent = severity;
  
  showScreen('specialist-case-detail');
}

// ============ INITIALIZATION ============
console.log('🚀 RetinaGuard PWA Initialized');
console.log('📱 Online status:', navigator.onLine ? 'Online' : 'Offline');

// Load theme preference
const savedTheme = localStorage.getItem('retinaguard_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
// *** REMOVED updateThemeIcon(savedTheme); - CSS handles this now ***

// Check authentication on load
checkAuth();

// ============ DARK MODE TOGGLE ============
// *** REMOVED updateThemeIcon function - CSS handles this now ***

const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    console.log('🔄 Switching theme from', currentTheme, 'to', newTheme);
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('retinaguard_theme', newTheme);
    // *** REMOVED updateThemeIcon(newTheme); - CSS handles this now ***
    
    // Force a repaint
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
    
    console.log('✅ Theme changed successfully to:', newTheme);
  });
} else {
  console.error('❌ Theme toggle button not found!');
}