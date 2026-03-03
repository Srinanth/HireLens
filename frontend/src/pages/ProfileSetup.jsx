import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Upload, Github, Plus, X, Loader2 } from 'lucide-react';

const ProfileSetup = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    location: '',
    bio: '',
    github_username: '',
    linkedin_url: '',
    portfolio_url: '',
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    internships: [],
    achievements: []
  });

  // Redirect if not logged in
  useEffect(() => {
    const authToken = localStorage.getItem('authToken') || token;
    console.log('ProfileSetup - Auth Token:', authToken ? 'Present' : 'Missing');
    console.log('ProfileSetup - User:', user);

    if (!user && !authToken) {
      toast.error('Please login first');
      navigate('/login');
    }
  }, [user, token, navigate]);

  // Get auth token from context or localStorage
  const getAuthToken = () => {
    if (token) {
      console.log('Token from context');
      return token;
    }
    
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      console.log('Token from localStorage');
      return storedToken;
    }

    console.warn('No auth token found');
    return null;
  };

  // --- FEATURE 1: RESUME UPLOAD & PARSING ---
  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      console.warn('Invalid file type:', file.type);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      console.warn('File too large:', file.size);
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const authToken = getAuthToken();

      if (!authToken) {
        console.error('No authentication token available');
        toast.error('Authentication required. Please login again.');
        navigate('/login');
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('resume', file);

      console.log('Starting resume upload...');
      console.log('Endpoint: http://localhost:5000/api/resume/parse');
      console.log('Auth Token length:', authToken.length);

      const response = await axios.post(
        'http://localhost:5000/api/resume/parse',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${authToken}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      );

      console.log('Resume upload successful:', response.data);

      if (response.data.success) {
        const parsedResume = response.data.data;
        console.log('Parsed resume data:', parsedResume);

        // Extract data from parsed resume
        const extractedData = {
          fullName: parsedResume.personalInfo?.fullName || formData.fullName,
          location: parsedResume.personalInfo?.location || formData.location,
          linkedin_url: parsedResume.personalInfo?.linkedinUrl || formData.linkedin_url,
          portfolio_url: parsedResume.personalInfo?.portfolioUrl || formData.portfolio_url,
          skills: [...new Set([...formData.skills, ...(parsedResume.skills || [])])],
          experience: parsedResume.experience || [],
          education: parsedResume.education || [],
          projects: parsedResume.projects || [],
          certifications: parsedResume.certifications || [],
          internships: parsedResume.internships || [],
          achievements: parsedResume.achievements || []
        };

        console.log('Extracted data:', extractedData);

        setFormData(prev => ({
          ...prev,
          ...extractedData
        }));

        toast.success('Resume parsed successfully! Review and update details as needed.');
      } else {
        console.error('Unexpected response format:', response.data);
        toast.error('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Resume upload error:', error);

      // Log detailed error information
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        console.error('Error response headers:', error.response.headers);

        if (error.response.status === 401) {
          console.error('Authentication failed - token may be invalid or expired');
          toast.error('Authentication failed. Please login again.');
          localStorage.removeItem('authToken');
          navigate('/login');
        } else if (error.response.status === 400) {
          console.error('Bad request - file validation failed');
          toast.error(error.response.data.error || 'Invalid file format');
        } else if (error.response.status === 500) {
          console.error('Server error occurred');
          toast.error('Server error. Please check the backend logs.');
        } else {
          toast.error(error.response.data.error || 'Failed to parse resume');
        }
      } else if (error.request) {
        console.error('No response from server. Request:', error.request);
        toast.error('No response from server. Please check if backend is running.');
      } else if (error.message === 'Network Error') {
        console.error('Network error occurred');
        toast.error('Network error. Please check your connection.');
      } else {
        console.error('Unknown error:', error.message);
        toast.error('An unexpected error occurred: ' + error.message);
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  // --- FEATURE 2: GITHUB SKILL SYNC ---
  const syncGithubSkills = async () => {
    if (!formData.github_username) {
      toast.error('Enter GitHub username first');
      return;
    }

    setLoading(true);
    try {
      const authToken = getAuthToken();

      if (!authToken) {
        toast.error('Authentication required. Please login again.');
        navigate('/login');
        return;
      }

      const response = await axios.get(
        `http://localhost:5000/api/skills/github/${formData.github_username}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (response.data.skills) {
        const githubSkills = response.data.skills;
        const mergedSkills = [...new Set([...formData.skills, ...githubSkills])];

        setFormData(prev => ({
          ...prev,
          skills: mergedSkills
        }));

        toast.success(`Added ${githubSkills.length} skills from GitHub!`);
      }
    } catch (error) {
      console.error('Error syncing GitHub skills:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch GitHub skills');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add skill manually
  const addSkill = (skill) => {
    if (skill.trim() && !formData.skills.includes(skill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
  };

  // Remove skill
  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  // Save profile
  const saveProfile = async () => {
    if (!formData.fullName || !formData.location) {
      toast.error('Please fill in required fields: Full Name and Location');
      return;
    }

    setLoading(true);
    try {
      const authToken = getAuthToken();

      if (!authToken) {
        toast.error('Authentication required. Please login again.');
        navigate('/login');
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/api/profile',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('Profile saved successfully!');
      navigate('/jobs');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">Complete Your Profile</h1>

      {/* Basic Info */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Basic Information</h2>

        <div className="space-y-4">
          <input
            type="text"
            name="fullName"
            placeholder="Full Name *"
            value={formData.fullName}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />

          <input
            type="text"
            name="location"
            placeholder="Location *"
            value={formData.location}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />

          <textarea
            name="bio"
            placeholder="Bio (Optional)"
            value={formData.bio}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            rows="3"
          />
        </div>
      </div>

      {/* Resume Upload */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Upload Resume</h2>

        <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-blue-400 rounded-lg cursor-pointer hover:bg-blue-50 transition">
          {loading && uploadProgress > 0 ? (
            <div className="text-center">
              <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={24} />
              <span className="text-blue-600 font-semibold">
                Uploading... {uploadProgress}%
              </span>
            </div>
          ) : (
            <>
              <Upload size={24} className="text-blue-600 mr-2" />
              <span className="text-blue-600 font-semibold">
                Click to upload PDF resume
              </span>
            </>
          )}
          <input
            type="file"
            accept=".pdf"
            onChange={handleResumeUpload}
            disabled={loading}
            className="hidden"
          />
        </label>

        <p className="text-sm text-slate-500 mt-2">
          We'll automatically extract your skills, experience, education, and projects
        </p>
      </div>

      {/* GitHub Sync */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">GitHub Integration</h2>

        <div className="flex gap-2">
          <input
            type="text"
            name="github_username"
            placeholder="GitHub username"
            value={formData.github_username}
            onChange={handleInputChange}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={syncGithubSkills}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Github size={18} />
            Sync Skills
          </button>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Skills</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {formData.skills.map((skill, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            id="skillInput"
            placeholder="Add skill and press Enter"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addSkill(e.target.value);
                e.target.value = '';
              }
            }}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={() => {
              const input = document.getElementById('skillInput');
              addSkill(input.value);
              input.value = '';
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Social Links</h2>

        <div className="space-y-4">
          <input
            type="url"
            name="linkedin_url"
            placeholder="LinkedIn URL"
            value={formData.linkedin_url}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />

          <input
            type="url"
            name="portfolio_url"
            placeholder="Portfolio URL"
            value={formData.portfolio_url}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={saveProfile}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-semibold"
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>

        <button
          onClick={() => navigate('/jobs')}
          className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 transition font-semibold"
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
};

export default ProfileSetup;