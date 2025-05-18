import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthRedirect = () => {
    const navigate = useNavigate();
  
    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          navigate("/home"); // Редирект на главную для авторизованных
        }
      });
  
      return () => unsubscribe();
    }, [navigate]);
  
    return null;
  };
  
  export default AuthRedirect;