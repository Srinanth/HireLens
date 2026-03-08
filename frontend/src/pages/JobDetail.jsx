import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, MapPin, DollarSign, Briefcase, Zap, ExternalLink, AlertCircle, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SkillBadge from '../components/profile/SkillBadge';
import RoadmapModal from '../components/profile/RoadmapModal';

const authToken = localStorage.getItem('authToken');
console.log(authToken);

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);


  useEffect(() => {
    fetchJobDetails();
    fetchUserProfile();
  }, [id]);

  // Fetch job details from backend
  const fetchJobDetails = async () => {
    try {
      setLoadingJob(true);
      console.log('Fetching job details for ID:', id);

      const response = await axios.get(
        `http://localhost:5000/api/jobs/${id}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Job details received:', response.data);
      
      // Ensure job object is properly set
      if (response.data && typeof response.data === 'object') {
        setJob(response.data);
      } else {
        console.error('Invalid job data format:', response.data);
        toast.error('Invalid job data received');
        setTimeout(() => navigate('/jobs'), 2000);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        toast.error(error.response.data?.error || 'Failed to load job details');
      } else if (error.request) {
        console.error('No response received:', error.request);
        toast.error('No response from server');
      } else {
        console.error('Error setting up request:', error.message);
        toast.error('Failed to load job details');
      }
      setTimeout(() => navigate('/jobs'), 2000);
    } finally {
      setLoadingJob(false);
    }
  };

  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.log('No auth token found');
        return;
      }

      const response = await axios.get(
        'http://localhost:5000/api/profile',
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('User profile received:', response.data.data);
      if (response.data.data) {
        setProfile(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Profile might not exist yet, which is okay
    }
  };

  // Handle apply for job
  const handleApplyJob = async () => {
    try {
      if (!user?.id) {
        toast.error('Please login to apply for jobs');
        navigate('/login');
        return;
      }

      if (!job) {
        toast.error('Job details not loaded');
        return;
      }

      setIsApplying(true);

      console.log('Applying for job:', {
        userId: user.id,
        jobId: id,
        jobTitle: job.title,
        company: job.company
      });

      const authToken = localStorage.getItem('authToken');

      // Save to applied_jobs table
      const response = await axios.post(
        'http://localhost:5000/api/jobs/apply',
        {
          jobId: id,
          jobTitle: job.title,
          company: job.company,
          jobUrl: job.url,
          status: 'Applied'
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Applied job saved:', response.data);
      toast.success('Applied successfully! Opening job application link...');

      // Open the ACTUAL job application URL in a new tab
      if (job.url) {
        window.open(job.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.warning('No external link available for this job');
      }

      // Redirect to applied jobs after delay
      setTimeout(() => {
        navigate('/applied');
      }, 2000);
    } catch (error) {
      console.error('Error applying for job:', error);

      if (error.response?.status === 400) {
        toast.error(error.response?.data?.error || 'You have already applied to this job');
      } else if (error.response?.status === 401) {
        toast.error('Please login to apply for jobs');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.error || 'Failed to apply for job');
      }
    } finally {
      setIsApplying(false);
    }
  };

  // Generate and save roadmap
  const handleGenerateRoadmap = async () => {
    try {
      if (!user?.id) {
        toast.error('Please login to generate a roadmap');
        navigate('/login');
        return;
      }

      if (!job?.skills || job.skills.length === 0) {
        toast.warning('No skills available for this job');
        return;
      }

      setIsGeneratingRoadmap(true);
      const authToken = localStorage.getItem('authToken');

      console.log('Generating roadmap for skills:', job.skills);

      // Create roadmap by calling backend API
      const response = await axios.post(
        'http://localhost:5000/api/roadmap/generate',
        {
          skills: job.skills,
          jobTitle: job.title,
          company: job.company,
          jobId: id
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Roadmap generated:', response.data);
      toast.success('Roadmap generated successfully!');
      
      // Redirect to roadmap page to view the generated roadmap
      setTimeout(() => {
        navigate('/roadmap');
      }, 1500);
    } catch (error) {
      console.error('Error generating roadmap:', error);

      if (error.response?.status === 401) {
        toast.error('Please login to generate a roadmap');
        navigate('/login');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.error || 'Invalid skills for roadmap');
      } else {
        toast.error(error.response?.data?.error || 'Failed to generate roadmap');
      }
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-slate-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Job Not Found</h1>
          <p className="text-slate-600 mb-4">The job listing you're looking for doesn't exist</p>
          <button
            onClick={() => navigate('/jobs')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/jobs')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
          >
            ← Back to Jobs
          </button>

          <h1 className="text-4xl font-bold text-slate-900 mb-4">{job.title || 'Job Title'}</h1>

          <div className="flex flex-wrap gap-6 mb-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Briefcase size={20} className="text-blue-600" />
              <span className="font-semibold">{job.company || 'N/A'}</span>
            </div>

            {job.location && (
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin size={20} className="text-blue-600" />
                <span>{job.location}</span>
              </div>
            )}

            {job.salary && (
              <div className="flex items-center gap-2 text-slate-700">
                <DollarSign size={20} className="text-blue-600" />
                <span className="font-semibold">{job.salary}</span>
              </div>
            )}
          </div>

          {job.posted_date && (
            <p className="text-slate-600 text-sm">
              Posted on {new Date(job.posted_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Job Description */}
          <div className="lg:col-span-2 space-y-8">
            {/* About the Role */}
            {job.description && (
              <section className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">About the Role</h2>
                <div
                  className="text-slate-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: job.description
                      ?.replace(/<[^>]*>/g, '') // Remove HTML tags
                      ?.replace(/\n/g, '<br/>') // Convert newlines to breaks
                  }}
                />
              </section>
            )}

            {/* Required Skills */}
            {job.skills && job.skills.length > 0 && (
              <section className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-3 mb-6">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold text-sm hover:bg-blue-100 transition"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                
                {/* Generate Roadmap Button */}
                <button
                  onClick={handleGenerateRoadmap}
                  disabled={isGeneratingRoadmap}
                  className="px-6 py-3 bg-linear-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition font-semibold flex items-center gap-2 w-full justify-center disabled:from-slate-400 disabled:to-slate-400"
                >
                  {isGeneratingRoadmap ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Generating Roadmap...
                    </>
                  ) : (
                    <>
                      <BookOpen size={20} />
                      Generate Learning Roadmap
                    </>
                  )}
                </button>
              </section>
            )}

            {/* No Skills Available */}
            {(!job.skills || job.skills.length === 0) && (
              <section className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                <div className="text-center">
                  <AlertCircle className="mx-auto mb-3 text-amber-500" size={32} />
                  <p className="text-slate-600">No specific skills listed for this job</p>
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Apply Button */}
            <div className="bg-blue-600 text-white p-6 rounded-lg shadow-md">
              <button
                onClick={handleApplyJob}
                disabled={isApplying}
                className="w-full px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-slate-100 transition disabled:bg-slate-300 flex items-center justify-center gap-2 mb-4"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Applying...
                  </>
                ) : (
                  <>
                    <ExternalLink size={20} />
                    Apply Now
                  </>
                )}
              </button>
              <p className="text-sm text-blue-100">
                Click to apply and open the external job application
              </p>
            </div>

            

            {/* Profile Completion Card */}
            {!profile && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <AlertCircle className="text-amber-600 mb-2" size={20} />
                <h3 className="font-semibold text-amber-900 mb-2">Complete Your Profile</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Add your skills to track your progress
                </p>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition text-sm font-semibold"
                >
                  Complete Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;