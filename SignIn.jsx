import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import "./auth.css";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/home");
    } catch (error) {
      setError("Неверный email или пароль");
    }
  };

  return (
    <div className="auth-form">
      <h2>Вход</h2>
      {error && <p className="error">{error}</p>}
      
      <form onSubmit={handleLogin}>
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
        <button type="submit">Войти</button>
        
        <div className="auth-footer">
          Нет аккаунта? <Link to="/signup">Зарегистрируйтесь</Link>
        </div>
      </form>
    </div>
  );
};

export default SignIn;