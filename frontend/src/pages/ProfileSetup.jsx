import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Loader2, Upload, X, Plus, Trash2 } from 'lucide-react';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    location: '',
    bio: '',
    cgpa: '',
    github_username: '',
    linkedin_url: '',
    website_url: '',
    resume_url: ''
  });

  const [formState, setFormState] = useState({
    personalInfo: {
      fullName: '',
      location: '',
      bio: '',
      githubUrl: '',
      linkedinUrl: '',
      portfolioUrl: '',
      email: '',
      phone: ''
    },
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    internships: [],
    achievements: [],
    resumeFile: null
  });

  const [newSkill, setNewSkill] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    experience: false,
    education: false,
    projects: false
  });

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        console.log('No auth token found');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Profile loaded:', response.data.data);

      if (response.data.data) {
        const profile = response.data.data;
        setFormState(prev => ({
          ...prev,
          personalInfo: {
            fullName: profile.full_name || '',
            location: profile.location || '',
            bio: profile.bio || '',
            githubUrl: profile.github_username || '',
            linkedinUrl: profile.linkedin_url || '',
            portfolioUrl: profile.website_url || '',
            email: profile.email || '',
            phone: profile.phone || ''
          },
          skills: profile.skills || [],
          experience: profile.experience || [],
          education: profile.education || [],
          projects: profile.projects || [],
          certifications: profile.certifications || [],
          internships: profile.internships || [],
          achievements: profile.achievements || [],
          resumeFile: profile.resume_url ? { url: profile.resume_url } : null
        }));

        setFormData({
          fullName: profile.full_name || '',
          location: profile.location || '',
          bio: profile.bio || '',
          cgpa: profile.cgpa || '',
          github_username: profile.github_username || '',
          linkedin_url: profile.linkedin_url || '',
          website_url: profile.website_url || '',
          resume_url: profile.resume_url || ''
        });
      }
    } catch (error) {
      console.log('No existing profile or error loading:', error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Also update formState for consistency
    if (name === 'fullName' || name === 'location' || name === 'bio' || 
        name === 'github_username' || name === 'linkedin_url' || name === 'website_url') {
      setFormState(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          [name === 'github_username' ? 'githubUrl' : 
           name === 'linkedin_url' ? 'linkedinUrl' : 
           name === 'website_url' ? 'portfolioUrl' :
           name === 'fullName' ? 'fullName' :
           name === 'location' ? 'location' :
           name === 'bio' ? 'bio' : name]: value
        }
      }));
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    try {
      setLoading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('resume', file);

      const authToken = localStorage.getItem('authToken');

      const response = await axios.post(
        'http://localhost:5000/api/resume/parse',
        formDataUpload,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(percent);
          }
        }
      );

      console.log('Resume parsed:', response.data);

      if (response.data.success) {
        const parsedData = response.data.data;
        
        // Auto-fill form with parsed data
        setFormState(prev => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            fullName: parsedData.personalInfo?.fullName || prev.personalInfo.fullName,
            location: parsedData.personalInfo?.location || prev.personalInfo.location,
            email: parsedData.personalInfo?.email || prev.personalInfo.email,
            phone: parsedData.personalInfo?.phone || prev.personalInfo.phone,
            githubUrl: parsedData.personalInfo?.githubUrl || prev.personalInfo.githubUrl,
            linkedinUrl: parsedData.personalInfo?.linkedinUrl || prev.personalInfo.linkedinUrl,
            portfolioUrl: parsedData.personalInfo?.portfolioUrl || prev.personalInfo.portfolioUrl
          },
          skills: parsedData.skills || prev.skills,
          experience: parsedData.experience || prev.experience,
          education: parsedData.education || prev.education,
          projects: parsedData.projects || prev.projects,
          certifications: parsedData.certifications || prev.certifications,
          internships: parsedData.internships || prev.internships,
          achievements: parsedData.achievements || prev.achievements,
          resumeFile: { url: file.name }
        }));

        // Update formData as well
        setFormData(prev => ({
          ...prev,
          fullName: parsedData.personalInfo?.fullName || prev.fullName,
          location: parsedData.personalInfo?.location || prev.location,
          github_username: parsedData.personalInfo?.githubUrl || prev.github_username,
          linkedin_url: parsedData.personalInfo?.linkedinUrl || prev.linkedin_url,
          website_url: parsedData.personalInfo?.portfolioUrl || prev.website_url
        }));

        toast.success('Resume uploaded and parsed successfully!');
      }
    } catch (error) {
      console.error('Resume upload error:', error);
      if (error.response?.status === 401) {
        toast.error('Unauthorized. Please login again.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.error || 'Invalid PDF file');
      } else if (error.response?.status === 500) {
        console.error('Server error:', error.response.data);
        toast.error('Server error. Please check the backend logs.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to parse resume');
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setFormState(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    setFormState(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const addExperience = () => {
    setFormState(prev => ({
      ...prev,
      experience: [...prev.experience, {
        jobTitle: '',
        company: '',
        duration: '',
        description: ''
      }]
    }));
  };

  const updateExperience = (index, field, value) => {
    setFormState(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (index) => {
    setFormState(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setFormState(prev => ({
      ...prev,
      education: [...prev.education, {
        degree: '',
        institution: '',
        field: '',
        graduationYear: '',
        cgpa: ''
      }]
    }));
  };

  const updateEducation = (index, field, value) => {
    setFormState(prev => ({
      ...prev,
      education: prev.education.map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (index) => {
    setFormState(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addProject = () => {
    setFormState(prev => ({
      ...prev,
      projects: [...prev.projects, {
        title: '',
        description: '',
        technologies: []
      }]
    }));
  };

  const updateProject = (index, field, value) => {
    setFormState(prev => ({
      ...prev,
      projects: prev.projects.map((proj, i) =>
        i === index ? { ...proj, [field]: value } : proj
      )
    }));
  };

  const removeProject = (index) => {
    setFormState(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      // Map formState to backend field names
      const profileData = {
        fullName: formState.personalInfo?.fullName || '',
        location: formState.personalInfo?.location || '',
        bio: formState.personalInfo?.bio || '',
        cgpa: formState.education?.[0]?.cgpa || null,
        github_username: formState.personalInfo?.githubUrl || '',
        linkedin_url: formState.personalInfo?.linkedinUrl || '',
        website_url: formState.personalInfo?.portfolioUrl || '',
        resume_url: formState.resumeFile?.url || '',
        skills: formState.skills || [],
        experience: formState.experience || [],
        projects: formState.projects || [],
        education: formState.education || [],
        certifications: formState.certifications || [],
        internships: formState.internships || [],
        achievements: formState.achievements || []
      };

      console.log('Sending profile data:', profileData);

      const authToken = localStorage.getItem('authToken');

      const response = await axios.post(
        'http://localhost:5000/api/profile',
        profileData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Profile saved response:', response.data);
      toast.success('Profile saved successfully!');
      
      setTimeout(() => {
        navigate('/jobs');
      }, 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
      if (error.response?.status === 401) {
        toast.error('Unauthorized. Please login again.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.error || 'Missing required fields');
      } else if (error.response?.status === 500) {
        console.error('Server error:', error.response.data);
        toast.error('Server error. Check backend logs.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to save profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold text-slate-900 mb-2">Complete Your Profile</h1>
      <p className="text-slate-600 mb-8">Upload your resume and complete your professional profile</p>

      {/* Resume Upload Section */}
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
            <div className="text-center">
              <Upload className="mx-auto mb-2 text-blue-600" size={32} />
              <span className="text-slate-700 font-semibold">
                Click to upload your resume (PDF)
              </span>
              <span className="text-slate-500 text-sm block mt-1">
                or drag and drop
              </span>
            </div>
          )}
          <input
            type="file"
            accept=".pdf"
            onChange={handleResumeUpload}
            disabled={loading && uploadProgress > 0}
            className="hidden"
          />
        </label>

        {formState.resumeFile && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-green-700 font-semibold">
              ✓ Resume uploaded: {formState.resumeFile.url}
            </span>
          </div>
        )}
      </div>

      {/* Personal Information */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Personal Information</h2>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="url"
              name="github_username"
              placeholder="GitHub URL (Optional)"
              value={formData.github_username}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />

            <input
              type="url"
              name="linkedin_url"
              placeholder="LinkedIn URL (Optional)"
              value={formData.linkedin_url}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <input
            type="url"
            name="website_url"
            placeholder="Portfolio URL (Optional)"
            value={formData.website_url}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Skills Section */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Skills</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Add a skill"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={addSkill}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={20} /> Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {formState.skills.map((skill, index) => (
            <div
              key={index}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2"
            >
              {skill}
              <button
                onClick={() => removeSkill(index)}
                className="hover:text-blue-900"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Experience Section */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Experience</h2>
          <button
            onClick={addExperience}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={20} /> Add Experience
          </button>
        </div>

        <div className="space-y-4">
          {formState.experience.map((exp, index) => (
            <div key={index} className="p-4 border border-slate-300 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-slate-900">
                  {exp.jobTitle || exp.company || `Experience ${index + 1}`}
                </h3>
                <button
                  onClick={() => removeExperience(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Job Title"
                  value={exp.jobTitle || ''}
                  onChange={(e) => updateExperience(index, 'jobTitle', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <input
                  type="text"
                  placeholder="Company"
                  value={exp.company || ''}
                  onChange={(e) => updateExperience(index, 'company', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <input
                  type="text"
                  placeholder="Duration (e.g., Jan 2020 - Dec 2021)"
                  value={exp.duration || ''}
                  onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <textarea
                  placeholder="Description"
                  value={exp.description || ''}
                  onChange={(e) => updateExperience(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  rows="2"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Education Section */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Education</h2>
          <button
            onClick={addEducation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={20} /> Add Education
          </button>
        </div>

        <div className="space-y-4">
          {formState.education.map((edu, index) => (
            <div key={index} className="p-4 border border-slate-300 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-slate-900">
                  {edu.degree || edu.institution || `Education ${index + 1}`}
                </h3>
                <button
                  onClick={() => removeEducation(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Degree"
                  value={edu.degree || ''}
                  onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <input
                  type="text"
                  placeholder="Institution"
                  value={edu.institution || ''}
                  onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Field of Study"
                    value={edu.field || ''}
                    onChange={(e) => updateEducation(index, 'field', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />

                  <input
                    type="text"
                    placeholder="Graduation Year"
                    value={edu.graduationYear || ''}
                    onChange={(e) => updateEducation(index, 'graduationYear', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <input
                  type="text"
                  placeholder="CGPA (Optional)"
                  value={edu.cgpa || ''}
                  onChange={(e) => updateEducation(index, 'cgpa', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Projects</h2>
          <button
            onClick={addProject}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={20} /> Add Project
          </button>
        </div>

        <div className="space-y-4">
          {formState.projects.map((proj, index) => (
            <div key={index} className="p-4 border border-slate-300 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-slate-900">
                  {proj.title || `Project ${index + 1}`}
                </h3>
                <button
                  onClick={() => removeProject(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Project Title"
                  value={proj.title || ''}
                  onChange={(e) => updateProject(index, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />

                <textarea
                  placeholder="Project Description"
                  value={proj.description || ''}
                  onChange={(e) => updateProject(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  rows="2"
                />

                <input
                  type="text"
                  placeholder="Technologies (comma separated)"
                  value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : ''}
                  onChange={(e) => updateProject(index, 'technologies', 
                    e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  )}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleSaveProfile}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-slate-400 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Saving...
            </>
          ) : (
            'Save Profile'
          )}
        </button>
        <button
          onClick={() => navigate('/jobs')}
          className="flex-1 px-6 py-3 bg-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-400 transition"
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
};

export default ProfileSetup;