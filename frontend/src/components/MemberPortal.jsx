import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './MemberPortal.css';
import { useAuth } from '../context/AuthContext';
import { calculateMembershipInfo } from '../utils/membershipUtils';

const CAFE_CATEGORIES = [
  { id: 'ALL', label: 'All Items', icon: '⚡' },
  { id: 'SHAKES', label: 'Protein Shakes', icon: '🥤' },
  { id: 'PRE_WORKOUT', label: 'Pre-Workout & Energy', icon: '⚡' },
  { id: 'DIET_MEALS', label: 'Diet Meals & Bowls', icon: '🥗' },
  { id: 'SNACKS', label: 'Bars & Snacks', icon: '🍫' }
];

const MILK_OPTIONS = [
  { id: 'WATER', label: 'Water (Lean)', price: 0, protein: 0, cal: 0 },
  { id: 'SKIM', label: 'Skim Milk', price: 40, protein: 4, cal: 50 },
  { id: 'WHOLE', label: 'Whole Fresh Milk', price: 50, protein: 4, cal: 90 },
  { id: 'ALMOND', label: 'Almond Milk (Vegan)', price: 80, protein: 1, cal: 35 }
];

const ADDONS_OPTIONS = [
  { id: 'CREATINE', label: '+ 5g Creatine Monohydrate', price: 60, protein: 0, cal: 0 },
  { id: 'PEANUT_BUTTER', label: '+ 1 Spoon Peanut Butter', price: 50, protein: 4, cal: 95 },
  { id: 'OATS', label: '+ Rolled Oats (Carbs)', price: 40, protein: 3, cal: 80 },
  { id: 'CHIA', label: '+ Chia Seeds (Omega-3)', price: 40, protein: 2, cal: 50 },
  { id: 'HONEY', label: '+ Organic Raw Honey', price: 30, protein: 0, cal: 60 }
];

function MemberPortal() {
  const { user, isMember } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('WORKOUT'); // 'WORKOUT' | 'STREAKS' | 'PASS' | 'CAFE' | 'PROFILE'

  // Custom Workout System State
  const [workoutSubTab, setWorkoutSubTab] = useState('ACTIVE'); // 'ACTIVE' | 'TEMPLATES' | 'PROGRESS' | 'HISTORY'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [selectedProgressExercise, setSelectedProgressExercise] = useState('Barbell Flat Bench Press');
  const [exerciseProgressData, setExerciseProgressData] = useState(null);
  const [workoutDashboard, setWorkoutDashboard] = useState(null);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [workoutLogSuccessMsg, setWorkoutLogSuccessMsg] = useState('');
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);

  // Template Builder Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormName, setTemplateFormName] = useState('');
  const [templateFormDesc, setTemplateFormDesc] = useState('');
  const [templateFormTarget, setTemplateFormTarget] = useState('');
  const [templateFormExercises, setTemplateFormExercises] = useState([]);
  const [builderCategoryFilter, setBuilderCategoryFilter] = useState('ALL');
  const [builderSearchQuery, setBuilderSearchQuery] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Custom Exercise Modal State
  const [showAddCustomExModal, setShowAddCustomExModal] = useState(false);
  const [customExName, setCustomExName] = useState('');
  const [customExCategory, setCustomExCategory] = useState('Chest');
  const [customExTarget, setCustomExTarget] = useState('');
  const [isSavingCustomEx, setIsSavingCustomEx] = useState(false);

  // Add Exercise to Session Modal
  const [showAddExToSessionModal, setShowAddExToSessionModal] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionCategoryFilter, setSessionCategoryFilter] = useState('ALL');

  // Hydration state
  const [waterGlasses, setWaterGlasses] = useState(4);

  // Member Cafe Ordering State
  const [cafeView, setCafeView] = useState('ORDER'); // 'ORDER' | 'HISTORY'
  const [cafeProducts, setCafeProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [paymentIntent, setPaymentIntent] = useState('PAY_AT_COUNTER'); // 'PAY_AT_COUNTER' | 'MEMBER_TAB'
  const [activePreorders, setActivePreorders] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');

  // Cancel & Pickup Modal State
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [pickingUpOrder, setPickingUpOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Profile Picture Upload State
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // Customizer Modal State
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [selectedMilk, setSelectedMilk] = useState(MILK_OPTIONS[0]);
  const [selectedAddons, setSelectedAddons] = useState([]);

  // Admin & Staff Member Switcher State
  const [peopleList, setPeopleList] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(() => {
    if (user?.role === 'MEMBER' || isMember) {
      return user?.member_id || user?.user_id || '';
    }
    try {
      return localStorage.getItem('gym_admin_view_member_id') || '';
    } catch {
      return '';
    }
  });

  // Fetch people directory when Admin / Staff is viewing
  useEffect(() => {
    if (!isMember) {
      axios.get('/api/people')
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : [];
          setPeopleList(list);
          if (!selectedMemberId && list.length > 0) {
            const firstId = list[0].person_id || list[0].id;
            setSelectedMemberId(firstId);
          }
        })
        .catch(err => console.error('Error fetching people for admin switcher:', err));
    }
  }, [isMember]);

  const memberId = isMember
    ? (user?.member_id || user?.user_id)
    : (selectedMemberId || peopleList[0]?.person_id || peopleList[0]?.id || 'P-000002');
  const [gymAnalytics, setGymAnalytics] = useState(null);

  // Load member data and workout system on memberId change
  useEffect(() => {
    if (memberId) {
      fetchMemberData(memberId);
      fetchCafeProducts();
      fetchActivePreorders(memberId);
      fetchGymAnalytics();
      fetchMemberTemplates(memberId);
      fetchExerciseLibrary(memberId);
      fetchWorkoutLogs(memberId);
      fetchWorkoutDashboard(memberId);
      fetchExerciseProgress(memberId, selectedProgressExercise);

      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const savedWater = localStorage.getItem(`gym_water_${memberId}_${todayKey}`);
        if (savedWater) setWaterGlasses(parseInt(savedWater, 10));
        else setWaterGlasses(4);
      } catch {
        setWaterGlasses(4);
      }
    }

    // Auto-poll active pre-orders every 3 seconds for live kitchen updates
    const interval = setInterval(() => {
      if (memberId) {
        fetchActivePreorders(memberId);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [memberId]);

  const fetchGymAnalytics = async () => {
    try {
      const res = await axios.get('/api/analytics/dashboard');
      if (res.data) {
        setGymAnalytics(res.data);
      }
    } catch (e) {
      console.error('Error fetching gym rush analytics:', e);
    }
  };

  const fetchMemberTemplates = async (memId) => {
    try {
      const res = await axios.get(`/api/workout/templates/${memId}`);
      let list = [];
      if (res.data) {
        if (Array.isArray(res.data)) {
          list = res.data;
        } else if (res.data.templates && Array.isArray(res.data.templates)) {
          list = res.data.templates;
        }
      }
      if (list.length > 0) {
        setTemplates(list);
        if (!activeSession) {
          const firstTpl = list[0];
          setSelectedTemplateId(firstTpl.id);
          initActiveSession(firstTpl);
        }
      }
    } catch (e) {
      console.error('Error fetching workout templates:', e);
    }
  };

  const fetchExerciseLibrary = async (memId) => {
    try {
      const res = await axios.get(`/api/workout/exercises?member_id=${memId}`);
      if (res.data) {
        if (Array.isArray(res.data)) {
          setExerciseLibrary(res.data);
        } else if (res.data.exercises && Array.isArray(res.data.exercises)) {
          setExerciseLibrary(res.data.exercises);
        }
      }
    } catch (e) {
      console.error('Error fetching exercise library:', e);
    }
  };

  const fetchWorkoutLogs = async (memId) => {
    try {
      const res = await axios.get(`/api/workout/logs/${memId}`);
      if (res.data) {
        if (Array.isArray(res.data)) {
          setWorkoutLogs(res.data);
        } else if (res.data.logs && Array.isArray(res.data.logs)) {
          setWorkoutLogs(res.data.logs);
        }
      }
    } catch (e) {
      console.error('Error fetching workout logs:', e);
    }
  };

  const fetchExerciseProgress = async (memId, exName) => {
    if (!exName) return;
    try {
      const res = await axios.get(`/api/workout/exercise-progress/${memId}/${encodeURIComponent(exName)}`);
      if (res.data) {
        setExerciseProgressData(res.data);
      }
    } catch (e) {
      console.error('Error fetching exercise progress:', e);
    }
  };

  const fetchWorkoutDashboard = async (memId) => {
    try {
      const res = await axios.get(`/api/workout/dashboard/${memId}`);
      if (res.data) {
        setWorkoutDashboard(res.data);
      }
    } catch (e) {
      console.error('Error fetching workout dashboard:', e);
    }
  };

  // Initialize active workout session with template exercises & previous record lookup
  const initActiveSession = (tpl, logsList = workoutLogs) => {
    if (!tpl) return;
    setSelectedTemplateId(tpl.id);

    const newExList = (tpl.exercises || []).map((ex, exIdx) => {
      let prevBestSetDesc = '';
      let defaultWeight = 40;
      let defaultReps = 10;

      for (const log of logsList) {
        const found = log.exercises?.find(e => e.name?.toLowerCase() === ex.name?.toLowerCase());
        if (found && found.sets?.length > 0) {
          const validSets = found.sets.filter(s => s.is_completed !== false);
          if (validSets.length > 0) {
            const best = validSets.reduce((prev, curr) => (curr.weight_kg > prev.weight_kg ? curr : prev), validSets[0]);
            prevBestSetDesc = `${best.weight_kg} kg × ${best.reps} reps`;
            defaultWeight = best.weight_kg;
            defaultReps = best.reps || 10;
            break;
          }
        }
      }

      const numSets = typeof ex.target_sets === 'number' ? ex.target_sets : 3;
      const sets = Array.from({ length: numSets }, (_, sIdx) => ({
        set_num: sIdx + 1,
        weight_kg: defaultWeight,
        reps: defaultReps,
        is_completed: false
      }));

      return {
        id: `sess-ex-${exIdx}-${Date.now()}`,
        name: ex.name,
        category: ex.category || 'General',
        notes: ex.notes || '',
        prevBestDesc: prevBestSetDesc,
        sets: sets
      };
    });

    setActiveSession({
      template_id: tpl.id,
      template_name: tpl.name,
      target_muscle: tpl.target_muscle || '',
      started_at: new Date().toISOString(),
      duration_minutes: 45,
      notes: '',
      exercises: newExList
    });
  };

  const handleUpdateSet = (exIdx, setIdx, field, value) => {
    if (!activeSession) return;
    const updatedExercises = [...activeSession.exercises];
    const targetEx = { ...updatedExercises[exIdx] };
    const updatedSets = [...targetEx.sets];
    const targetSet = { ...updatedSets[setIdx] };

    if (field === 'weight_kg') {
      targetSet.weight_kg = parseFloat(value) || 0;
    } else if (field === 'reps') {
      targetSet.reps = parseInt(value, 10) || 0;
    } else if (field === 'is_completed') {
      targetSet.is_completed = !targetSet.is_completed;
    }

    updatedSets[setIdx] = targetSet;
    targetEx.sets = updatedSets;
    updatedExercises[exIdx] = targetEx;

    setActiveSession({
      ...activeSession,
      exercises: updatedExercises
    });
  };

  const handleAddSet = (exIdx) => {
    if (!activeSession) return;
    const updatedExercises = [...activeSession.exercises];
    const targetEx = { ...updatedExercises[exIdx] };
    const lastSet = targetEx.sets[targetEx.sets.length - 1] || { weight_kg: 40, reps: 10 };

    targetEx.sets = [
      ...targetEx.sets,
      {
        set_num: targetEx.sets.length + 1,
        weight_kg: lastSet.weight_kg,
        reps: lastSet.reps,
        is_completed: false
      }
    ];

    updatedExercises[exIdx] = targetEx;
    setActiveSession({ ...activeSession, exercises: updatedExercises });
  };

  const handleRemoveSet = (exIdx, setIdx) => {
    if (!activeSession) return;
    const updatedExercises = [...activeSession.exercises];
    const targetEx = { ...updatedExercises[exIdx] };
    if (targetEx.sets.length <= 1) return;

    targetEx.sets = targetEx.sets.filter((_, i) => i !== setIdx).map((s, idx) => ({ ...s, set_num: idx + 1 }));
    updatedExercises[exIdx] = targetEx;
    setActiveSession({ ...activeSession, exercises: updatedExercises });
  };

  const handleAddExerciseToSession = (exObj) => {
    if (!activeSession) return;
    const newEx = {
      id: `sess-ex-${Date.now()}`,
      name: exObj.name,
      category: exObj.category || 'General',
      notes: '',
      prevBestDesc: '',
      sets: [
        { set_num: 1, weight_kg: 40, reps: 10, is_completed: false },
        { set_num: 2, weight_kg: 40, reps: 10, is_completed: false },
        { set_num: 3, weight_kg: 40, reps: 10, is_completed: false }
      ]
    };
    setActiveSession({
      ...activeSession,
      exercises: [...activeSession.exercises, newEx]
    });
    setShowAddExToSessionModal(false);
  };

  const handleRemoveExerciseFromSession = (exIdx) => {
    if (!activeSession) return;
    const filtered = activeSession.exercises.filter((_, i) => i !== exIdx);
    setActiveSession({ ...activeSession, exercises: filtered });
  };

  const handleSaveCompletedWorkout = async () => {
    if (!activeSession) return;
    setIsSavingWorkout(true);
    try {
      const payload = {
        template_id: activeSession.template_id,
        template_name: activeSession.template_name,
        date: new Date().toISOString().slice(0, 10),
        duration_minutes: activeSession.duration_minutes || 45,
        notes: activeSession.notes || '',
        exercises: activeSession.exercises.map(ex => ({
          name: ex.name,
          category: ex.category,
          notes: ex.notes,
          sets: ex.sets
        }))
      };

      const res = await axios.post(`/api/workout/logs/${memberId}`, payload);
      if (res.data && res.data.status === 'success') {
        const totalVol = res.data.log?.total_volume_kg || 0;
        setWorkoutLogSuccessMsg(`🎉 Workout "${activeSession.template_name}" Logged! Volume Lifted: ${totalVol.toLocaleString()} kg.`);
        fetchWorkoutLogs(memberId);
        fetchWorkoutDashboard(memberId);
        fetchExerciseProgress(memberId, selectedProgressExercise);
        setTimeout(() => setWorkoutLogSuccessMsg(''), 8000);
      }
    } catch (err) {
      console.error('Error saving workout session:', err);
      alert('Failed to log workout session. Please try again.');
    } finally {
      setIsSavingWorkout(false);
    }
  };

  // Template Builder Handlers
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateFormName('');
    setTemplateFormDesc('');
    setTemplateFormTarget('');
    setTemplateFormExercises([]);
    setBuilderSearchQuery('');
    setBuilderCategoryFilter('ALL');
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl) => {
    setEditingTemplate(tpl);
    setTemplateFormName(tpl.name);
    setTemplateFormDesc(tpl.description || '');
    setTemplateFormTarget(tpl.target_muscle || '');
    setTemplateFormExercises(tpl.exercises ? [...tpl.exercises] : []);
    setBuilderSearchQuery('');
    setBuilderCategoryFilter('ALL');
    setIsTemplateModalOpen(true);
  };

  const handleToggleExerciseInTemplate = (ex) => {
    const exists = templateFormExercises.some(e => e.name.toLowerCase() === ex.name.toLowerCase());
    if (exists) {
      setTemplateFormExercises(templateFormExercises.filter(e => e.name.toLowerCase() !== ex.name.toLowerCase()));
    } else {
      setTemplateFormExercises([
        ...templateFormExercises,
        {
          name: ex.name,
          category: ex.category || 'General',
          target_sets: ex.default_sets || 3,
          target_reps: ex.default_reps || '10-12',
          notes: ''
        }
      ]);
    }
  };

  const handleReorderTemplateExercise = (idx, direction) => {
    const newArr = [...templateFormExercises];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;
    const temp = newArr[idx];
    newArr[idx] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setTemplateFormExercises(newArr);
  };

  const handleSaveTemplateModal = async () => {
    if (!templateFormName.trim()) {
      alert('Please enter a template name.');
      return;
    }
    if (templateFormExercises.length === 0) {
      alert('Please select at least one exercise for this template.');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const payload = {
        id: editingTemplate ? editingTemplate.id : undefined,
        name: templateFormName.trim(),
        description: templateFormDesc.trim(),
        target_muscle: templateFormTarget.trim() || 'Custom Routine',
        icon: '⚡',
        exercises: templateFormExercises
      };

      const res = await axios.post(`/api/workout/templates/${memberId}`, payload);
      if (res.data && res.data.status === 'success') {
        fetchMemberTemplates(memberId);
        setIsTemplateModalOpen(false);
        setEditingTemplate(null);
        setTemplateFormName('');
        setTemplateFormExercises([]);
      }
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tplId) => {
    if (!window.confirm('Are you sure you want to delete this custom workout template?')) return;
    try {
      await axios.delete(`/api/workout/templates/${memberId}/${tplId}`);
      fetchMemberTemplates(memberId);
      if (selectedTemplateId === tplId) {
        setSelectedTemplateId('');
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Failed to delete template.');
    }
  };

  const handleSaveCustomExercise = async () => {
    if (!customExName.trim()) {
      alert('Please enter an exercise name.');
      return;
    }
    setIsSavingCustomEx(true);
    try {
      const res = await axios.post('/api/workout/custom-exercise', {
        member_id: memberId,
        name: customExName.trim(),
        category: customExCategory,
        target: customExTarget.trim() || 'Custom Muscle Group'
      });
      if (res.data && res.data.status === 'success') {
        fetchExerciseLibrary(memberId);
        setShowAddCustomExModal(false);
        setCustomExName('');
        setCustomExTarget('');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to add custom exercise.';
      alert(msg);
    } finally {
      setIsSavingCustomEx(false);
    }
  };

  const handleWaterClick = (glassIdx) => {
    const newVal = glassIdx === waterGlasses ? glassIdx - 1 : glassIdx;
    const safeVal = Math.max(0, Math.min(8, newVal));
    setWaterGlasses(safeVal);
    try {
      const todayKey = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`gym_water_${memberId}_${todayKey}`, safeVal.toString());
    } catch (e) {
      console.error(e);
    }
  };

  const renderProgressChart = () => {
    if (!exerciseProgressData || !exerciseProgressData.progress_points || exerciseProgressData.progress_points.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📊</span>
          <strong>No workout logs found yet for "{selectedProgressExercise}".</strong>
          <p style={{ fontSize: '0.84rem', marginTop: '0.3rem' }}>
            Complete an active workout session including this exercise to see your weight overload progression and visual chart!
          </p>
        </div>
      );
    }

    const points = exerciseProgressData.progress_points;
    const maxWeight = Math.max(...points.map(p => p.max_weight_kg), 10);
    const minWeight = Math.min(...points.map(p => p.max_weight_kg), 0);
    const yMax = Math.ceil((maxWeight * 1.15) / 10) * 10;
    const yMin = Math.max(0, Math.floor((minWeight * 0.8) / 10) * 10);

    const svgWidth = 640;
    const svgHeight = 220;
    const padL = 45;
    const padR = 25;
    const padT = 20;
    const padB = 35;
    const chartW = svgWidth - padL - padR;
    const chartH = svgHeight - padT - padB;

    const coords = points.map((p, idx) => {
      const x = points.length === 1 
        ? padL + chartW / 2 
        : padL + (idx / (points.length - 1)) * chartW;
      const weightRange = (yMax - yMin) || 1;
      const y = padT + chartH - ((p.max_weight_kg - yMin) / weightRange) * chartH;
      return { x, y, data: p };
    });

    const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');
    const areaPoints = points.length > 1
      ? `${coords[0].x},${padT + chartH} ${polylinePoints} ${coords[coords.length - 1].x},${padT + chartH}`
      : `${coords[0].x - 40},${padT + chartH} ${coords[0].x},${coords[0].y} ${coords[0].x + 40},${padT + chartH}`;

    return (
      <div className="svg-chart-wrapper">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const yVal = padT + chartH * (1 - ratio);
            const labelVal = Math.round(yMin + (yMax - yMin) * ratio);
            return (
              <g key={i}>
                <line x1={padL} y1={yVal} x2={svgWidth - padR} y2={yVal} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <text x={padL - 8} y={yVal + 3} fill="#64748b" fontSize="10" textAnchor="end" fontWeight="600">{labelVal}kg</text>
              </g>
            );
          })}

          {/* Area Fill */}
          <polygon points={areaPoints} fill="url(#progGrad)" />

          {/* Line Path */}
          {points.length > 1 && (
            <polyline fill="none" stroke="url(#lineGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={polylinePoints} />
          )}

          {/* Data Points */}
          {coords.map((c, idx) => {
            const isLatest = idx === coords.length - 1;
            const isPr = c.data.max_weight_kg === exerciseProgressData.pr_max_weight_kg;
            return (
              <g key={idx} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredChartPoint(c)} onMouseLeave={() => setHoveredChartPoint(null)}>
                {isPr && (
                  <circle cx={c.x} cy={c.y} r="12" fill="rgba(245, 158, 11, 0.25)" stroke="#f59e0b" strokeWidth="1.5" />
                )}
                <circle cx={c.x} cy={c.y} r={isLatest || isPr ? 6 : 4.5} fill={isPr ? '#fbbf24' : '#38bdf8'} stroke="#ffffff" strokeWidth="2" />
                <text x={c.x} y={svgHeight - 10} fill="#94a3b8" fontSize="9.5" textAnchor="middle" fontWeight="600">
                  {c.data.date?.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredChartPoint && (
          <div style={{
            position: 'absolute',
            left: `${(hoveredChartPoint.x / svgWidth) * 100}%`,
            top: `${(hoveredChartPoint.y / svgHeight) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #8b5cf6',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
            fontSize: '0.78rem'
          }}>
            <strong style={{ color: 'var(--c-slate, #344054)' }}>{hoveredChartPoint.data.date}</strong>
            <div style={{ color: 'var(--c-mocha, #875F45)', fontWeight: 800, fontSize: '0.9rem' }}>
              Max: {hoveredChartPoint.data.max_weight_kg} kg
            </div>
            <div style={{ color: 'var(--text-secondary, #475467)', fontSize: '0.72rem' }}>
              {hoveredChartPoint.data.sets_count} Sets • {hoveredChartPoint.data.total_reps} Reps
            </div>
          </div>
        )}
      </div>
    );
  };

  const fetchMemberData = async (memId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/people/${memId}/profile`);
      if (res.data && (res.data.status === 'success' || res.data.person)) {
        setProfileData(res.data);
      }
    } catch (e) {
      console.error('Error fetching member portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCafeProducts = async () => {
    try {
      const res = await axios.get('/api/cafe/products');
      if (res.data && res.data.products) {
        setCafeProducts(res.data.products.filter(p => p.is_active !== false));
      }
    } catch (e) {
      console.error('Error fetching cafe products:', e);
    }
  };

  const fetchActivePreorders = async (memId) => {
    try {
      const res = await axios.get(`/api/cafe/members/${memId}/active-preorders`);
      if (res.data && res.data.active_orders) {
        setActivePreorders(res.data.active_orders);
      }
    } catch (e) {
      // Silently catch polling
    }
  };

  // Cart Management
  const handleOpenCustomizer = (prod) => {
    setCustomizingProduct(prod);
    setSelectedMilk(MILK_OPTIONS[0]);
    setSelectedAddons([]);
  };

  const handleToggleAddon = (addon) => {
    if (selectedAddons.some(a => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleAddCustomizedToCart = () => {
    if (!customizingProduct) return;
    const milkPrice = selectedMilk.price || 0;
    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = customizingProduct.price + milkPrice + addonsPrice;

    const extraProtein = (selectedMilk.protein || 0) + selectedAddons.reduce((sum, a) => sum + a.protein, 0);
    const extraCal = (selectedMilk.cal || 0) + selectedAddons.reduce((sum, a) => sum + a.cal, 0);

    const addonLabels = [
      `Base: ${selectedMilk.label}`,
      ...selectedAddons.map(a => a.label)
    ];

    const cartItem = {
      cart_id: `${customizingProduct.id}-${Date.now()}`,
      product_id: customizingProduct.id,
      name: customizingProduct.name,
      qty: 1,
      unit_price: unitPrice,
      protein_g: (customizingProduct.protein_g || 0) + extraProtein,
      calories: (customizingProduct.calories || 0) + extraCal,
      addons: addonLabels,
      item_total: unitPrice
    };

    setCart([...cart, cartItem]);
    setCustomizingProduct(null);
  };

  const handleAddSimpleToCart = (prod) => {
    const existing = cart.find(c => c.product_id === prod.id && (!c.addons || c.addons.length === 0));
    if (existing) {
      setCart(cart.map(c => c.cart_id === existing.cart_id ? {
        ...c,
        qty: c.qty + 1,
        item_total: (c.qty + 1) * c.unit_price
      } : c));
    } else {
      setCart([...cart, {
        cart_id: `${prod.id}-${Date.now()}`,
        product_id: prod.id,
        name: prod.name,
        qty: 1,
        unit_price: prod.price,
        protein_g: prod.protein_g || 0,
        calories: prod.calories || 0,
        addons: [],
        item_total: prod.price
      }]);
    }
  };

  const handleUpdateCartQty = (cartId, delta) => {
    setCart(cart.map(c => {
      if (c.cart_id === cartId) {
        const newQty = c.qty + delta;
        return newQty > 0 ? { ...c, qty: newQty, item_total: newQty * c.unit_price } : null;
      }
      return c;
    }).filter(Boolean));
  };

  const cartSubtotal = cart.reduce((sum, itm) => sum + itm.item_total, 0);

  const handlePlacePreOrder = async () => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    setOrderSuccessMsg('');

    try {
      const payload = {
        person_id: memberId,
        customer_name: person.name || user?.name || 'Member',
        customer_phone: person.phone || '',
        items: cart,
        subtotal: cartSubtotal,
        discount: 0,
        total_amount: cartSubtotal,
        payment_intent: paymentIntent,
        notes: `Pre-ordered via Member Portal (${paymentIntent === 'MEMBER_TAB' ? 'Charge Khata Tab' : 'Pay at Counter'})`
      };

      const res = await axios.post('/api/cafe/orders/pre-order', payload);
      if (res.data && res.data.status === 'success') {
        setCart([]);
        setOrderSuccessMsg(`✓ Order #${res.data.order?.id} placed! Please confirm / pay at the front desk.`);
        fetchActivePreorders(memberId);
        fetchMemberData(memberId);
        setTimeout(() => setOrderSuccessMsg(''), 6000);
      }
    } catch (err) {
      alert('Failed to place pre-order: ' + (err.response?.data?.detail || err.message));
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCancelOrderConfirm = async () => {
    if (!cancellingOrder) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await axios.post(`/api/cafe/orders/${cancellingOrder.id}/cancel`);
      if (res.data && res.data.status === 'success') {
        setOrderSuccessMsg(`Order #${cancellingOrder.id} has been cancelled.`);
        setCancellingOrder(null);
        fetchActivePreorders(memberId);
        fetchMemberData(memberId);
        setTimeout(() => setOrderSuccessMsg(''), 6000);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unable to cancel order. Please try again.';
      setActionError(msg);
      fetchActivePreorders(memberId);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickupOrderConfirm = async () => {
    if (!pickingUpOrder) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await axios.post(`/api/cafe/orders/${pickingUpOrder.id}/pickup`);
      if (res.data && res.data.status === 'success') {
        setOrderSuccessMsg(`Order #${pickingUpOrder.id} marked as picked up.`);
        setPickingUpOrder(null);
        fetchActivePreorders(memberId);
        fetchMemberData(memberId);
        setTimeout(() => setOrderSuccessMsg(''), 6000);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unable to confirm pickup. Please try again.';
      setActionError(msg);
      fetchActivePreorders(memberId);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExt = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!validTypes.includes(file.type) && !hasValidExt) {
      alert('Invalid file format. Please select a JPG, PNG, or WEBP image.');
      return;
    }

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(`Image size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB limit. Please select a smaller photo.`);
      return;
    }

    setSelectedPhotoFile(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreviewUrl(preview);
    setPhotoError('');
    e.target.value = '';
  };

  const handleSaveProfilePicture = async () => {
    if (!selectedPhotoFile) return;
    setPhotoUploading(true);
    setPhotoError('');

    const formData = new FormData();
    formData.append('file', selectedPhotoFile);

    try {
      const res = await axios.post(`/api/people/${memberId}/profile-picture`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.status === 'success') {
        const newTs = Date.now();
        setAvatarTimestamp(newTs);
        window.dispatchEvent(new CustomEvent('profile-picture-updated', { detail: { timestamp: newTs } }));
        setPhotoSuccessMsg('Profile picture updated successfully.');
        if (photoPreviewUrl) {
          URL.revokeObjectURL(photoPreviewUrl);
        }
        setSelectedPhotoFile(null);
        setPhotoPreviewUrl(null);
        fetchMemberData(memberId);
        setTimeout(() => setPhotoSuccessMsg(''), 6000);
      } else {
        setPhotoError(res.data?.message || 'Unable to update profile picture. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unable to update profile picture. Please try again.';
      setPhotoError(msg);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCancelPhotoPreview = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoError('');
  };

  const person = profileData?.person || {};
  const membership = profileData?.membership;
  const metrics = profileData?.metrics || {};
  const cafeMetrics = profileData?.cafe_metrics || {};

  const memInfo = calculateMembershipInfo(membership);
  const hasActivePass = !!membership && (membership.status === 'ACTIVE' || membership.status === 'FROZEN');

  const filteredProducts = selectedCategory === 'ALL'
    ? cafeProducts
    : cafeProducts.filter(p => p.category === selectedCategory);

  const currentHour = new Date().getHours();
  const hourlyRushList = gymAnalytics?.hourly_rush || [];
  const currentHourData = hourlyRushList.find(h => h.hour === currentHour) || { intensity: 'quiet', count: 0, label: `${currentHour}:00` };
  const peakRushLabel = gymAnalytics?.kpis?.peak_rush_window || '06:00 PM - 08:00 PM';
  const todayAttendanceCount = gymAnalytics?.kpis?.today_attendance || 0;

  return (
    <div className="portal-container">
      {/* Staff & Admin Member Switcher Bar */}
      {!isMember && (
        <div style={{
          background: '#FFFFFF',
          border: '2px solid var(--c-mocha, #875F45)',
          borderRadius: 'var(--radius-lg, 18px)',
          padding: '0.9rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem',
          boxShadow: '0 4px 16px rgba(135, 95, 69, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <div>
              <h4 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '0.96rem', fontWeight: 800 }}>
                Staff & Admin Mode: Member Portal Inspector
              </h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #667085)' }}>
                Select any gym member below to inspect or manage their personalized workout logs, pass & orders.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--c-slate, #344054)' }}>
              Viewing Member:
            </label>
            <select
              value={memberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                try {
                  localStorage.setItem('gym_admin_view_member_id', e.target.value);
                } catch {}
              }}
              style={{
                background: 'var(--c-sand-light, #FAF8F5)',
                border: '1.5px solid var(--c-sand, #D8D2C8)',
                color: 'var(--c-slate, #344054)',
                borderRadius: 'var(--radius-md, 12px)',
                padding: '7px 14px',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '220px'
              }}
            >
              {peopleList.map(p => {
                const pId = p.person_id || p.id;
                return (
                  <option key={pId} value={pId}>
                    {p.name} ({pId})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#FFFFFF',
        border: '1.5px solid var(--c-sand, #D8D2C8)',
        borderRadius: 'var(--radius-lg, 18px)',
        boxShadow: '0 2px 10px rgba(52, 64, 84, 0.04)',
        padding: '1rem 1.5rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.4rem' }}>🏋️</span>
          <div>
            <h3 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '1.05rem', fontWeight: 800 }}>
              Welcome, {person.name || user?.name || 'Gym Member'}!
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
              Your Private Fitness Dashboard & Daily Workout Planner
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--c-mocha, #875F45)', fontWeight: 700 }}>
          Member ID: {memberId}
        </div>
      </div>

      {/* Success Notification Banner */}
      {photoSuccessMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1.5px solid var(--success)',
          color: 'var(--success)',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
        }}>
          <span>✓</span>
          <span>{photoSuccessMsg}</span>
        </div>
      )}

      {/* Hero ID Banner */}
      <div className="digital-id-hero">
        <div className="hero-left">
          <div 
            className="member-avatar-wrapper profile-avatar-interactive"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Click to change profile picture"
          >
            <div className="member-avatar-box">
              {person.person_id || person.id ? (
                <img 
                  src={`/api/face-crops/${person.person_id || person.id}.jpg?t=${avatarTimestamp}`} 
                  alt={person.name || 'Member'} 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : null}
              <span>{(person.name || user?.name || 'M').charAt(0).toUpperCase()}</span>
            </div>
            <div className="avatar-edit-badge" title="Change Profile Picture">
              📷
            </div>
          </div>

          <div className="hero-info-group">
            <h1>{person.name || user?.name || 'Member'}</h1>
            <p className="hero-id-subtitle">
              <span>Member ID: <strong style={{ color: 'var(--c-mocha, #875F45)' }}>{memberId}</strong></span>
              <span className="hero-sub-dot">•</span>
              <span style={{ color: 'var(--text-secondary, #475467)', fontWeight: 600 }}>Verified Gym Member</span>
            </p>
            
            <div className="hero-badges-row">
              <span className={`status-pill-badge-mini ${hasActivePass ? 'active' : 'expired'}`}>
                {hasActivePass ? memInfo.label : (membership?.status === 'EXPIRED' ? 'EXPIRED PASS' : 'NO ACTIVE PASS')}
              </span>
              <span className="prod-category-tag" style={hasActivePass ? { color: 'var(--c-mocha, #875F45)', background: 'rgba(59, 130, 246, 0.2)' } : { color: '#f87171', background: 'rgba(239, 68, 68, 0.15)' }}>
                {hasActivePass ? (membership.plan_name || 'Active Pass') : 'No Pass Issued'}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-right-metrics">
          <div className="metric-pill-box">
            <div className="num" style={{ color: '#f59e0b' }}>🔥 {metrics.current_streak || 0}</div>
            <div className="label">Day Streak</div>
          </div>
          <div className="metric-pill-box">
            <div className="num" style={{ color: 'var(--c-mocha, #875F45)' }}>{metrics.visits_this_month || 0}</div>
            <div className="label">Month Visits</div>
          </div>
          <div className="metric-pill-box">
            <div className="num" style={{ color: '#10b981' }}>~{cafeMetrics.total_protein_g || 0}g</div>
            <div className="label">Protein Fuel</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="portal-tabs-nav">
        <button 
          className={`portal-tab-btn ${activeTab === 'WORKOUT' ? 'active' : ''}`}
          onClick={() => setActiveTab('WORKOUT')}
        >
          🏋️ Daily Workout & PRs
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'STREAKS' ? 'active' : ''}`}
          onClick={() => setActiveTab('STREAKS')}
        >
          🔥 Streaks & Attendance
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'PASS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PASS')}
        >
          💳 My Membership Pass
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'CAFE' ? 'active' : ''}`}
          onClick={() => setActiveTab('CAFE')}
        >
          🥤 Order Cafe & Nutrition {activePreorders.length > 0 && `(${activePreorders.length} Active)`}
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'PROFILE' ? 'active' : ''}`}
          onClick={() => setActiveTab('PROFILE')}
        >
          👤 My Profile
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading your member portal data...
          </div>
        ) : (
          <>
            {/* TAB 1: CUSTOM WORKOUT PLANNER & PROGRESS TRACKER */}
            {activeTab === 'WORKOUT' && (
              <div className="workout-tab-container">
                {/* Workout Success Toast */}
                {workoutLogSuccessMsg && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1.5px solid var(--success)',
                    color: 'var(--success)',
                    padding: '0.9rem 1.25rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>✓</span>
                    <span>{workoutLogSuccessMsg}</span>
                  </div>
                )}

                {/* Sub-Navigation Tabs */}
                <div className="workout-subnav">
                  <button
                    className={`workout-subnav-btn ${workoutSubTab === 'ACTIVE' ? 'active' : ''}`}
                    onClick={() => setWorkoutSubTab('ACTIVE')}
                  >
                    <span>🏋️</span>
                    <span>Active Workout & Logger</span>
                  </button>
                  <button
                    className={`workout-subnav-btn ${workoutSubTab === 'TEMPLATES' ? 'active' : ''}`}
                    onClick={() => setWorkoutSubTab('TEMPLATES')}
                  >
                    <span>📋</span>
                    <span>My Workout Templates ({templates.length})</span>
                  </button>
                  <button
                    className={`workout-subnav-btn ${workoutSubTab === 'PROGRESS' ? 'active' : ''}`}
                    onClick={() => {
                      setWorkoutSubTab('PROGRESS');
                      fetchExerciseProgress(memberId, selectedProgressExercise);
                    }}
                  >
                    <span>📈</span>
                    <span>Exercise Progress & Charts</span>
                  </button>
                  <button
                    className={`workout-subnav-btn ${workoutSubTab === 'HISTORY' ? 'active' : ''}`}
                    onClick={() => {
                      setWorkoutSubTab('HISTORY');
                      fetchWorkoutLogs(memberId);
                    }}
                  >
                    <span>📜</span>
                    <span>Workout History ({workoutLogs.length})</span>
                  </button>
                </div>

                {/* Top Quick Stats Bar */}
                <div className="workout-hero-stats">
                  <div className="workout-hero-stat-card">
                    <div className="workout-stat-icon" style={{ background: 'var(--c-mocha-light, #F5EBE6)', color: 'var(--c-mocha, #875F45)' }}>
                      🏋️
                    </div>
                    <div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>Total Workouts</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-slate, #344054)' }}>
                        {workoutDashboard?.total_workouts_logged || workoutLogs.length || 0} Sessions
                      </div>
                    </div>
                  </div>

                  <div className="workout-hero-stat-card">
                    <div className="workout-stat-icon" style={{ background: 'var(--c-sage-light, #EFF4EE)', color: 'var(--c-sage-dark, #3B5A3C)' }}>
                      ⚡
                    </div>
                    <div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>Active Routine</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-mocha, #875F45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeSession ? activeSession.template_name : 'Custom Training'}
                      </div>
                    </div>
                  </div>

                  <div className="workout-hero-stat-card">
                    <div className="workout-stat-icon" style={{ background: 'var(--c-mocha-light, #F5EBE6)', color: 'var(--c-mocha, #875F45)' }}>
                      🔥
                    </div>
                    <div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>Volume Lifted</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                        {(workoutDashboard?.all_time_volume_kg || 0).toLocaleString()} kg
                      </div>
                    </div>
                  </div>

                  <div className="workout-hero-stat-card">
                    <div className="workout-stat-icon" style={{ background: 'var(--c-sand-light, #FAF8F5)', color: '#B45309' }}>
                      🏆
                    </div>
                    <div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>Top PR Record</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>
                        {workoutDashboard?.top_prs?.[0] ? `${workoutDashboard.top_prs[0].weight_kg} kg` : '90 kg'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ---------------- SUBTAB 1: ACTIVE WORKOUT & LOGGER ---------------- */}
                {workoutSubTab === 'ACTIVE' && (
                  <>
                    {/* Template Switcher Header */}
                    <div className="template-picker-banner">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>
                          Select Routine / Workout Split:
                        </span>
                        <div className="template-chips-row">
                          {templates.map(tpl => (
                            <button
                              key={tpl.id}
                              className={`template-chip ${selectedTemplateId === tpl.id ? 'active' : ''}`}
                              onClick={() => initActiveSession(tpl)}
                            >
                              <span>{tpl.icon || '⚡'}</span>
                              <span>{tpl.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button
                          onClick={handleOpenCreateTemplate}
                          style={{
                            background: 'rgba(139, 92, 246, 0.2)',
                            border: '1.5px dashed #8b5cf6',
                            color: 'var(--c-mocha, #875F45)',
                            padding: '0.5rem 0.95rem',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          + Create New Template
                        </button>
                      </div>
                    </div>

                    {/* Active Workout Layout */}
                    <div className="workout-layout-grid">
                      {/* Left Column: Exercises & Set Inputs */}
                      <div className="exercise-list-wrapper">
                        {(!activeSession || !activeSession.exercises || activeSession.exercises.length === 0) ? (
                          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-background)', borderRadius: '14px', color: 'var(--text-muted)' }}>
                            <p>No template selected. Choose a template above or create your own custom workout!</p>
                            <button className="portal-action-btn" onClick={handleOpenCreateTemplate} style={{ marginTop: '0.5rem' }}>
                              + Create Custom Workout Template
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <h3 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '1.15rem', fontWeight: 800 }}>
                                  🏋️ {activeSession.template_name}
                                </h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #667085)' }}>
                                  {activeSession.target_muscle || 'Custom Training'} • {activeSession.exercises.length} Exercises
                                </span>
                              </div>

                              <button
                                onClick={() => setShowAddExToSessionModal(true)}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid #38bdf8',
                                  color: 'var(--c-mocha, #875F45)',
                                  padding: '0.45rem 0.85rem',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                + Add Exercise to Session
                              </button>
                            </div>

                            {activeSession.exercises.map((ex, exIdx) => {
                              const isAllSetsCompleted = ex.sets?.length > 0 && ex.sets.every(s => s.is_completed);

                              return (
                                <div key={ex.id || exIdx} className={`session-exercise-card ${isAllSetsCompleted ? 'all-done' : ''}`}>
                                  <div className="exercise-header-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <span style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        background: isAllSetsCompleted ? '#10b981' : 'var(--bg-tertiary)',
                                        color: 'var(--c-slate, #344054)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        flexShrink: 0
                                      }}>
                                        {isAllSetsCompleted ? '✓' : exIdx + 1}
                                      </span>
                                      <h4 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '1.02rem', fontWeight: 800 }}>
                                        {ex.name}
                                      </h4>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {ex.prevBestDesc ? (
                                        <span className="previous-record-tag" title="Your performance in the previous logged workout">
                                          ⚡ Previous: {ex.prevBestDesc}
                                        </span>
                                      ) : null}
                                      <span className="exercise-target-badge">{ex.category || 'General'}</span>
                                      <button
                                        onClick={() => handleRemoveExerciseFromSession(exIdx)}
                                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px 4px', fontSize: '0.9rem' }}
                                        title="Remove exercise from this workout"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>

                                  {/* Sets Table */}
                                  <div className="sets-table-wrapper">
                                    <table className="sets-table">
                                      <thead>
                                        <tr>
                                          <th style={{ width: '60px' }}>Set</th>
                                          <th>Weight (kg)</th>
                                          <th>Reps</th>
                                          <th style={{ width: '110px', textAlign: 'center' }}>Complete</th>
                                          <th style={{ width: '40px' }}></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {ex.sets.map((set, setIdx) => (
                                          <tr key={setIdx} className={`set-row ${set.is_completed ? 'completed-row' : ''}`}>
                                            <td style={{ fontWeight: 800, color: 'var(--text-muted, #667085)' }}>#{set.set_num}</td>
                                            <td>
                                              <input
                                                type="number"
                                                step="0.5"
                                                className="set-input"
                                                value={set.weight_kg}
                                                onChange={(e) => handleUpdateSet(exIdx, setIdx, 'weight_kg', e.target.value)}
                                              />
                                            </td>
                                            <td>
                                              <input
                                                type="number"
                                                className="set-input"
                                                value={set.reps}
                                                onChange={(e) => handleUpdateSet(exIdx, setIdx, 'reps', e.target.value)}
                                              />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                              <button
                                                className={`set-check-toggle-btn ${set.is_completed ? 'checked' : ''}`}
                                                onClick={() => handleUpdateSet(exIdx, setIdx, 'is_completed')}
                                              >
                                                <span>{set.is_completed ? '✓ Done' : '○ Mark'}</span>
                                              </button>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                              {ex.sets.length > 1 && (
                                                <button
                                                  onClick={() => handleRemoveSet(exIdx, setIdx)}
                                                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
                                                  title="Delete set"
                                                >
                                                  ✕
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.2rem' }}>
                                    <button
                                      onClick={() => handleAddSet(exIdx)}
                                      style={{
                                        background: 'transparent',
                                        border: '1px dashed #475569',
                                        color: 'var(--text-secondary, #475467)',
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      + Add Set
                                    </button>

                                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)' }}>
                                      Volume: {ex.sets.reduce((s, set) => s + (set.is_completed ? set.weight_kg * set.reps : 0), 0).toFixed(0)} kg
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Session Notes & Save Completion Banner */}
                            <div style={{
                              background: '#FFFFFF',
                              border: '1.5px solid var(--c-sand, #D8D2C8)',
                              borderRadius: 'var(--radius-lg, 18px)',
                              boxShadow: '0 2px 10px rgba(52, 64, 84, 0.04)',
                              padding: '1.25rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.85rem'
                            }}>
                              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #475467)' }}>
                                Workout Notes & Reflections (Optional):
                              </label>
                              <textarea
                                value={activeSession.notes}
                                onChange={(e) => setActiveSession({ ...activeSession, notes: e.target.value })}
                                placeholder="e.g. Felt strong on bench press today, increased +5kg. Good chest pump!"
                                style={{
                                  background: 'var(--bg-tertiary)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--c-slate, #344054)',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  fontSize: '0.84rem',
                                  resize: 'vertical',
                                  minHeight: '60px'
                                }}
                              />

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.85rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #667085)', textTransform: 'uppercase', fontWeight: 700 }}>Total Working Sets</div>
                                  <strong style={{ color: 'var(--c-mocha, #875F45)', fontSize: '1.1rem' }}>
                                    {activeSession.exercises.reduce((sum, e) => sum + e.sets.filter(s => s.is_completed).length, 0)} Sets Completed
                                  </strong>
                                </div>

                                <button
                                  onClick={handleSaveCompletedWorkout}
                                  disabled={isSavingWorkout}
                                  style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'var(--c-slate, #344054)',
                                    border: 'none',
                                    padding: '0.75rem 1.6rem',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(135, 95, 69, 0.35)',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {isSavingWorkout ? 'Saving Session...' : '🏁 Save & Complete Workout'}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Right Column: Live Gym Rush, Hydration & Top PRs */}
                      <div className="workout-side-col">
                        {/* Live Gym Traffic & Rush Tracker Card */}
                        <div className="gym-rush-card">
                          <div className="rush-header-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '1.2rem' }}>⚡</span>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--c-slate, #344054)', fontWeight: 800 }}>
                                Live Gym Crowd Status
                              </h4>
                            </div>
                            <span className={`rush-pulse-indicator ${currentHourData.intensity}`}>
                              ● {currentHourData.intensity === 'peak' ? 'Peak Rush Now' : currentHourData.intensity === 'moderate' ? 'Moderate Traffic' : 'Quiet (Best Time)'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted, #667085)', flexWrap: 'wrap', gap: '4px' }}>
                            <span>Check-ins Today: <strong style={{ color: 'var(--c-slate, #344054)' }}>{todayAttendanceCount}</strong></span>
                            <span>Peak Window: <strong style={{ color: '#f59e0b' }}>{peakRushLabel}</strong></span>
                          </div>

                          {/* Mini Hourly Rush Bar Chart */}
                          {hourlyRushList.length > 0 && (
                            <div style={{ marginTop: '0.2rem' }}>
                              <div className="rush-bars-mini">
                                {hourlyRushList.map((item) => {
                                  const isCurrent = item.hour === currentHour;
                                  const barColor = item.intensity === 'peak' ? '#ef4444' : item.intensity === 'moderate' ? '#f59e0b' : '#10b981';
                                  const heightPct = Math.max(15, Math.min(100, (item.count / 10) * 100));

                                  return (
                                    <div
                                      key={item.hour}
                                      className={`rush-bar-item ${isCurrent ? 'active-hour' : ''}`}
                                      style={{
                                        height: `${heightPct}%`,
                                        background: isCurrent ? '#38bdf8' : barColor,
                                        opacity: isCurrent ? 1 : 0.65
                                      }}
                                      title={`${item.label}: ${item.count} arrivals (${item.intensity})`}
                                    />
                                  );
                                })}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                                <span>06:00 AM</span>
                                <span>12:00 PM</span>
                                <span>06:00 PM</span>
                                <span>10:00 PM</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Top Personal Records Card */}
                        <div className="pr-card-container">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '1.2rem' }}>🏆</span>
                              <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--c-slate, #344054)', fontWeight: 800 }}>
                                Personal Records (PRs)
                              </h4>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--c-mocha, #875F45)' }}>Titan Club</span>
                          </div>

                          <div className="pr-grid">
                            {(workoutDashboard?.top_prs?.length > 0 ? workoutDashboard.top_prs : [
                              { exercise: 'Bench Press', weight_kg: 90, reps: 4 },
                              { exercise: 'Barbell Squats', weight_kg: 110, reps: 6 },
                              { exercise: 'Deadlift', weight_kg: 140, reps: 5 },
                              { exercise: 'Shoulder Press', weight_kg: 55, reps: 8 }
                            ]).map((pr, pIdx) => (
                              <div key={pIdx} className="pr-item">
                                <span className="pr-item-name">{pr.exercise}</span>
                                <div className="pr-item-weight">
                                  {pr.weight_kg} <span className="pr-item-unit">kg</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #667085)' }}>
                                  Best Set: {pr.reps} reps
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Hydration Tracker Card */}
                        <div className="hydration-container">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '1.2rem' }}>💧</span>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--c-slate, #344054)', fontWeight: 800 }}>
                                Daily Hydration Tracker
                              </h4>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--c-mocha, #875F45)', fontWeight: 700 }}>
                              {waterGlasses} / 8 Glasses ({waterGlasses * 250} ml)
                            </span>
                          </div>

                          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #475467)' }}>
                            Drink at least 2 Liters of water to stay hydrated during training.
                          </span>

                          <div className="water-cups-row">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(glassNum => (
                              <button
                                key={glassNum}
                                className={`water-cup-btn ${glassNum <= waterGlasses ? 'filled' : ''}`}
                                onClick={() => handleWaterClick(glassNum)}
                                title={`Glass ${glassNum} (250ml)`}
                              >
                                {glassNum <= waterGlasses ? '🥛' : '🥤'}
                              </button>
                            ))}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#93c5fd' }}>
                              Target: {Math.round((waterGlasses / 8) * 100)}% Reached
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleWaterClick(Math.min(8, waterGlasses + 1))}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.25)',
                                  border: '1px solid #38bdf8',
                                  color: 'var(--c-slate, #344054)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                + Add Glass
                              </button>
                              <button
                                onClick={() => handleWaterClick(0)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: 'var(--text-muted, #667085)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ---------------- SUBTAB 2: MY WORKOUT TEMPLATES & BUILDER ---------------- */}
                {workoutSubTab === 'TEMPLATES' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '1.2rem', fontWeight: 800 }}>
                          📋 Custom Workout Templates
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #667085)' }}>
                          Create and customize your personal workout splits, reorder exercises, or build specialized routines.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setShowAddCustomExModal(true)}
                          style={{
                            background: 'var(--c-sand-light, #FAF8F5)',
                            border: '1.5px solid var(--c-sand, #D8D2C8)',
                            color: 'var(--c-mocha, #875F45)',
                            padding: '0.65rem 1.15rem',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          ➕ Add Custom Exercise
                        </button>
                        <button
                          onClick={handleOpenCreateTemplate}
                          style={{
                            background: 'linear-gradient(135deg, #875F45 0%, #6E4A34 100%)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.65rem 1.3rem',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(135, 95, 69, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          + Create New Template
                        </button>
                      </div>
                    </div>

                    <div className="templates-grid">
                      {templates.map(tpl => (
                        <div key={tpl.id} className="template-card">
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.4rem' }}>{tpl.icon || '⚡'}</span>
                                <div>
                                  <h4 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '1.05rem', fontWeight: 800 }}>
                                    {tpl.name}
                                  </h4>
                                  <span style={{ fontSize: '0.76rem', color: 'var(--c-mocha, #875F45)', fontWeight: 700 }}>
                                    {tpl.target_muscle || 'Custom Split'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {tpl.description && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #667085)', margin: '0.35rem 0 0.85rem 0', lineHeight: 1.4 }}>
                                {tpl.description}
                              </p>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #475467)', fontWeight: 700, textTransform: 'uppercase' }}>
                                Exercises ({tpl.exercises?.length || 0}):
                              </div>
                              {(tpl.exercises || []).slice(0, 5).map((ex, i) => (
                                <div key={i} className="template-exercise-pill">
                                  <span>{ex.name}</span>
                                  <span style={{ color: 'var(--text-muted, #667085)', fontWeight: 700 }}>{ex.target_sets || 3} sets</span>
                                </div>
                              ))}
                              {(tpl.exercises?.length || 0) > 5 && (
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)', textAlign: 'center' }}>
                                  + {tpl.exercises.length - 5} more exercises
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1.5px solid var(--c-sand, #D8D2C8)', paddingTop: '1rem' }}>
                            <button
                              onClick={() => {
                                initActiveSession(tpl);
                                setWorkoutSubTab('ACTIVE');
                              }}
                              style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, #875F45 0%, #6E4A34 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.65rem 1rem',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(135, 95, 69, 0.25)'
                              }}
                            >
                              ▶ Start Workout
                            </button>
                            <button
                              onClick={() => handleOpenEditTemplate(tpl)}
                              style={{
                                background: 'var(--c-sand-light, #FAF8F5)',
                                border: '1.5px solid var(--c-sand, #D8D2C8)',
                                color: 'var(--c-slate, #344054)',
                                padding: '0.65rem 0.9rem',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                              title="Edit Template"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              style={{
                                background: 'var(--color-danger-light, #FEE2E2)',
                                border: '1.5px solid var(--color-danger, #B91C1C)',
                                color: '#B91C1C',
                                padding: '0.65rem 0.9rem',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                              title="Delete Template"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ---------------- SUBTAB 3: EXERCISE PROGRESS & INTERACTIVE CHARTS ---------------- */}
                {workoutSubTab === 'PROGRESS' && (
                  <div className="progress-chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '1.2rem', fontWeight: 800 }}>
                          📈 Individual Exercise Progression Graph
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #667085)' }}>
                          Select any exercise to track weight overload, sets and volume progress over time.
                        </p>
                      </div>

                      {/* Exercise Dropdown Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #475467)', fontWeight: 700 }}>Exercise:</label>
                        <select
                          value={selectedProgressExercise}
                          onChange={(e) => {
                            setSelectedProgressExercise(e.target.value);
                            fetchExerciseProgress(memberId, e.target.value);
                          }}
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '1.5px solid #8b5cf6',
                            color: 'var(--c-slate, #344054)',
                            padding: '0.55rem 0.95rem',
                            borderRadius: '10px',
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            cursor: 'pointer'
                          }}
                        >
                          {exerciseLibrary.map(ex => (
                            <option key={ex.id || ex.name} value={ex.name}>
                              {ex.name} ({ex.category || 'General'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Exercise Stats Summary */}
                    {exerciseProgressData && (
                      <div className="chart-stats-grid">
                        <div className="chart-stat-item">
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>Current PR (Max)</span>
                          <strong style={{ color: '#fbbf24', fontSize: '1.35rem' }}>
                            {exerciseProgressData.pr_max_weight_kg || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #667085)' }}>kg</span>
                          </strong>
                        </div>

                        <div className="chart-stat-item">
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>Starting Baseline</span>
                          <strong style={{ color: 'var(--c-mocha, #875F45)', fontSize: '1.35rem' }}>
                            {exerciseProgressData.starting_weight_kg || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #667085)' }}>kg</span>
                          </strong>
                        </div>

                        <div className="chart-stat-item">
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>Overload Gain</span>
                          <strong style={{ color: (exerciseProgressData.weight_gain_kg || 0) >= 0 ? '#10b981' : '#f87171', fontSize: '1.35rem' }}>
                            {(exerciseProgressData.weight_gain_kg || 0) >= 0 ? `+${exerciseProgressData.weight_gain_kg}` : exerciseProgressData.weight_gain_kg} kg
                            <span style={{ fontSize: '0.78rem', marginLeft: '4px' }}>({exerciseProgressData.gain_percentage || 0}%)</span>
                          </strong>
                        </div>

                        <div className="chart-stat-item">
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #667085)', fontWeight: 700, textTransform: 'uppercase' }}>Total Sets Logged</span>
                          <strong style={{ color: 'var(--c-mocha, #875F45)', fontSize: '1.35rem' }}>
                            {exerciseProgressData.total_sets_completed || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #667085)' }}>sets</span>
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Interactive SVG Chart */}
                    {renderProgressChart()}

                    {/* Exercise History Table */}
                    {exerciseProgressData?.progress_points?.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <h4 style={{ margin: '0 0 0.6rem 0', color: 'var(--c-slate, #344054)', fontSize: '0.95rem', fontWeight: 800 }}>
                          Session History for {selectedProgressExercise}
                        </h4>
                        <div className="sets-table-wrapper">
                          <table className="sets-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Workout Routine</th>
                                <th>Max Weight</th>
                                <th>Sets & Reps</th>
                                <th>Total Volume</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exerciseProgressData.progress_points.slice().reverse().map((pt, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 700, color: 'var(--c-slate, #344054)' }}>{pt.date}</td>
                                  <td style={{ color: 'var(--c-mocha, #875F45)' }}>{pt.template_name}</td>
                                  <td>
                                    <strong style={{ color: '#fbbf24' }}>{pt.max_weight_kg} kg</strong>
                                  </td>
                                  <td>{pt.sets_count} sets ({pt.total_reps} reps)</td>
                                  <td style={{ color: '#10b981', fontWeight: 700 }}>{pt.volume_kg.toLocaleString()} kg</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- SUBTAB 4: WORKOUT HISTORY TIMELINE ---------------- */}
                {workoutSubTab === 'HISTORY' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '1.2rem', fontWeight: 800 }}>
                        📜 Past Workout Sessions History
                      </h3>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #667085)' }}>
                        Total {workoutLogs.length} logged sessions
                      </span>
                    </div>

                    {workoutLogs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-background)', borderRadius: '14px', color: 'var(--text-muted)' }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📝</span>
                        <strong>No completed workout sessions logged yet.</strong>
                        <p style={{ fontSize: '0.84rem', marginTop: '0.3rem' }}>
                          Start an active workout session and click "Save & Complete Workout" to save your history!
                        </p>
                      </div>
                    ) : (
                      <div className="history-timeline-list">
                        {workoutLogs.map(log => (
                          <div key={log.id} className="history-card">
                            <div className="history-card-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.4rem' }}>🏋️</span>
                                <div>
                                  <h4 style={{ margin: 0, color: 'var(--c-slate, #344054)', fontSize: '1.08rem', fontWeight: 800 }}>
                                    {log.template_name}
                                  </h4>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #667085)' }}>
                                    📅 {log.date} • ⏱️ {log.duration_minutes || 45} mins
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #667085)', textTransform: 'uppercase' }}>Volume Lifted</div>
                                  <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>
                                    {(log.total_volume_kg || 0).toLocaleString()} kg
                                  </strong>
                                </div>
                                <span className="exercise-target-badge">
                                  {log.total_sets || 0} Sets ({log.total_reps || 0} Reps)
                                </span>
                              </div>
                            </div>

                            {log.notes && (
                              <div style={{ background: 'var(--bg-tertiary)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary, #475467)', borderLeft: '3px solid #8b5cf6' }}>
                                💬 <em>"{log.notes}"</em>
                              </div>
                            )}

                            {/* Exercises Breakdown */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem', marginTop: '0.25rem' }}>
                              {(log.exercises || []).map((ex, i) => (
                                <div key={i} style={{ background: 'var(--bg-tertiary)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--c-slate, #344054)', marginBottom: '0.25rem' }}>
                                    {ex.name}
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {(ex.sets || []).map((s, si) => (
                                      <span key={si} style={{ background: 'var(--c-sage-light, #EFF4EE)', color: 'var(--c-sage-dark, #3B5A3C)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                        {s.weight_kg}kg×{s.reps}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: STREAKS & ATTENDANCE */}
            {activeTab === 'STREAKS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="analytics-grid">
                  <div className="analytic-card">
                    <span className="analytic-card-title">Current Workout Streak</span>
                    <div className="analytic-card-value" style={{ color: '#f59e0b' }}>
                      🔥 {metrics.current_streak || 0} Days
                    </div>
                    <span className="analytic-card-sub">Best Streak: {metrics.best_streak || 0} Days</span>
                  </div>

                  <div className="analytic-card">
                    <span className="analytic-card-title">Visits This Month</span>
                    <div className="analytic-card-value" style={{ color: 'var(--c-mocha, #875F45)' }}>
                      {metrics.visits_this_month || 0} Workouts
                    </div>
                    <span className="analytic-card-sub">Consistency Score: 85%</span>
                  </div>

                  <div className="analytic-card">
                    <span className="analytic-card-title">Lifetime Workouts</span>
                    <div className="analytic-card-value" style={{ color: '#10b981' }}>
                      {metrics.total_lifetime_visits || 0} Days
                    </div>
                    <span className="analytic-card-sub">Last Visit: {metrics.last_visit_date || 'Today'}</span>
                  </div>
                </div>

                <div className="inventory-table-card" style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Recent Check-in Logs</h3>
                  {(!profileData?.recent_attendance || profileData.recent_attendance.length === 0) ? (
                    <div style={{ color: 'var(--text-muted)' }}>No recent check-in records found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {profileData.recent_attendance.map((att, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <span>📅 {att.date} at {att.first_detected || att.timestamp || 'Check-in'}</span>
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Verified AI Check-in</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: MEMBERSHIP PASS */}
            {activeTab === 'PASS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {hasActivePass ? (
                  <div className="analytic-card" style={{ maxWidth: '500px' }}>
                    <span className="analytic-card-title">Active Membership Pass</span>
                    <div className="analytic-card-value" style={{ color: 'var(--c-mocha, #875F45)' }}>
                      {membership.plan_name || 'Standard Pass'}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <div>Validity: <strong>{membership.start_date || 'N/A'} ➔ {membership.expiry_date || 'N/A'}</strong></div>
                      <div style={{ marginTop: '4px' }}>
                        Status: <strong style={{ color: 'var(--success)' }}>{memInfo.label}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1.5px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    maxWidth: '550px'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                    <h3 style={{ margin: 0, color: 'var(--danger)' }}>No Active Gym Membership Pass</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.5rem 0 0 0' }}>
                      You do not have an active membership pass recorded in the system. Please visit the front desk reception to subscribe or renew your gym membership pass.
                    </p>
                  </div>
                )}

                <div className="inventory-table-card" style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Payment History</h3>
                  {(!profileData?.payments_history || profileData.payments_history.length === 0) ? (
                    <div style={{ color: 'var(--text-muted)' }}>No payment transactions recorded yet.</div>
                  ) : (
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Receipt #</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileData.payments_history.map((p, idx) => (
                          <tr key={idx}>
                            <td>{p.date || 'N/A'}</td>
                            <td style={{ fontFamily: 'monospace' }}>{p.payment_id || `REC-${idx + 1}`}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 700 }}>Rs. {p.amount}</td>
                            <td>{p.payment_method || 'CASH'}</td>
                            <td><span className="status-pill-badge-mini active">PAID</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: CAFE ORDERING & NUTRITION */}
            {activeTab === 'CAFE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Live Pre-Order Status Tracker (If any active orders) */}
                {activePreorders.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activePreorders.map(order => (
                      <div key={order.id} className="preorder-tracker-card">
                        <div className="preorder-tracker-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '1.3rem' }}>🔔</span>
                            <div>
                              <strong style={{ color: 'var(--c-slate, #344054)', fontSize: '0.95rem' }}>Pre-Order #{order.id}</strong>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #667085)', marginLeft: '8px' }}>
                                Total: <strong style={{ color: 'var(--success)' }}>Rs. {order.total_amount}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Live Status Badges */}
                          {order.order_status === 'PENDING_APPROVAL' && (
                            <span className="preorder-pulse-badge pending">
                              🟡 ⏳ Awaiting Front Desk Payment & Approval
                            </span>
                          )}
                          {order.order_status === 'PREPARING' && (
                            <span className="preorder-pulse-badge preparing">
                              🔵 🥤 Approved! Kitchen is Preparing your order
                            </span>
                          )}
                          {order.order_status === 'READY_FOR_PICKUP' && (
                            <span className="preorder-pulse-badge ready">
                              🟢 ✅ READY FOR PICKUP at Cafe Counter!
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #475467)', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.85rem', borderRadius: '8px' }}>
                          <strong>Items:</strong> {order.items?.map((it, idx) => (
                            <span key={idx}> {it.qty}x {it.name} {it.addons && it.addons.length > 0 ? `(${it.addons.join(', ')})` : ''} • </span>
                          ))}
                        </div>

                        {/* Customer Action Buttons based on status */}
                        {order.order_status === 'PENDING_APPROVAL' && (
                          <div className="preorder-action-row">
                            <button 
                              className="preorder-cancel-btn"
                              onClick={() => { setCancellingOrder(order); setActionError(''); }}
                            >
                              ✕ Cancel Order
                            </button>
                          </div>
                        )}

                        {order.order_status === 'READY_FOR_PICKUP' && (
                          <div className="preorder-action-row">
                            <button 
                              className="preorder-pickup-btn"
                              onClick={() => { setPickingUpOrder(order); setActionError(''); }}
                            >
                              🛍️ Mark as Picked Up
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Cafe Sub-Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <button 
                    style={{
                      background: cafeView === 'ORDER' ? 'var(--accent, #38bdf8)' : 'var(--bg-tertiary)',
                      color: cafeView === 'ORDER' ? '#000' : 'var(--text-primary)',
                      border: 'none',
                      padding: '0.5rem 1.1rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.88rem'
                    }}
                    onClick={() => setCafeView('ORDER')}
                  >
                    🛍️ Order Shakes & Nutrition
                  </button>
                  <button 
                    style={{
                      background: cafeView === 'HISTORY' ? 'var(--accent, #38bdf8)' : 'var(--bg-tertiary)',
                      color: cafeView === 'HISTORY' ? '#000' : 'var(--text-primary)',
                      border: 'none',
                      padding: '0.5rem 1.1rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.88rem'
                    }}
                    onClick={() => setCafeView('HISTORY')}
                  >
                    📊 My Nutrition Stats & History
                  </button>
                </div>

                {orderSuccessMsg && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.92rem'
                  }}>
                    {orderSuccessMsg}
                  </div>
                )}

                {/* VIEW 1: SELF-ORDERING MENU */}
                {cafeView === 'ORDER' && (
                  <div className="member-order-layout">
                    {/* Left: Product Catalog */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Categories Bar */}
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {CAFE_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            style={{
                              background: selectedCategory === cat.id ? '#8b5cf6' : 'var(--bg-tertiary)',
                              color: 'var(--c-slate, #344054)',
                              border: '1px solid var(--border-color)',
                              padding: '0.45rem 0.85rem',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedCategory(cat.id)}
                          >
                            {cat.icon} {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Products Grid */}
                      <div className="member-product-grid">
                        {filteredProducts.map(prod => (
                          <div 
                            key={prod.id} 
                            className={`member-product-card ${prod.stock <= 0 ? 'out-of-stock' : ''}`}
                            onClick={() => {
                              if (prod.stock <= 0) return;
                              if (prod.customizable) handleOpenCustomizer(prod);
                              else handleAddSimpleToCart(prod);
                            }}
                          >
                            <div>
                              <span className="prod-category-tag">{prod.category}</span>
                              <h4 style={{ margin: '0.4rem 0 0.2rem 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{prod.name}</h4>
                              <div style={{ fontSize: '0.78rem', color: 'var(--c-mocha, #875F45)' }}>
                                {prod.protein_g > 0 && `⚡ ${prod.protein_g}g Pro `}
                                {prod.calories > 0 && `• 🔥 ${prod.calories} kcal`}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                              <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1rem' }}>Rs. {prod.price}</span>
                              <button 
                                style={{
                                  background: '#8b5cf6',
                                  color: 'var(--c-slate, #344054)',
                                  border: 'none',
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                disabled={prod.stock <= 0}
                              >
                                {prod.customizable ? 'Customize +' : '+ Add'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Cart & Submit Pre-Order */}
                    <div className="member-cart-box">
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                        🛒 Your Pre-Order Cart
                      </h4>

                      {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Your cart is empty. Click items on the menu to add shakes & meals.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                            {cart.map(item => (
                              <div key={item.cart_id} className="member-cart-item">
                                <div style={{ flex: 1 }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Rs. {item.unit_price} each • {item.protein_g}g Pro
                                    {item.addons?.map((a, i) => <div key={i} style={{ color: 'var(--c-mocha, #875F45)' }}>• {a}</div>)}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <button style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1.5px solid var(--c-sand, #D8D2C8)', background: 'var(--c-sand-light, #FAF8F5)', color: 'var(--c-slate, #344054)', fontWeight: 800, cursor: 'pointer' }} onClick={() => handleUpdateCartQty(item.cart_id, -1)}>-</button>
                                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--c-slate, #344054)' }}>{item.qty}</span>
                                  <button style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1.5px solid var(--c-sand, #D8D2C8)', background: 'var(--c-sand-light, #FAF8F5)', color: 'var(--c-slate, #344054)', fontWeight: 800, cursor: 'pointer' }} onClick={() => handleUpdateCartQty(item.cart_id, 1)}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                            <span>Total Bill:</span>
                            <span style={{ color: 'var(--success)' }}>Rs. {cartSubtotal}</span>
                          </div>

                          {/* Payment Intent Selector */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>How will you pay?</label>
                            <select 
                              value={paymentIntent}
                              onChange={(e) => setPaymentIntent(e.target.value)}
                              style={{
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                padding: '0.5rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem'
                              }}
                            >
                              <option value="PAY_AT_COUNTER">💵 Pay at Counter on Pickup (Cash/Card/QR)</option>
                              <option value="MEMBER_TAB">👤 Charge to my Member Khata Tab</option>
                            </select>
                          </div>

                          <button 
                            className="member-order-btn"
                            disabled={placingOrder}
                            onClick={handlePlacePreOrder}
                          >
                            {placingOrder ? 'Sending Pre-Order...' : '🚀 Place Pre-Order Now'}
                          </button>

                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                            * Orders are confirmed when front desk staff approves payment.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* VIEW 2: NUTRITION STATS & ORDER HISTORY */}
                {cafeView === 'HISTORY' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="analytics-grid">
                      <div className="analytic-card">
                        <span className="analytic-card-title">Total Cafe Spent</span>
                        <div className="analytic-card-value" style={{ color: '#10b981' }}>
                          Rs. {cafeMetrics.total_spent_pkr || 0}
                        </div>
                      </div>
                      <div className="analytic-card">
                        <span className="analytic-card-title">Total Protein Fuel</span>
                        <div className="analytic-card-value" style={{ color: 'var(--c-mocha, #875F45)' }}>
                          ~{cafeMetrics.total_protein_g || 0}g
                        </div>
                      </div>
                      <div className="analytic-card">
                        <span className="analytic-card-title">Unpaid Khata Tab</span>
                        <div className="analytic-card-value" style={{ color: 'var(--c-mocha, #875F45)' }}>
                          Rs. {cafeMetrics.cafe_tab_balance || 0}
                        </div>
                      </div>
                    </div>

                    <div className="inventory-table-card" style={{ padding: '1rem' }}>
                      <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Past Orders & Shakes</h3>
                      {(!profileData?.cafe_history || profileData.cafe_history.length === 0) ? (
                        <div style={{ color: 'var(--text-muted)' }}>No past cafe orders recorded yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {profileData.cafe_history.map(ord => (
                            <div key={ord.id} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                  <strong style={{ color: 'var(--text-primary)' }}>#{ord.id}</strong>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                    {ord.created_at ? new Date(ord.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.95rem' }}>Rs. {ord.total_amount}</span>
                                  {ord.order_status === 'CANCELLED' && (
                                    <span className="history-status-pill cancelled">✕ Cancelled {ord.cancelled_by ? `(${ord.cancelled_by})` : ''}</span>
                                  )}
                                  {ord.order_status === 'PICKED_UP' && (
                                    <span className="history-status-pill picked_up">✓ Picked Up</span>
                                  )}
                                  {ord.order_status === 'COMPLETED' && (
                                    <span className="history-status-pill completed">✓ Completed</span>
                                  )}
                                  {ord.order_status === 'READY_FOR_PICKUP' && (
                                    <span className="history-status-pill ready_for_pickup">🟢 Ready for Pickup</span>
                                  )}
                                  {ord.order_status === 'PREPARING' && (
                                    <span className="history-status-pill preparing">🔵 Preparing</span>
                                  )}
                                  {ord.order_status === 'PENDING_APPROVAL' && (
                                    <span className="history-status-pill pending_approval">🟡 Awaiting Front Desk</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {ord.items?.map((it, idx) => (
                                  <span key={idx}>• {it.qty}x {it.name} {it.addons && it.addons.length > 0 ? `(${it.addons.join(', ')})` : ''} </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* TAB 5: MY PROFILE */}
            {activeTab === 'PROFILE' && (
              <div className="my-profile-container">
                <div className="profile-card-main">
                  <div className="profile-avatar-action-section">
                    <div className="profile-avatar-large-preview">
                      {person.person_id || person.id ? (
                        <img 
                          src={`/api/face-crops/${person.person_id || person.id}.jpg?t=${avatarTimestamp}`} 
                          alt="" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                      <span>{(person.name || user?.name || 'M').charAt(0).toUpperCase()}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                        {person.name || user?.name || 'Gym Member'}
                      </h3>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                        Member ID: <strong style={{ color: 'var(--c-mocha, #875F45)' }}>{memberId}</strong>
                      </div>
                      
                      <div style={{ marginTop: '0.25rem' }}>
                        <button 
                          className="profile-change-photo-btn"
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        >
                          📷 Change Profile Picture
                        </button>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Supported formats: JPG, PNG, WEBP (Max 5 MB)
                      </span>
                    </div>
                  </div>

                  <div className="profile-details-grid">
                    <div className="profile-detail-item">
                      <div className="profile-detail-label">Full Name</div>
                      <div className="profile-detail-value">{person.name || user?.name || 'N/A'}</div>
                    </div>

                    <div className="profile-detail-item">
                      <div className="profile-detail-label">Contact Phone</div>
                      <div className="profile-detail-value">{person.phone || 'Not provided'}</div>
                    </div>

                    <div className="profile-detail-item">
                      <div className="profile-detail-label">Membership Plan</div>
                      <div className="profile-detail-value" style={{ color: hasActivePass ? 'var(--accent)' : 'var(--danger)' }}>
                        {hasActivePass ? (membership.plan_name || 'Active Pass') : 'No Active Pass'}
                      </div>
                    </div>

                    <div className="profile-detail-item">
                      <div className="profile-detail-label">Pass Status</div>
                      <div className="profile-detail-value" style={{ color: hasActivePass ? 'var(--success)' : 'var(--text-muted)' }}>
                        {hasActivePass ? memInfo.label : 'Inactive'}
                      </div>
                    </div>

                    <div className="profile-detail-item">
                      <div className="profile-detail-label">Pass Validity</div>
                      <div className="profile-detail-value">
                        {hasActivePass ? `${membership.start_date || 'N/A'} to ${membership.expiry_date || 'N/A'}` : 'Not Issued'}
                      </div>
                    </div>

                    <div className="profile-detail-item">
                      <div className="profile-detail-label">Registered Since</div>
                      <div className="profile-detail-value">
                        {person.created_at ? new Date(person.created_at).toLocaleDateString() : 'Active Member'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden File Input for Profile Picture Upload */}
      <input 
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoSelect}
      />

      {/* PROFILE PICTURE PREVIEW & SAVE MODAL */}
      {photoPreviewUrl && (
        <div className="modal-overlay" onClick={() => !photoUploading && handleCancelPhotoPreview()}>
          <div className="portal-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Change Profile Picture</h3>
              <button 
                onClick={() => !photoUploading && handleCancelPhotoPreview()}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0.2rem 0 0.8rem 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Preview how your photo will look across your portal & gym card:
            </p>

            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              border: '4px solid #8b5cf6',
              margin: '0 auto',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.35)',
              background: 'var(--bg-tertiary)'
            }}>
              <img 
                src={photoPreviewUrl} 
                alt="Preview" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              File: {selectedPhotoFile?.name} ({((selectedPhotoFile?.size || 0) / 1024).toFixed(1)} KB)
            </div>

            {photoError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.84rem', background: 'rgba(239, 68, 68, 0.12)', padding: '0.5rem 0.75rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                ⚠️ {photoError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1rem' }}>
              <button 
                className="portal-modal-btn-cancel" 
                disabled={photoUploading}
                onClick={handleCancelPhotoPreview}
              >
                Cancel
              </button>
              <button 
                className="portal-modal-btn-confirm-success" 
                disabled={photoUploading}
                onClick={handleSaveProfilePicture}
              >
                {photoUploading ? 'Uploading...' : 'Save Profile Picture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {cancellingOrder && (
        <div className="modal-overlay" onClick={() => !actionLoading && setCancellingOrder(null)}>
          <div className="portal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Cancel Order?</h3>
              <button 
                onClick={() => !actionLoading && setCancellingOrder(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Are you sure you want to cancel <strong>Order #{cancellingOrder.id}</strong>?
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.84rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Order Summary:</div>
              {cancellingOrder.items?.map((it, idx) => (
                <div key={idx} style={{ color: 'var(--text-muted)' }}>• {it.qty}x {it.name} (Rs. {it.item_total})</div>
              ))}
              <div style={{ marginTop: '6px', fontWeight: 800, color: 'var(--success)' }}>Total: Rs. {cancellingOrder.total_amount}</div>
            </div>

            {actionError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.12)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                ⚠️ {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                className="portal-modal-btn-cancel" 
                disabled={actionLoading}
                onClick={() => setCancellingOrder(null)}
              >
                Keep Order
              </button>
              <button 
                className="portal-modal-btn-confirm-danger" 
                disabled={actionLoading}
                onClick={handleCancelOrderConfirm}
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PICKUP MODAL */}
      {pickingUpOrder && (
        <div className="modal-overlay" onClick={() => !actionLoading && setPickingUpOrder(null)}>
          <div className="portal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Confirm Pickup</h3>
              <button 
                onClick={() => !actionLoading && setPickingUpOrder(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Have you already collected <strong>Order #{pickingUpOrder.id}</strong> from the cafe counter?
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.84rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Order Summary:</div>
              {pickingUpOrder.items?.map((it, idx) => (
                <div key={idx} style={{ color: 'var(--text-muted)' }}>• {it.qty}x {it.name}</div>
              ))}
              <div style={{ marginTop: '6px', fontWeight: 800, color: 'var(--success)' }}>Total: Rs. {pickingUpOrder.total_amount}</div>
            </div>

            {actionError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.12)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                ⚠️ {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                className="portal-modal-btn-cancel" 
                disabled={actionLoading}
                onClick={() => setPickingUpOrder(null)}
              >
                Not Yet
              </button>
              <button 
                className="portal-modal-btn-confirm-success" 
                disabled={actionLoading}
                onClick={handlePickupOrderConfirm}
              >
                {actionLoading ? 'Confirming...' : 'Yes, I Picked It Up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHAKE CUSTOMIZER MODAL */}
      {customizingProduct && (
        <div className="modal-overlay" onClick={() => setCustomizingProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3>Customize {customizingProduct.name}</h3>
              <button className="modal-close-btn" onClick={() => setCustomizingProduct(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Milk Base */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Choose Liquid Base:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.3rem' }}>
                  {MILK_OPTIONS.map(m => (
                    <label key={m.id} style={{ display: 'flex', justifyContent: 'space-between', background: selectedMilk.id === m.id ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-tertiary)', border: selectedMilk.id === m.id ? '1px solid #8b5cf6' : '1px solid var(--border-color)', padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <span>
                        <input type="radio" name="milk" checked={selectedMilk.id === m.id} onChange={() => setSelectedMilk(m)} style={{ marginRight: '6px' }} />
                        {m.label}
                      </span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>{m.price > 0 ? `+Rs. ${m.price}` : 'Free'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Addons */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Extra Gym Add-ons & Fuel:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.3rem' }}>
                  {ADDONS_OPTIONS.map(a => {
                    const isChecked = selectedAddons.some(x => x.id === a.id);
                    return (
                      <label key={a.id} style={{ display: 'flex', justifyContent: 'space-between', background: isChecked ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-tertiary)', border: isChecked ? '1px solid #10b981' : '1px solid var(--border-color)', padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <span>
                          <input type="checkbox" checked={isChecked} onChange={() => handleToggleAddon(a)} style={{ marginRight: '6px' }} />
                          {a.label}
                        </span>
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>+Rs. {a.price}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Price / Protein Summary */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Nutrition:</div>
                  <strong style={{ color: 'var(--c-mocha, #875F45)' }}>
                    {(customizingProduct.protein_g || 0) + (selectedMilk.protein || 0) + selectedAddons.reduce((s, a) => s + a.protein, 0)}g Protein
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Price:</div>
                  <strong style={{ color: 'var(--success)', fontSize: '1.15rem' }}>
                    Rs. {customizingProduct.price + (selectedMilk.price || 0) + selectedAddons.reduce((s, a) => s + a.price, 0)}
                  </strong>
                </div>
              </div>

              <button className="member-order-btn" onClick={handleAddCustomizedToCart}>
                ✓ Add Customized Shake to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE BUILDER / EDITOR MODAL */}
      {isTemplateModalOpen && (
        <div className="modal-overlay" onClick={() => !isSavingTemplate && setIsTemplateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>📋</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--c-slate, #344054)' }}>
                  {editingTemplate ? `Edit Template: ${editingTemplate.name}` : 'Create Custom Workout Template'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => !isSavingTemplate && setIsTemplateModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Template Name & Target */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475467)' }}>Template Name *</label>
                  <input
                    type="text"
                    value={templateFormName}
                    onChange={(e) => setTemplateFormName(e.target.value)}
                    placeholder="e.g. Push Day, Chest & Arms, Fat Loss"
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--c-slate, #344054)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      marginTop: '0.3rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475467)' }}>Target Muscle Focus</label>
                  <input
                    type="text"
                    value={templateFormTarget}
                    onChange={(e) => setTemplateFormTarget(e.target.value)}
                    placeholder="e.g. Chest • Front Delts • Triceps"
                    style={{
                      width: '100%',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--c-slate, #344054)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      marginTop: '0.3rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475467)' }}>Description / Notes (Optional)</label>
                <input
                  type="text"
                  value={templateFormDesc}
                  onChange={(e) => setTemplateFormDesc(e.target.value)}
                  placeholder="e.g. Heavy compound pressing routine for strength and hypertrophy"
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--c-slate, #344054)',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    marginTop: '0.3rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Selected Exercises with Reordering */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-mocha, #875F45)' }}>
                    Selected Exercises in Template ({templateFormExercises.length})
                  </label>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)' }}>
                    Use ▲ / ▼ to reorder exercises
                  </span>
                </div>

                {templateFormExercises.length === 0 ? (
                  <div style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-muted, #667085)', fontSize: '0.84rem' }}>
                    No exercises selected yet. Choose exercises from the library below!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {templateFormExercises.map((ex, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.84rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <span style={{ color: 'var(--text-muted, #667085)', fontWeight: 800 }}>#{idx + 1}</span>
                          <strong style={{ color: 'var(--c-slate, #344054)' }}>{ex.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--c-mocha, #875F45)' }}>({ex.category})</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)' }}>Sets:</span>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={ex.target_sets || 3}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                const updated = [...templateFormExercises];
                                updated[idx] = { ...updated[idx], target_sets: val };
                                setTemplateFormExercises(updated);
                              }}
                              style={{ width: '45px', background: 'var(--card-background)', border: '1px solid var(--border-color)', color: 'var(--c-slate, #344054)', borderRadius: '4px', textAlign: 'center', padding: '2px 4px', fontSize: '0.8rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              disabled={idx === 0}
                              onClick={() => handleReorderTemplateExercise(idx, 'up')}
                              style={{ background: 'transparent', border: 'none', color: idx === 0 ? '#475569' : '#38bdf8', cursor: idx === 0 ? 'default' : 'pointer', padding: '2px 5px' }}
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button
                              disabled={idx === templateFormExercises.length - 1}
                              onClick={() => handleReorderTemplateExercise(idx, 'down')}
                              style={{ background: 'transparent', border: 'none', color: idx === templateFormExercises.length - 1 ? '#475569' : '#38bdf8', cursor: idx === templateFormExercises.length - 1 ? 'default' : 'pointer', padding: '2px 5px' }}
                              title="Move Down"
                            >
                              ▼
                            </button>
                          </div>

                          <button
                            onClick={() => setTemplateFormExercises(templateFormExercises.filter((_, i) => i !== idx))}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px 5px', fontSize: '0.9rem' }}
                            title="Remove exercise from template"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exercise Library Picker with Live Search & Category Chips */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-slate, #344054)' }}>
                    Select Exercises from Library:
                  </label>
                  <button
                    onClick={() => setShowAddCustomExModal(true)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--c-mocha, #875F45)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    + Add New Custom Exercise
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    value={builderSearchQuery}
                    onChange={(e) => setBuilderSearchQuery(e.target.value)}
                    placeholder="🔍 Search exercises (e.g. Bench, Squat, Cable...)"
                    style={{
                      flex: 1,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--c-slate, #344054)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                {/* Category Chips */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                  {['ALL', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setBuilderCategoryFilter(cat)}
                      style={{
                        background: builderCategoryFilter === cat ? '#8b5cf6' : 'var(--bg-tertiary)',
                        color: 'var(--c-slate, #344054)',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Exercises Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                  {exerciseLibrary
                    .filter(ex => builderCategoryFilter === 'ALL' || ex.category?.toLowerCase() === builderCategoryFilter.toLowerCase())
                    .filter(ex => !builderSearchQuery || ex.name.toLowerCase().includes(builderSearchQuery.toLowerCase()))
                    .map(ex => {
                      const isSelected = templateFormExercises.some(e => e.name.toLowerCase() === ex.name.toLowerCase());
                      return (
                        <button
                          key={ex.id || ex.name}
                          onClick={() => handleToggleExerciseInTemplate(ex)}
                          style={{
                            background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-tertiary)',
                            border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color)',
                            color: isSelected ? '#34d399' : '#cbd5e1',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '8px',
                            textAlign: 'left',
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 800 : 600,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                          <span>{isSelected ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                <button
                  className="portal-modal-btn-cancel"
                  disabled={isSavingTemplate}
                  onClick={() => setIsTemplateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="portal-modal-btn-confirm-success"
                  disabled={isSavingTemplate}
                  onClick={handleSaveTemplateModal}
                >
                  {isSavingTemplate ? 'Saving Template...' : '✓ Save Workout Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM EXERCISE MODAL */}
      {showAddCustomExModal && (
        <div className="modal-overlay" onClick={() => !isSavingCustomEx && setShowAddCustomExModal(false)}>
          <div className="portal-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.4rem' }}>➕</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--c-slate, #344054)' }}>Add Custom Gym Exercise</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #667085)' }}>Create your own personalized gym movement</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475467)' }}>Exercise Name *</label>
                <input
                  type="text"
                  value={customExName}
                  onChange={(e) => setCustomExName(e.target.value)}
                  placeholder="e.g. Incline Smith Machine Press, Landmine Row"
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1.5px solid #8b5cf6',
                    color: 'var(--c-slate, #344054)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    marginTop: '0.3rem',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475467)' }}>Muscle Group / Category</label>
                <select
                  value={customExCategory}
                  onChange={(e) => setCustomExCategory(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--c-slate, #344054)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    marginTop: '0.3rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Chest">Chest</option>
                  <option value="Back">Back</option>
                  <option value="Legs">Legs</option>
                  <option value="Shoulders">Shoulders</option>
                  <option value="Arms">Arms / Biceps / Triceps</option>
                  <option value="Core">Core & Abs</option>
                  <option value="Cardio">Cardio & HIIT</option>
                  <option value="Full Body">Full Body</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #475467)' }}>Primary Target Muscle Focus</label>
                <input
                  type="text"
                  value={customExTarget}
                  onChange={(e) => setCustomExTarget(e.target.value)}
                  placeholder="e.g. Upper Chest, Lower Lats, Hamstrings"
                  style={{
                    width: '100%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--c-slate, #344054)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    marginTop: '0.3rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="portal-modal-btn-cancel"
                disabled={isSavingCustomEx}
                onClick={() => setShowAddCustomExModal(false)}
              >
                Cancel
              </button>
              <button
                className="portal-modal-btn-confirm-success"
                disabled={isSavingCustomEx}
                onClick={handleSaveCustomExercise}
              >
                {isSavingCustomEx ? 'Saving...' : '✓ Add Exercise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXERCISE TO ACTIVE SESSION MODAL */}
      {showAddExToSessionModal && (
        <div className="modal-overlay" onClick={() => setShowAddExToSessionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🏋️</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--c-slate, #344054)' }}>Add Exercise to Current Workout</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddExToSessionModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                value={sessionSearchQuery}
                onChange={(e) => setSessionSearchQuery(e.target.value)}
                placeholder="🔍 Search exercises (e.g. Press, Squat, Curl...)"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--c-slate, #344054)',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.86rem'
                }}
                autoFocus
              />

              {/* Category Filter */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['ALL', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSessionCategoryFilter(cat)}
                    style={{
                      background: sessionCategoryFilter === cat ? 'var(--c-mocha, #875F45)' : 'var(--c-sand-light, #FAF8F5)',
                      color: sessionCategoryFilter === cat ? '#ffffff' : 'var(--c-slate, #344054)',
                      border: sessionCategoryFilter === cat ? '1.5px solid var(--c-mocha, #875F45)' : '1.5px solid var(--c-sand, #D8D2C8)',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '300px', overflowY: 'auto', marginTop: '0.25rem' }}>
                {exerciseLibrary
                  .filter(ex => sessionCategoryFilter === 'ALL' || ex.category?.toLowerCase() === sessionCategoryFilter.toLowerCase())
                  .filter(ex => !sessionSearchQuery || ex.name.toLowerCase().includes(sessionSearchQuery.toLowerCase()))
                  .map(ex => (
                    <div
                      key={ex.id || ex.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--c-slate, #344054)', fontSize: '0.88rem' }}>{ex.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #667085)' }}>{ex.category} • {ex.target || 'Gym Movement'}</div>
                      </div>
                      <button
                        onClick={() => handleAddExerciseToSession(ex)}
                        style={{
                          background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                          color: 'var(--c-slate, #344054)',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberPortal;
