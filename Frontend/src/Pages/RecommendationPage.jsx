import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * /discover now redirects to /explore (SearchPage).
 * This keeps any old bookmarks / links working.
 */
function RecommendationPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/explore', { replace: true });
  }, [navigate]);

  return null;
}

export default RecommendationPage;
