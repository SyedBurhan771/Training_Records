import { useState } from 'react';
import axios from 'axios';

export default function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', { username, password });
      setToken(res.data.token);
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e0f2fe, #f8fafc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          padding: '40px 30px',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
        }}
      >
        <h2
          style={{
            fontSize: '28px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '10px',
            color: '#0f172a'
          }}
        >
          Welcome Back 👋
        </h2>

        <p
          style={{
            textAlign: 'center',
            color: '#64748b',
            marginBottom: '30px'
          }}
        >
          Login to your training portal
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '16px',
              outline: 'none'
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '16px',
              outline: 'none'
            }}
          />

          {error && (
            <p style={{ color: '#dc2626', textAlign: 'center', fontSize: '14px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              marginTop: '10px',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: '#0ea5e9',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: '0.3s'
            }}
            onMouseOver={(e) => (e.target.style.background = '#0284c7')}
            onMouseOut={(e) => (e.target.style.background = '#0ea5e9')}
          >
            Login
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#94a3b8',
            marginTop: '20px'
          }}
        >
          Demo: admin / admin123
        </p>
      </div>
    </div>
  );
}