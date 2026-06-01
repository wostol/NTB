// frontend/src/components/HeartButton.jsx
import { useState, useEffect } from 'react';
import { favoritesAPI } from '../services/favorites';

export default function HeartButton({ computer_id, className = '' }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  // Проверка при загрузке
  useEffect(() => {
    const check = async () => {
      try {
        const res = await favoritesAPI.isFavorite(computer_id);
        setIsFavorite(res);
      } catch {
        setIsFavorite(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [computer_id]);

  // Переключение
  const toggle = async (e) => {
    e.stopPropagation(); // Чтобы не срабатывал клик по карточке ПК
    try {
      if (isFavorite) {
        await favoritesAPI.remove(computer_id);
      } else {
        await favoritesAPI.add(computer_id);
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('❌ Favorite toggle error:', err);
      alert('Не удалось обновить избранное');
    }
  };

  if (loading) return <span style={{ cursor: 'wait' }}>⏳</span>;

  return (
    <button
      onClick={toggle}
      className={className}
      title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.3rem',
        padding: '4px 8px',
        transition: 'transform 0.1s',
        color: isFavorite ? '#ef4444' : '#cbd5e1',
      }}
      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
}