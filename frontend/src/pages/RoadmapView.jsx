import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Loader2, BookOpen, Calendar, Target, CheckCircle, 
  Trash2, AlertCircle, ChevronDown, ChevronUp, Award,
  Clock, Zap, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RoadmapView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [roadmaps, setRoadmaps] = useState([]);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [completedPhases, setCompletedPhases] = useState({});
  const [updatingProgress, setUpdatingProgress] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchRoadmaps();
    } else {
      toast.error('Please login to view roadmaps');
      navigate('/login');
    }
  }, [user]);

  // Fetch all user roadmaps
  const fetchRoadmaps = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');

      if (!authToken) {
        toast.error('Please login to view roadmaps');
        navigate('/login');
        return;
      }

      console.log('Fetching roadmaps...');

      const response = await axios.get(
        'http://localhost:5000/api/roadmap',
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Roadmaps fetched:', response.data.data);
      setRoadmaps(response.data.data || []);

      // Set first roadmap as active if exists
      if (response.data.data && response.data.data.length > 0) {
        setActiveRoadmap(response.data.data[0]);
        // Initialize completed phases from metadata
        if (response.data.data[0].metadata?.completed_phases) {
          setCompletedPhases(response.data.data[0].metadata.completed_phases);
        }
      }
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error('Failed to load roadmaps');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle phase completion toggle
  const handlePhaseCompletion = async (phaseIndex) => {
    if (!activeRoadmap) return;

    try {
      const isCompleting = !completedPhases[phaseIndex];
      const newCompletedPhases = { ...completedPhases };
      newCompletedPhases[phaseIndex] = isCompleting;
      setCompletedPhases(newCompletedPhases);

      // Calculate new progress percentage
      const totalPhases = activeRoadmap.roadmap_data?.phases?.length || 1;
      const completedCount = Object.values(newCompletedPhases).filter(v => v).length;
      const newProgress = Math.round((completedCount / totalPhases) * 100);

      setUpdatingProgress(true);

      const authToken = localStorage.getItem('authToken');

      // Update roadmap with new progress and metadata
      const response = await axios.patch(
        `http://localhost:5000/api/roadmap/${activeRoadmap.id}`,
        {
          progress_percentage: newProgress,
          status: newProgress === 100 ? 'Completed' : 'In Progress',
          metadata: {
            completed_phases: newCompletedPhases
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update state
      const updatedRoadmap = response.data.data;
      setActiveRoadmap(updatedRoadmap);
      setRoadmaps(prev =>
        prev.map(r =>
          r.id === activeRoadmap.id ? updatedRoadmap : r
        )
      );

      const action = isCompleting ? 'marked as complete' : 'marked as incomplete';
      toast.success(`Phase ${phaseIndex + 1} ${action}!`);
    } catch (error) {
      console.error('Error updating phase completion:', error);
      toast.error('Failed to update phase completion');
      // Revert the state
      setCompletedPhases(prev => ({
        ...prev,
        [phaseIndex]: !prev[phaseIndex]
      }));
    } finally {
      setUpdatingProgress(false);
    }
  };

  // Delete roadmap
  const handleDeleteRoadmap = async (roadmapId) => {
    if (!window.confirm('Are you sure you want to delete this roadmap?')) {
      return;
    }

    try {
      setDeleting(roadmapId);
      const authToken = localStorage.getItem('authToken');

      await axios.delete(
        `http://localhost:5000/api/roadmap/${roadmapId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      // Remove from state
      setRoadmaps(prev => prev.filter(r => r.id !== roadmapId));
      if (activeRoadmap?.id === roadmapId) {
        setActiveRoadmap(roadmaps.find(r => r.id !== roadmapId) || null);
      }

      toast.success('Roadmap deleted successfully');
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
    } finally {
      setDeleting(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-slate-600">Loading your roadmaps...</p>
        </div>
      </div>
    );
  }

  if (!roadmaps || roadmaps.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-12 text-center">
            <BookOpen className="mx-auto mb-4 text-slate-400" size={48} />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Roadmaps Yet</h2>
            <p className="text-slate-600 mb-6">
              Generate a learning roadmap by applying to a job and clicking "Generate Learning Roadmap"
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Browse Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Learning Roadmaps</h1>
          <p className="text-slate-600">Track your progress and complete your learning goals</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Roadmap List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <BookOpen size={20} />
                  Your Roadmaps
                </h2>
              </div>

              <div className="divide-y max-h-96 overflow-y-auto">
                {roadmaps.map(roadmap => (
                  <div
                    key={roadmap.id}
                    onClick={() => {
                      setActiveRoadmap(roadmap);
                      if (roadmap.metadata?.completed_phases) {
                        setCompletedPhases(roadmap.metadata.completed_phases);
                      } else {
                        setCompletedPhases({});
                      }
                    }}
                    className={`p-4 cursor-pointer transition ${
                      activeRoadmap?.id === roadmap.id
                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <h3 className="font-semibold text-slate-900 text-sm mb-2">
                      {roadmap.job_title}
                    </h3>
                    <p className="text-xs text-slate-600 mb-2">{roadmap.company_name}</p>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${roadmap.progress_percentage || 0}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">{roadmap.progress_percentage || 0}%</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        roadmap.status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {roadmap.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Roadmap Details */}
          <div className="lg:col-span-3">
            {activeRoadmap ? (
              <div className="space-y-6">
                {/* Roadmap Header */}
                <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        {activeRoadmap.job_title}
                      </h1>
                      <p className="text-slate-600 font-semibold text-lg">
                        {activeRoadmap.company_name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteRoadmap(activeRoadmap.id)}
                      disabled={deleting === activeRoadmap.id}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      {deleting === activeRoadmap.id ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </button>
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Calendar size={16} />
                        <span className="text-xs font-semibold">Created</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatDate(activeRoadmap.created_at)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Clock size={16} />
                        <span className="text-xs font-semibold">Duration</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {activeRoadmap.roadmap_data?.totalWeeks || '?'} weeks
                      </p>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-600 mb-1">
                        <Zap size={16} />
                        <span className="text-xs font-semibold">To Job Ready</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {activeRoadmap.roadmap_data?.estimatedMonthsToJobReady || '?'} months
                      </p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <Award size={16} />
                        <span className="text-xs font-semibold">Progress</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {activeRoadmap.progress_percentage || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-slate-900">Overall Progress</span>
                      <span className="text-sm text-slate-600">{activeRoadmap.progress_percentage || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-blue-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${activeRoadmap.progress_percentage || 0}%` }}
                      >
                        {activeRoadmap.progress_percentage > 0 && (
                          <span className="text-white text-xs font-bold">{activeRoadmap.progress_percentage}%</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Complete phases below to update progress
                    </p>
                  </div>
                </div>

                {/* Phases and Weeks */}
                {activeRoadmap.roadmap_data?.phases && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      <Target size={24} />
                      Learning Phases
                    </h2>

                    {activeRoadmap.roadmap_data.phases.map((phase, phaseIndex) => {
                      const isPhaseCompleted = completedPhases[phaseIndex];
                      const progressPercentagePerPhase = Math.round(100 / (activeRoadmap.roadmap_data.phases.length || 1));

                      return (
                        <div 
                          key={phaseIndex} 
                          className={`rounded-lg shadow-md border overflow-hidden transition ${
                            isPhaseCompleted
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          {/* Phase Header */}
                          <button
                            onClick={() => setExpandedPhase(expandedPhase === phaseIndex ? null : phaseIndex)}
                            className={`w-full p-4 flex items-center justify-between transition ${
                              isPhaseCompleted ? 'hover:bg-green-100' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 text-left flex-1">
                              {/* Checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePhaseCompletion(phaseIndex);
                                }}
                                disabled={updatingProgress}
                                className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                                  isPhaseCompleted
                                    ? 'bg-green-600 border-green-600'
                                    : 'border-slate-300 hover:border-green-600'
                                } disabled:opacity-50`}
                              >
                                {isPhaseCompleted && (
                                  <Check size={16} className="text-white" />
                                )}
                              </button>

                              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-lg">
                                <span className="font-bold">{phaseIndex + 1}</span>
                              </div>

                              <div>
                                <h3 className={`font-bold text-lg ${isPhaseCompleted ? 'text-green-700 line-through' : 'text-slate-900'}`}>
                                  {phase.phase}
                                </h3>
                                <p className="text-sm text-slate-600">
                                  {phase.difficulty} • {phase.duration} • {progressPercentagePerPhase}%
                                </p>
                              </div>
                            </div>
                            {expandedPhase === phaseIndex ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </button>

                          {/* Phase Content */}
                          {expandedPhase === phaseIndex && (
                            <div className={`border-t p-4 space-y-4 ${isPhaseCompleted ? 'border-green-200' : 'border-slate-200'}`}>
                              {/* Skills */}
                              {phase.skills && phase.skills.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-2">Skills Covered</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {phase.skills.map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Weeks */}
                              {phase.weeks && phase.weeks.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-3">Weekly Breakdown</h4>
                                  <div className="space-y-3">
                                    {phase.weeks.map((week, weekIndex) => (
                                      <div key={weekIndex} className="border border-slate-200 rounded-lg overflow-hidden">
                                        {/* Week Header */}
                                        <button
                                          onClick={() => setExpandedWeek(expandedWeek === `${phaseIndex}-${weekIndex}` ? null : `${phaseIndex}-${weekIndex}`)}
                                          className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition bg-slate-50"
                                        >
                                          <div className="text-left">
                                            <h5 className="font-semibold text-slate-900">
                                              Week {week.week}: {week.topic}
                                            </h5>
                                          </div>
                                          {expandedWeek === `${phaseIndex}-${weekIndex}` ? (
                                            <ChevronUp size={16} />
                                          ) : (
                                            <ChevronDown size={16} />
                                          )}
                                        </button>

                                        {/* Week Details */}
                                        {expandedWeek === `${phaseIndex}-${weekIndex}` && (
                                          <div className="p-4 space-y-3 border-t border-slate-200">
                                            {week.learning_objective && (
                                              <div>
                                                <p className="text-sm font-semibold text-slate-700 mb-1">Learning Objective</p>
                                                <p className="text-sm text-slate-600">{week.learning_objective}</p>
                                              </div>
                                            )}

                                            

                                            {week.tasks && week.tasks.length > 0 && (
                                              <div>
                                                <p className="text-sm font-semibold text-slate-700 mb-2">Tasks</p>
                                                <ul className="space-y-1">
                                                  {week.tasks.map((task, tidx) => (
                                                    <li key={tidx} className="text-sm text-slate-600 flex items-start gap-2">
                                                      <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                                                      {task}
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Projects */}
                              {phase.projects && phase.projects.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-2">Projects</h4>
                                  <ul className="space-y-2">
                                    {phase.projects.map((project, idx) => (
                                      <li key={idx} className="flex items-start gap-2 text-slate-700">
                                        <Award size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                                        <span>{project}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Final Project */}
                {activeRoadmap.roadmap_data?.finalProject && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-md border border-purple-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Zap size={24} className="text-purple-600" />
                      Capstone Project
                    </h2>
                    <p className="text-slate-700 mb-4">{activeRoadmap.roadmap_data.finalProject}</p>
                    <p className="text-sm text-slate-600">
                      This project will solidify all your learnings and prepare you for real-world scenarios in your job role.
                    </p>
                  </div>
                )}

                {/* Tips */}
                
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md border border-slate-200 p-12 text-center">
                <AlertCircle className="mx-auto mb-4 text-slate-400" size={48} />
                <p className="text-slate-600">Select a roadmap to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapView;