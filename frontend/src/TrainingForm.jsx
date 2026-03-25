import { useState, useRef, useEffect } from 'react';

const SUBJECTS = [
  { label: 'Food Storage', icon: '🥫', color: '#22c55e' },
  { label: 'Food Labelling', icon: '🏷️', color: '#3b82f6' },
  { label: 'Cooking Food', icon: '🍳', color: '#f59e0b' },
  { label: 'Cooling Food', icon: '❄️', color: '#06b6d4' },
  { label: 'Reheating Food', icon: '♨️', color: '#ef4444' },
  { label: 'Freezing Food', icon: '🧊', color: '#8b5cf6' },
  { label: 'Defrosting Food', icon: '💧', color: '#0ea5e9' },
  { label: 'Food Preparation', icon: '🔪', color: '#10b981' },
  { label: 'Cross Contamination', icon: '⚠️', color: '#f97316' },
  { label: 'Temperature Probes', icon: '🌡️', color: '#ec4899' },
  { label: 'Food Allergens', icon: '🥜', color: '#eab308' },
  { label: 'Food Equipment', icon: '⚙️', color: '#6366f1' },
  { label: 'Cleaning', icon: '🧹', color: '#14b8a6' },
  { label: 'Handling Waste', icon: '🗑️', color: '#84cc16' },
  { label: 'Pest Control', icon: '🐛', color: '#a855f7' },
  { label: 'Personal Hygiene', icon: '🧼', color: '#fb923c' },
  { label: 'Hand Washing', icon: '🙌', color: '#38bdf8' },
];

const LEVELS = ['Basic', 'Intermediate', 'Advanced'];

export default function TrainingForm({ token }) {
  const [form, setForm] = useState({
    premisesName: '',
    traineeName: '',
    workLocation: '',
    trainingDate: '',
    trainerName: '',
    trainingLevel: 'Basic',
    subjectsCovered: [],
    satisfactory: 'Yes',
    certificateIssued: 'Yes',
    furtherTrainingRequired: 'Yes',
    comments: '',
  });

  const [traineeSig, setTraineeSig] = useState(null);
  const [trainerSig, setTrainerSig] = useState(null);
  const [traineeIp, setTraineeIp] = useState('');
  const [trainerIp, setTrainerIp] = useState('');
  const [traineeTime, setTraineeTime] = useState('');
  const [trainerTime, setTrainerTime] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const traineeRef = useRef(null);
  const trainerRef = useRef(null);
  const traineeDrawing = useRef(false);
  const trainerDrawing = useRef(false);
  const traineeLast = useRef({ x: 0, y: 0 });
  const trainerLast = useRef({ x: 0, y: 0 });

  useEffect(() => {
    initCanvas(traineeRef, traineeDrawing, traineeLast, '#3b82f6');
    initCanvas(trainerRef, trainerDrawing, trainerLast, '#ec4899');
    fillCanvas(traineeRef);
    fillCanvas(trainerRef);
  }, []);

  function fillCanvas(ref) {
    if (!ref.current) return;
    const ctx = ref.current.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, ref.current.width, ref.current.height);
  }

  function initCanvas(cvRef, drawRef, lastRef, inkColor) {
    const cvs = cvRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');

    const getPos = (e) => {
      const r = cvs.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - r.left) * (cvs.width / r.width),
        y: (src.clientY - r.top) * (cvs.height / r.height),
      };
    };

    const start = (e) => { e.preventDefault(); drawRef.current = true; lastRef.current = getPos(e); };
    const move = (e) => {
      e.preventDefault();
      if (!drawRef.current) return;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastRef.current.x, lastRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      lastRef.current = p;
    };
    const stop = (e) => { e.preventDefault(); drawRef.current = false; };

    cvs.addEventListener('mousedown', start);
    cvs.addEventListener('mousemove', move);
    cvs.addEventListener('mouseup', stop);
    cvs.addEventListener('mouseleave', stop);
    cvs.addEventListener('touchstart', start, { passive: false });
    cvs.addEventListener('touchmove', move, { passive: false });
    cvs.addEventListener('touchend', stop, { passive: false });
  }

  async function getIP() {
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const d = await r.json();
      return d.ip;
    } catch { return '127.0.0.1'; }
  }

  async function saveSig(who) {
    const ref = who === 'trainee' ? traineeRef : trainerRef;
    const data = ref.current.toDataURL('image/png');
    const ip = await getIP();
    const time = new Date().toLocaleString();
    if (who === 'trainee') {
      setTraineeSig(data); setTraineeIp(ip); setTraineeTime(time);
    } else {
      setTrainerSig(data); setTrainerIp(ip); setTrainerTime(time);
    }
  }

  async function uploadSig(e, who) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const data = reader.result;
      const ip = await getIP();
      const time = new Date().toLocaleString();
      const ref = who === 'trainee' ? traineeRef : trainerRef;
      const cvs = ref.current;
      const ctx = cvs.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        const scale = Math.min(cvs.width / img.width, cvs.height / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (cvs.width - w) / 2, (cvs.height - h) / 2, w, h);
      };
      img.src = data;
      if (who === 'trainee') {
        setTraineeSig(data); setTraineeIp(ip); setTraineeTime(time);
      } else {
        setTrainerSig(data); setTrainerIp(ip); setTrainerTime(time);
      }
    };
    reader.readAsDataURL(file);
  }

  function clearSig(who) {
    const ref = who === 'trainee' ? traineeRef : trainerRef;
    fillCanvas(ref);
    if (who === 'trainee') {
      setTraineeSig(null); setTraineeIp(''); setTraineeTime('');
    } else {
      setTrainerSig(null); setTrainerIp(''); setTrainerTime('');
    }
  }

  function toggleSubject(label) {
    setForm(prev => ({
      ...prev,
      subjectsCovered: prev.subjectsCovered.includes(label)
        ? prev.subjectsCovered.filter(s => s !== label)
        : [...prev.subjectsCovered, label],
    }));
  }

  async function handleSubmit() {
    if (!traineeSig || !trainerSig) {
      alert('Both signatures are required!');
      return;
    }
    const payload = {
      ...form,
      traineeSignature: traineeSig,
      trainerSignature: trainerSig,
      traineeIp,
      traineeSignedAt: traineeTime,
      trainerIp,
      trainerSignedAt: trainerTime,
    };
    try {
      const res = await fetch('http://localhost:5000/api/submit-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Training_Record_${form.traineeName || 'Record'}.pdf`;
      a.click();
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF. Make sure the backend is running.');
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        .tf-root {
          font-family: 'Inter', sans-serif;
          background: #000080;
          min-height: 100vh;
          padding: 0;
          overflow: auto;
        }

        .tf-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          max-width: 100%;
          margin: 0 auto;
          height: 100vh;
          padding: 10px;
          box-sizing: border-box;
        }

        @media (max-width: 900px) {
          .tf-layout { grid-template-columns: 1fr; }
        }

        .tf-panel {
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          color: #000;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* LEFT FORM */
        .tf-left-header {
          background: #1e40af;
          color: #fff;
          padding: 16px 24px;
          font-size: 20px;
          font-weight: 700;
        }

        .tf-left-bar {
          background: #1e40af;
          color: #fff;
          padding: 10px 24px;
          font-weight: 700;
          font-size: 13px;
        }

        /* RIGHT PREVIEW */
        .tf-blue-header {
          background: #00aaff;
          color: #fff;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 700;
        }

        .tf-blue-header .icon {
          width: 44px; height: 44px;
          background: #fff;
          color: #00aaff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
        }

        .tf-right-bar {
          background: #00aaff;
          color: #fff;
          padding: 10px 24px;
          font-weight: 700;
          font-size: 13px;
        }

        .tf-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 24px;
          border-bottom: 1px solid #e2e8f0;
          align-items: center;
        }

        .tf-label { font-weight: 600; color: #334155; }
        .tf-value { font-weight: 500; }

        .tf-input {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          width: 260px;
          font-size: 1rem;
        }

        .tf-subject-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .tf-subject-card.active {
          border-color: #00aaff;
          background: #e0f2ff;
        }

        .tf-sig-area {
          background: #f8fafc;
          border: 2px dashed #00aaff;
          border-radius: 12px;
          height: 160px;
          margin: 12px 0;
          position: relative;
          cursor: crosshair;
        }

        .tf-footer {
          background: #00aaff;
          color: #fff;
          text-align: center;
          padding: 14px;
          font-weight: 600;
          margin-top: auto;
        }
      `}</style>

      <div className="tf-root">
        <div className="tf-layout">
          {/* LEFT FORM */}
          <div className="tf-panel" style={{ overflowY: 'auto' }}>
            <div className="tf-left-header">TRAINING RECORD</div>

            <div style={{ padding: '16px 20px' }}>
              <div className="tf-left-bar">01 — BASIC INFORMATION</div>
              <div className="tf-row"><span className="tf-label">Premises Name *</span><input className="tf-input" type="text" placeholder="Enter premises name" value={form.premisesName} onChange={e=>setForm({...form,premisesName:e.target.value})} /></div>
              <div className="tf-row"><span className="tf-label">Trainee Name *</span><input className="tf-input" type="text" placeholder="Enter trainee name" value={form.traineeName} onChange={e=>setForm({...form,traineeName:e.target.value})} /></div>
              <div className="tf-row"><span className="tf-label">Work - Location *</span><input className="tf-input" type="text" placeholder="e.g., Head Chef" value={form.workLocation} onChange={e=>setForm({...form,workLocation:e.target.value})} /></div>
              <div className="tf-row"><span className="tf-label">Training Date *</span><input className="tf-input" type="date" value={form.trainingDate} onChange={e=>setForm({...form,trainingDate:e.target.value})} /></div>

              <div className="tf-left-bar">02 — TRAINER INFORMATION</div>
              <div className="tf-row"><span className="tf-label">Name *</span><input className="tf-input" type="text" placeholder="Enter trainer name" value={form.trainerName} onChange={e=>setForm({...form,trainerName:e.target.value})} /></div>
              <div className="tf-row"><span className="tf-label">Training Level *</span>
                <div style={{display:'flex', gap:8}}>
                  {LEVELS.map(l => (
                    <button key={l} className={`tf-lvl-btn ${form.trainingLevel===l?'active':''}`} 
                      onClick={()=>setForm({...form,trainingLevel:l})}
                      style={{padding:'8px 18px', borderRadius:'9999px', border:'2px solid #e2e8f0', background:'#fff', fontWeight:600, cursor:'pointer'}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tf-left-bar">03 — SUBJECT(S) COVERED</div>
              <div style={{padding:'16px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                {SUBJECTS.map(s => {
                  const active = form.subjectsCovered.includes(s.label);
                  return (
                    <div key={s.label} className={`tf-subject-card ${active?'active':''}`} onClick={()=>toggleSubject(s.label)}>
                      <span style={{fontSize:'1.3rem'}}>{s.icon}</span>
                      <span style={{flex:1}}>{s.label}</span>
                      <input type="checkbox" checked={active} readOnly />
                    </div>
                  );
                })}
              </div>

              <div className="tf-left-bar">TRAINING COURSE COMPLIANCE</div>
              <div className="tf-row"><span className="tf-label">Was training satisfactory</span>
                <div className="tf-toggle">
                  <button onClick={()=>setForm({...form,satisfactory:'Yes'})} className={`tf-toggle-btn yes ${form.satisfactory==='Yes'?'yes':''}`}>Yes</button>
                  <button onClick={()=>setForm({...form,satisfactory:'No'})} className={`tf-toggle-btn no ${form.satisfactory==='No'?'no':''}`}>No</button>
                </div>
              </div>
              <div className="tf-row"><span className="tf-label">Was Certificate issued</span>
                <div className="tf-toggle">
                  <button onClick={()=>setForm({...form,certificateIssued:'Yes'})} className={`tf-toggle-btn yes ${form.certificateIssued==='Yes'?'yes':''}`}>Yes</button>
                  <button onClick={()=>setForm({...form,certificateIssued:'No'})} className={`tf-toggle-btn no ${form.certificateIssued==='No'?'no':''}`}>No</button>
                </div>
              </div>
              <div className="tf-row"><span className="tf-label">Is further training required</span>
                <div className="tf-toggle">
                  <button onClick={()=>setForm({...form,furtherTrainingRequired:'Yes'})} className={`tf-toggle-btn yes ${form.furtherTrainingRequired==='Yes'?'yes':''}`}>Yes</button>
                  <button onClick={()=>setForm({...form,furtherTrainingRequired:'No'})} className={`tf-toggle-btn no ${form.furtherTrainingRequired==='No'?'no':''}`}>No</button>
                </div>
              </div>

              <div className="tf-left-bar">COMMENTS</div>
              <div style={{padding:'16px 24px'}}>
                <textarea className="tf-input" rows="3" placeholder="Provide Details..." value={form.comments} onChange={e=>setForm({...form,comments:e.target.value})} style={{width:'100%'}} />
              </div>

              <div className="tf-left-bar">SIGNATURES</div>
              <div style={{padding:'16px 24px'}}>
                <div style={{marginBottom:20}}>
                  <label style={{fontWeight:600,display:'block',marginBottom:8}}>Trainee Signature *</label>
                  <div className="tf-sig-area"><canvas ref={traineeRef} width={500} height={140} /></div>
                  <div style={{display:'flex',gap:10,marginTop:12}}>
                    <button onClick={()=>saveSig('trainee')} style={{flex:1,padding:'14px',background:'#10b981',color:'#fff',borderRadius:'9999px',cursor:'pointer'}}>Save Drawn Signature</button>
                    <label style={{flex:1,padding:'14px',background:'#3b82f6',color:'#fff',borderRadius:'9999px',textAlign:'center',cursor:'pointer'}}>Upload Signature<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadSig(e,'trainee')} /></label>
                    <button onClick={()=>clearSig('trainee')} style={{padding:'14px 24px',background:'#ef4444',color:'#fff',borderRadius:'9999px',cursor:'pointer'}}>Clear</button>
                  </div>
                  {traineeSig && <div style={{fontSize:'0.85rem',color:'#166534',marginTop:6}}>✅ Signed • IP: {traineeIp} • {traineeTime}</div>}
                </div>

                <div>
                  <label style={{fontWeight:600,display:'block',marginBottom:8}}>Trainer Signature *</label>
                  <div className="tf-sig-area"><canvas ref={trainerRef} width={500} height={140} /></div>
                  <div style={{display:'flex',gap:10,marginTop:12}}>
                    <button onClick={()=>saveSig('trainer')} style={{flex:1,padding:'14px',background:'#10b981',color:'#fff',borderRadius:'9999px',cursor:'pointer'}}>Save Drawn Signature</button>
                    <label style={{flex:1,padding:'14px',background:'#3b82f6',color:'#fff',borderRadius:'9999px',textAlign:'center',cursor:'pointer'}}>Upload Signature<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadSig(e,'trainer')} /></label>
                    <button onClick={()=>clearSig('trainer')} style={{padding:'14px 24px',background:'#ef4444',color:'#fff',borderRadius:'9999px',cursor:'pointer'}}>Clear</button>
                  </div>
                  {trainerSig && <div style={{fontSize:'0.85rem',color:'#166534',marginTop:6}}>✅ Signed • IP: {trainerIp} • {trainerTime}</div>}
                </div>
              </div>
            </div>

            <div className="tf-footer">
              <button onClick={handleSubmit} style={{width:'100%',padding:'18px',background:'#00aaff',color:'#fff',border:'none',fontWeight:700,fontSize:'1.1rem',cursor:'pointer'}}>
                {submitted ? '✅ PDF Downloaded!' : '⬇️ Generate & Download Signed PDF'}
              </button>
            </div>
          </div>

          {/* RIGHT PREVIEW - SIGNATURES NOW FULLY VISIBLE */}
<div 
  className="tf-panel" 
  style={{ 
    position: 'sticky', 
    top: 10, 
    alignSelf: 'start',
    height: 'calc(100vh - 20px)',
    overflow: 'hidden'
  }}
>            <div className="tf-blue-header">
              <div className="icon">
                <svg width="26" height="26" viewBox="0 0 24 24">
                  <g transform="rotate(-45 12 12)">
                    <line x1="12" y1="4" x2="12" y2="20" stroke="#00aaff" strokeWidth="2"/>
                    <line x1="9" y1="4" x2="9" y2="10" stroke="#00aaff" strokeWidth="2"/>
                    <line x1="12" y1="4" x2="12" y2="10" stroke="#00aaff" strokeWidth="2"/>
                    <line x1="15" y1="4" x2="15" y2="10" stroke="#00aaff" strokeWidth="2"/>
                  </g>
                  <g transform="rotate(45 12 12)">
                    <line x1="12" y1="10" x2="12" y2="20" stroke="#00aaff" strokeWidth="2"/>
                    <circle cx="12" cy="7" r="3" stroke="#00aaff" strokeWidth="2" fill="none"/>
                  </g>
                </svg>
              </div>
              TRAINING RECORD
            </div>

            <div style={{padding:'20px', overflowY:'auto', flex:1}}>
              <div className="tf-row"><span className="tf-label">Premises Name</span><span className="tf-value">{form.premisesName||'—'}</span></div>
              <div className="tf-right-bar">TRAINEE DETAILS</div>
              <div className="tf-row"><span className="tf-label">Name</span><span className="tf-value">{form.traineeName||'—'}</span></div>
              <div className="tf-row"><span className="tf-label">Work - Location</span><span className="tf-value">{form.workLocation||'—'}</span></div>

              <div className="tf-right-bar">PERSON CONDUCTING TRAINING</div>
              <div className="tf-row"><span className="tf-label">Name</span><span className="tf-value">{form.trainerName||'—'}</span></div>
              <div className="tf-row"><span className="tf-label">Training Level</span><span className="tf-value">{form.trainingLevel}</span></div>

              <div className="tf-right-bar">SUBJECT(S) COVERED</div>
              <div style={{padding:'16px 24px'}}>{form.subjectsCovered.length===0 ? '—' : form.subjectsCovered.join(' • ')}</div>

              <div className="tf-right-bar">TRAINING COURSE COMPLIANCE</div>
              <div className="tf-row"><span className="tf-label">Was training satisfactory</span><span className="tf-value">{form.satisfactory}</span></div>
              <div className="tf-row"><span className="tf-label">Was Certificate issued</span><span className="tf-value">{form.certificateIssued}</span></div>
              <div className="tf-row"><span className="tf-label">Is further training required</span><span className="tf-value">{form.furtherTrainingRequired}</span></div>

              <div className="tf-right-bar">COMMENTS</div>
              <div style={{padding:'16px 24px', background:'#f8fafc'}}><strong>Provide Details:</strong><br/>{form.comments||'—'}</div>

              <div className="tf-right-bar">SIGNATURES</div>
              <div style={{padding:'16px 24px'}}>
                <div style={{marginBottom:16}}>
                  <strong>Trainee Signature</strong>
                  {traineeSig ? 
                    <img src={traineeSig} alt="trainee" 
                         style={{maxHeight:'140px', maxWidth:'100%', marginTop:8, border:'1px solid #e2e8f0', borderRadius:'8px'}} /> 
                    : <div style={{height:'140px',background:'#f1f5f9',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>Awaiting signature</div>}
                  {traineeIp && <div style={{fontSize:'0.8rem',marginTop:4}}>IP: {traineeIp} • {traineeTime}</div>}
                </div>
                <div>
                  <strong>Trainer Signature</strong>
                  {trainerSig ? 
                    <img src={trainerSig} alt="trainer" 
                         style={{maxHeight:'140px', maxWidth:'100%', marginTop:8, border:'1px solid #e2e8f0', borderRadius:'8px'}} /> 
                    : <div style={{height:'140px',background:'#f1f5f9',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>Awaiting signature</div>}
                  {trainerIp && <div style={{fontSize:'0.8rem',marginTop:4}}>IP: {trainerIp} • {trainerTime}</div>}
                </div>
              </div>
            </div>

            <div className="tf-footer">Comply 365.com</div>
          </div>
        </div>
      </div>
    </>
  );
}