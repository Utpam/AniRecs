import React, { useState } from 'react';
import axios from 'axios';

function ColdStartModal({ onComplete }) {
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState([]);
  const [loading, setLoading] = useState(false);

  const genres = [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
    "Romance", "Sci-Fi", "Slice of Life", "Supernatural", 
    "Mystery", "Horror", "Sports", "Suspense"
  ];

  const themes = [
    "Martial Arts", "Mecha", "Isekai", "School", "Military", 
    "Psychological", "Historical", "Music", "Space", "Super Power"
  ];

  // Standard popular anime with Jikan IDs to seed preference vector
  const popularAnime = [
    { mal_id: 5114, title: "Fullmetal Alchemist: Brotherhood" },
    { mal_id: 16498, title: "Attack on Titan" },
    { mal_id: 1535, title: "Death Note" },
    { mal_id: 21, title: "One Piece" },
    { mal_id: 38000, title: "Demon Slayer: Kimetsu no Yaiba" },
    { mal_id: 40748, title: "Jujutsu Kaisen" },
    { mal_id: 20, title: "Naruto" },
    { mal_id: 31964, title: "My Hero Academia" },
    { mal_id: 11757, title: "Sword Art Online" },
    { mal_id: 9253, title: "Steins;Gate" }
  ];

  const handleToggle = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/recommendations/coldstart`,
        {
          favoriteAnime: selectedAnime,
          favoriteGenres: selectedGenres,
          favoriteThemes: selectedThemes
        },
        { withCredentials: true }
      );
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Failed to save cold start preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
      <div className="relative w-full max-w-2xl mx-4 bg-secondary border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl text-tertiary">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-hanken-black text-white">Customize Your Recommendations</h2>
          <p className="text-xs md:text-sm text-gray-400 font-hanken-light mt-1">
            Step {step} of 3 • Pick features to train your personalized discovery engine
          </p>
        </div>

        {/* Step 1: Genres */}
        {step === 1 && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-sm font-hanken-bold uppercase tracking-wider text-primary mb-4">Choose Favorite Genres</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {genres.map(genre => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    onClick={() => handleToggle(genre, selectedGenres, setSelectedGenres)}
                    className={`py-2 px-3 rounded-lg text-xs md:text-sm font-hanken-med border transition cursor-pointer text-center ${
                      isSelected 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/25" 
                        : "bg-neutral/40 border-white/10 hover:border-white/30 text-gray-300"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(2)}
                disabled={selectedGenres.length === 0}
                className="px-6 py-2.5 bg-primary hover:bg-primary-light text-white font-hanken-bold rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Themes */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-sm font-hanken-bold uppercase tracking-wider text-primary mb-4">Choose Favorite Themes</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {themes.map(theme => {
                const isSelected = selectedThemes.includes(theme);
                return (
                  <button
                    key={theme}
                    onClick={() => handleToggle(theme, selectedThemes, setSelectedThemes)}
                    className={`py-2 px-3 rounded-lg text-xs md:text-sm font-hanken-med border transition cursor-pointer text-center ${
                      isSelected 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/25" 
                        : "bg-neutral/40 border-white/10 hover:border-white/30 text-gray-300"
                    }`}
                  >
                    {theme}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2.5 border border-white/20 hover:border-tertiary text-tertiary font-hanken-bold rounded-full transition cursor-pointer text-sm"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={selectedThemes.length === 0}
                className="px-6 py-2.5 bg-primary hover:bg-primary-light text-white font-hanken-bold rounded-full transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Popular Titles */}
        {step === 3 && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <h3 className="text-sm font-hanken-bold uppercase tracking-wider text-primary mb-4">Have You Watched & Loved Any of These?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {popularAnime.map(anime => {
                const isSelected = selectedAnime.includes(anime.mal_id);
                return (
                  <button
                    key={anime.mal_id}
                    onClick={() => handleToggle(anime.mal_id, selectedAnime, setSelectedAnime)}
                    className={`p-3 rounded-lg text-left text-xs md:text-sm font-hanken-med border transition cursor-pointer flex justify-between items-center ${
                      isSelected 
                        ? "bg-primary/25 border-primary text-white shadow-sm" 
                        : "bg-neutral/40 border-white/10 hover:border-white/30 text-gray-300"
                    }`}
                  >
                    <span className="line-clamp-1">{anime.title}</span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ml-2 ${
                      isSelected ? "border-primary bg-primary text-white" : "border-white/30"
                    }`}>
                      {isSelected && "✓"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 border border-white/20 hover:border-tertiary text-tertiary font-hanken-bold rounded-full transition cursor-pointer text-sm"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 bg-primary hover:bg-primary-light text-white font-hanken-bold rounded-full transition disabled:opacity-40 cursor-pointer text-sm flex items-center gap-2"
              >
                {loading ? "Saving..." : "Start Exploring"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ColdStartModal;
