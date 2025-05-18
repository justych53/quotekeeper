import { auth, db } from "../firebase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { serverTimestamp, addDoc, collection } from "firebase/firestore";
import "./createquote.css";

const CreateQuote = () => {
    const [authorName, setAuthorName] = useState("");
    const [quote, setQuote] = useState("");
    const [error, setError] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const user = auth.currentUser;

    const postQuote = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
        await addDoc(collection(db, "quotes"), {
            userId: user.uid,
            author: authorName,
            text: quote,
            createdAt: serverTimestamp(),
            userDisplayName: user.displayName || "Аноним",
            likes: [], // Инициализируем пустой массив лайков
            likesCount: 0 // Инициализируем счетчик лайков
        });

        setIsSuccess(true);
        setTimeout(() => {
            navigate("/home");
        }, 1500);
        
    } catch (error) {
        console.error("Произошла ошибка:", error);
        setError(error.message);
    } finally {
        setIsLoading(false);
    }
};  

    return (
        <div className="create-quote-container">
            <header className="create-quote-header">
                <h1>Размещение цитаты</h1>
                <button 
                    onClick={() => navigate("/home")} 
                    className="back-btn"
                >
                    Назад
                </button>
            </header>
            
            <form onSubmit={postQuote} className="quote-form">
                {error && <p className="error-message">{error}</p>}
                {isSuccess && (
                    <p className="success-message">
                        Цитата успешно опубликована! Перенаправляем...
                    </p>
                )}
                
                <div className="form-group">
                    <label>Автор цитаты</label>
                    <input
                        type="text"
                        placeholder="Например: Альберт Эйнштейн"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label>Текст цитаты</label>
                    <textarea
                        placeholder="Введите текст цитаты..."
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                        required
                        rows="5"
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading}
                >
                    {isLoading ? "Публикация..." : "Опубликовать"}
                </button>
            </form>
        </div>
    );
};

export default CreateQuote;