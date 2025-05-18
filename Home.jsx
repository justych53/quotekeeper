import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, query, orderBy, limit, startAfter, 
  getDocs, updateDoc, doc, arrayUnion, arrayRemove, getDoc,
  increment, deleteField, deleteDoc, addDoc, serverTimestamp, where
} from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import './Home.css';

const Home = ({ user }) => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastQuoteRef = useRef(null);
  const observerRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [userLikes, setUserLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [activeCommentQuote, setActiveCommentQuote] = useState(null);
  const [loadingComments, setLoadingComments] = useState({});

  // Загрузка лайков пользователя
  useEffect(() => {
    if (user) {
      const fetchUserLikes = async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserLikes(userDoc.data().likedQuotes || {});
        }
      };
      fetchUserLikes();
    }
  }, [user]);

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Загрузка цитат
  const loadQuotes = async (lastVisible = null) => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      let q;
      if (lastVisible) {
        q = query(
          collection(db, "quotes"),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(10)
        );
      } else {
        q = query(
          collection(db, "quotes"),
          orderBy("createdAt", "desc"),
          limit(10)
        );
      }

      const querySnapshot = await getDocs(q);
      const newQuotes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        likes: doc.data().likes || [],
        likesCount: doc.data().likesCount || 0,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));

      setQuotes(prev => {
        const existingIds = prev.map(q => q.id);
        const uniqueNewQuotes = newQuotes.filter(q => !existingIds.includes(q.id));
        return [...prev, ...uniqueNewQuotes];
      });
      
      setHasMore(newQuotes.length === 10);
      
      if (querySnapshot.docs.length > 0) {
        lastQuoteRef.current = querySnapshot.docs[querySnapshot.docs.length - 1];
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (quoteId) => {
    if (!user) {
      navigate('/signin');
      return;
    }

    try {
      const quoteRef = doc(db, 'quotes', quoteId);
      const userRef = doc(db, 'users', user.uid);
      
      const isLiked = userLikes[quoteId];
      
      await updateDoc(quoteRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likesCount: increment(isLiked ? -1 : 1)
      });
      
      await updateDoc(userRef, {
        [`likedQuotes.${quoteId}`]: isLiked ? deleteField() : true
      });
      
      setUserLikes(prev => {
        const newLikes = {...prev};
        if (isLiked) delete newLikes[quoteId];
        else newLikes[quoteId] = true;
        return newLikes;
      });
      
      setQuotes(prev => prev.map(q => 
        q.id === quoteId ? {
          ...q,
          likes: isLiked 
            ? q.likes.filter(id => id !== user.uid) 
            : [...q.likes, user.uid],
          likesCount: isLiked ? q.likesCount - 1 : q.likesCount + 1
        } : q
      ));
    } catch (error) {
      console.error('Ошибка лайка:', error);
    }
  };

  const handleDelete = async (quoteId) => {
    if (!user || !window.confirm('Вы уверены, что хотите удалить эту цитату?')) {
      return;
    }

    try {
      setQuotes(prev => prev.map(q => 
        q.id === quoteId ? {...q, isDeleting: true} : q
      ));

      await deleteDoc(doc(db, 'quotes', quoteId));
      
      // Удаляем связанные комментарии
      const commentsQuery = query(
        collection(db, "comments"),
        where("quoteId", "==", quoteId)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const deletePromises = commentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      setComments(prev => {
        const newComments = {...prev};
        delete newComments[quoteId];
        return newComments;
      });
    } catch (error) {
      console.error('Ошибка удаления:', error);
      setQuotes(prev => prev.map(q => 
        q.id === quoteId ? {...q, isDeleting: false} : q
      ));
    }
  };

  const loadComments = async (quoteId) => {
    try {
      setLoadingComments(prev => ({...prev, [quoteId]: true}));
      
      const q = query(
        collection(db, "comments"),
        where("quoteId", "==", quoteId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      const commentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setComments(prev => ({
        ...prev,
        [quoteId]: commentsData
      }));
    } catch (error) {
      console.error("Ошибка загрузки комментариев:", error);
    } finally {
      setLoadingComments(prev => ({...prev, [quoteId]: false}));
    }
  };

  const addComment = async (quoteId) => {
    if (!user) {
      navigate('/signin');
      return;
    }

    if (!newComment.trim()) return;

    try {
      const docRef = await addDoc(collection(db, "comments"), {
        quoteId,
        userId: user.uid,
        userDisplayName: user.displayName || "Аноним",
        userPhotoURL: user.photoURL || null,
        text: newComment,
        createdAt: serverTimestamp()
      });

      const newCommentObj = {
        id: docRef.id,
        quoteId,
        userId: user.uid,
        userDisplayName: user.displayName || "Аноним",
        userPhotoURL: user.photoURL || null,
        text: newComment,
        createdAt: new Date()
      };

      setComments(prev => ({
        ...prev,
        [quoteId]: [newCommentObj, ...(prev[quoteId] || [])]
      }));

      setNewComment("");
    } catch (error) {
      console.error("Ошибка добавления комментария:", error);
    }
  };

  const deleteComment = async (quoteId, commentId) => {
    if (!user || !window.confirm("Удалить комментарий?")) return;

    try {
      await deleteDoc(doc(db, "comments", commentId));
      
      setComments(prev => ({
        ...prev,
        [quoteId]: prev[quoteId].filter(c => c.id !== commentId)
      }));
    } catch (error) {
      console.error("Ошибка удаления комментария:", error);
    }
  };

  // Инициализация загрузки данных
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await loadQuotes();
      } catch (error) {
        console.error("Ошибка загрузки:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Настройка IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadQuotes(lastQuoteRef.current);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/signin");
    } catch (error) {
      console.error("Ошибка выхода:", error);
    }
  };

  return (
    <div className="home-wrapper">
      <header className="home-header">
        <div className="header-content">
          <h1 className="site-title">Сборник цитат</h1>
          <div className="header-actions">
            {user ? (
              <>
                <Link to="/create-quote" className="create-quote-btn">
                  Создать цитату
                </Link>
                <div className="profile-menu" ref={dropdownRef}>
                  <div 
                    className="profile-icon"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Аватар" className="avatar-img" />
                    ) : (
                      <span>{user.displayName?.charAt(0) || "П"}</span>
                    )}
                  </div>
                  
                  <div className={`dropdown-content ${isDropdownOpen ? 'show' : ''}`}>
                    <div className="user-info">
                      <p>{user.displayName || "Пользователь"}</p>
                      <p className="user-email">{user.email}</p>
                    </div>
                    <button onClick={handleLogout} className="logout-btn">
                      Выйти
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button 
                className="signin-btn"
                onClick={() => navigate('/signin')}
              >
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="quotes-feed">
          {quotes.map((quote) => (
            <div key={quote.id} className="quote-card">
              <div className="quote-content">
                <p className="quote-text">"{quote.text}"</p>
                <div className="quote-footer">
                  <div className="quote-meta">
                    <span className="quote-author">— {quote.author}</span>
                    <span className="quote-date">
                      {quote.createdAt.toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <div className="quote-actions">
                    <button
                      className={`like-btn ${userLikes[quote.id] ? 'liked' : ''}`}
                      onClick={() => handleLike(quote.id)}
                      disabled={!user}
                    >
                      {userLikes[quote.id] ? '❤️' : '🤍'} {quote.likesCount || 0}
                    </button>
                    {user?.uid === quote.userId && (
                      <button 
                        className="delete-btn"
                        onClick={() => handleDelete(quote.id)}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
                {quote.userDisplayName && (
                  <div className="quote-user">Добавил: {quote.userDisplayName}</div>
                )}
              </div>
              
              <div className="comments-section">
                <button 
                  className="toggle-comments-btn"
                  onClick={() => {
                    if (!comments[quote.id]) loadComments(quote.id);
                    setActiveCommentQuote(activeCommentQuote === quote.id ? null : quote.id);
                  }}
                  disabled={loadingComments[quote.id]}
                >
                  {loadingComments[quote.id] ? (
                    <span className="comment-spinner"></span>
                  ) : (
                    activeCommentQuote === quote.id ? "Скрыть комментарии" : "Показать комментарии"
                  )}
                </button>

                {activeCommentQuote === quote.id && (
                  <div className="comments-container">
                    {user && (
                      <div className="add-comment-form">
                        <textarea
                          placeholder="Напишите комментарий..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows="2"
                        />
                        <button 
                          onClick={() => addComment(quote.id)}
                          disabled={!newComment.trim()}
                        >
                          Отправить
                        </button>
                      </div>
                    )}

                    {comments[quote.id]?.length > 0 ? (
                      comments[quote.id].map(comment => (
                        <div key={comment.id} className="comment-card">
                          <div className="comment-header">
                            <div className="comment-author">
                              {comment.userPhotoURL ? (
                                <img src={comment.userPhotoURL} alt="Аватар" className="comment-avatar" />
                              ) : (
                                <div className="comment-avatar-placeholder">
                                  {comment.userDisplayName.charAt(0)}
                                </div>
                              )}
                              <span>{comment.userDisplayName}</span>
                            </div>
                            {user?.uid === comment.userId && (
                              <button 
                                className="delete-comment-btn"
                                onClick={() => deleteComment(quote.id, comment.id)}
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                          <div className="comment-text">{comment.text}</div>
                          <div className="comment-date">
                            {comment.createdAt.toLocaleString("ru-RU")}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-comments">
                        {user ? "Пока нет комментариев" : "Авторизуйтесь, чтобы оставить комментарий"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div ref={observerRef} className="loader">
            {loading && <div className="spinner"></div>}
            {!hasMore && !loading && (
              <div className="end-message">Вы просмотрели все цитаты</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;