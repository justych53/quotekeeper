import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import "./auth.css";
import { Link } from "react-router-dom";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    try {
      // 1. Создаем пользователя в Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email, 
        password
      );

      // 2. Обновляем displayName в профиле пользователя
      await updateProfile(auth.currentUser, {
        displayName: displayName
      });

      // 3. Сохраняем дополнительные данные в Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email,
        displayName: displayName,
        createdAt: serverTimestamp()
      });

      // 4. Автоматический вход и перенаправление
      navigate("/home");

    } catch (error) {
      console.error("Ошибка регистрации:", error);
      setError(error.message);
    }
  };

  return (
    <div className="auth-form">
      <h2>Регистрация</h2>
      {error && <p className="error">{error}</p>}
      
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Ваше имя"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Зарегистрироваться</button>
        
        <div className="auth-footer">
          Уже есть аккаунт? <Link to="/signin">Войдите</Link>
        </div>
      </form>
    </div>
  );
};

export default SignUp;