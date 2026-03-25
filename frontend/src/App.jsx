import { useState, useEffect } from 'react';
import Login from './Login';
import TrainingForm from './TrainingForm';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
  }, [token]);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {!token ? (
        <Login setToken={setToken} />
      ) : (
        <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-blue-700">Training Record Portal</h1>
            <button onClick={logout} className="bg-red-600 text-white px-6 py-2 rounded-xl">Logout</button>
          </div>
          <TrainingForm token={token} />
        </div>
      )}
    </div>
  );
}

export default App;