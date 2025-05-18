import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import CreateQuote from './components/CreateQuote';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="loading-spinner">Загрузка...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Главная страница */}
        <Route path="/" element={<Home user={user} />} />
        
        {/* Дублирующий маршрут для /home (если нужен) */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        
        {/* Авторизация */}
        <Route 
          path="/signin" 
          element={!user ? <SignIn /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/signup" 
          element={!user ? <SignUp /> : <Navigate to="/" replace />} 
        />
        
        {/* Создание цитаты */}
        <Route 
          path="/create-quote" 
          element={user ? <CreateQuote /> : <Navigate to="/signin" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;