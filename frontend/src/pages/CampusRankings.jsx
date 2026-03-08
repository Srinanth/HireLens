import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Loader2, Trophy, Award, Search,
  Code, BookOpen, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CampusRankings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rankings, setRankings] = useState([]);
  const [userRanking, setUserRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const tierColors = {
    'Legendary': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    'Expert': 'bg-purple-100 text-purple-800 border border-purple-300',
    'Advanced': 'bg-blue-100 text-blue-800 border border-blue-300',
    'Intermediate': 'bg-green-100 text-green-800 border border-green-300',
    'Developing': 'bg-orange-100 text-orange-800 border border-orange-300',
    'Beginner': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    'Starter': 'bg-gray-100 text-gray-800 border border-gray-300'
  };

  useEffect(() => {
    fetchRankings();
    if (user?.id) {
      fetchUserRanking();
    }
  }, [page, user?.id]);

  // Fetch global rankings
  const fetchRankings = async () => {
    try {
      setLoading(true);
      console.log('Fetching rankings...');

      const response = await axios.get(
        `http://localhost:5000/api/rankings/global`,
        {
          params: {
            page: page,
            limit: 50
          }
        }
      );

      console.log('Rankings fetched:', response.data.data.length);
      setRankings(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching rankings:', error);
      toast.error('Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's ranking
  const fetchUserRanking = async () => {
    try {
      const authToken = localStorage.getItem('authToken');

      const response = await axios.get(
        'http://localhost:5000/api/rankings/user',
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      console.log('User ranking:', response.data.data);
      setUserRanking(response.data.data);
    } catch (error) {
      console.error('Error fetching user ranking:', error);
    }
  };

  // Search rankings
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }

    try {
      const response = await axios.get(
        'http://localhost:5000/api/rankings/search',
        {
          params: { query: searchQuery }
        }
      );

      console.log('Search results:', response.data.data);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Search failed');
    }
  };

  const getRankMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading && !rankings.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={40} />
          <p className="text-slate-600 text-lg">Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Trophy size={32} className="text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">Rankings</h1>
          </div>
          <p className="text-slate-600 text-lg">
            See how you rank against other students based on overall score
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* User's Ranking Card */}
        {userRanking && (
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border-r border-slate-200 pr-4">
                <p className="text-slate-600 mb-1 font-semibold">Your Rank</p>
                <p className="text-4xl font-bold text-blue-600">#{userRanking.rank}</p>
              </div>
              <div className="border-r border-slate-200 pr-4">
                <p className="text-slate-600 mb-1 font-semibold">Score</p>
                <p className="text-4xl font-bold text-slate-900">{userRanking.overall_score.toFixed(2)}</p>
              </div>
              <div className="border-r border-slate-200 pr-4">
                <p className="text-slate-600 mb-1 font-semibold">Tier</p>
                <p className="text-4xl font-bold text-purple-600">{userRanking.tier}</p>
              </div>
              <div>
                <p className="text-slate-600 mb-1 font-semibold">Percentile</p>
                <p className="text-4xl font-bold text-green-600">{userRanking.percentile}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
            >
              <Search size={20} />
              Search
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Search Results ({searchResults.length})</h2>
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  onClick={() => navigate(`/profile/${result.id}`)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl font-bold text-slate-400">#{result.rank}</div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{result.full_name}</h3>
                      <p className="text-sm text-slate-600">{result.bio || 'No bio'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {result.overall_score.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rankings Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-900 font-bold">Rank</th>
                  <th className="px-6 py-4 text-left text-slate-900 font-bold">Student</th>
                  <th className="px-6 py-4 text-center text-slate-900 font-bold">Score</th>
                  <th className="px-6 py-4 text-center text-slate-900 font-bold">Tier</th>
                  <th className="px-6 py-4 text-center text-slate-900 font-bold">Skills</th>
                  <th className="px-6 py-4 text-center text-slate-900 font-bold">Certs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rankings.map((profile) => (
                  <tr
                    key={profile.id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => navigate(`/profile/${profile.id}`)}
                  >
                    <td className="px-6 py-4 font-bold text-lg">
                      {getRankMedal(profile.rank)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{profile.full_name}</p>
                        <p className="text-sm text-slate-600">{profile.bio || 'No bio'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-lg">
                      {profile.overall_score.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${tierColors[profile.tier]}`}>
                        {profile.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="flex items-center justify-center gap-1 font-semibold">
                        <Code size={16} />
                        {profile.skills_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="flex items-center justify-center gap-1 font-semibold">
                        <Award size={16} />
                        {profile.certifications_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {rankings.length > 0 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="px-4 py-2 font-semibold">Page {page} of {totalPages}</span>
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampusRankings;