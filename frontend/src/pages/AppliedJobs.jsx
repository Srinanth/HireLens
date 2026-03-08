import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Briefcase, Clock, CheckCircle, XCircle, 
  ExternalLink, Trash2, AlertCircle, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const AppliedJobs = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Status Styles Mapping
  const statusConfig = {
    'Applied': { 
      color: 'bg-blue-50 text-blue-700 border-blue-200', 
      badge: 'bg-blue-100 text-blue-800',
      icon: <Clock size={16} /> 
    },
    'In Progress': { 
      color: 'bg-amber-50 text-amber-700 border-amber-200', 
      badge: 'bg-amber-100 text-amber-800',
      icon: <Clock size={16} /> 
    },
    'Interviewing': { 
      color: 'bg-purple-50 text-purple-700 border-purple-200', 
      badge: 'bg-purple-100 text-purple-800',
      icon: <Clock size={16} /> 
    },
    'Accepted': { 
      color: 'bg-green-50 text-green-700 border-green-200', 
      badge: 'bg-green-100 text-green-800',
      icon: <CheckCircle size={16} /> 
    },
    'Rejected': { 
      color: 'bg-red-50 text-red-700 border-red-200', 
      badge: 'bg-red-100 text-red-800',
      icon: <XCircle size={16} /> 
    },
    'Offer': { 
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
      badge: 'bg-emerald-100 text-emerald-800',
      icon: <CheckCircle size={16} /> 
    },
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Fetch applied jobs from backend
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('authToken');

      if (!authToken) {
        toast.error('Please login to view your applications');
        navigate('/login');
        return;
      }

      const response = await axios.get(
        'http://localhost:5000/api/jobs/applied',
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Applied jobs fetched:', response.data.data);
      setApplications(response.data.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
      } else {
        toast.error('Failed to load applications');
      }
    } finally {
      setLoading(false);
    }
  };

  // Update application status
  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      const authToken = localStorage.getItem('authToken');

      const response = await axios.patch(
        `http://localhost:5000/api/jobs/${applicationId}/status`,
        { 
          applicationId,
          status: newStatus 
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update local state
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );

      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Remove application
  const handleRemoveApplication = async (applicationId) => {
    if (!window.confirm('Are you sure you want to remove this application from your dashboard?')) {
      return;
    }

    try {
      setDeletingId(applicationId);
      const authToken = localStorage.getItem('authToken');

      await axios.delete(
        `http://localhost:5000/api/jobs/${applicationId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      // Update local state
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      toast.success('Application removed from dashboard');
    } catch (error) {
      console.error('Error removing application:', error);
      toast.error('Failed to remove application');
    } finally {
      setDeletingId(null);
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

  // Get days since application
  const getDaysSinceApplication = (dateString) => {
    if (!dateString) return 0;
    const applied = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - applied);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-slate-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Applied Jobs</h1>
              <p className="text-slate-600">
                Track your job applications and interview progress
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600">{applications.length}</div>
              <p className="text-slate-600 text-sm">Total Applications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-12 text-center">
            <AlertCircle className="mx-auto mb-4 text-slate-400" size={48} />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Applications Yet</h2>
            <p className="text-slate-600 mb-6">
              Start applying for jobs to track your progress here
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {['Applied', 'In Progress', 'Interviewing', 'Accepted'].map(status => {
                const count = applications.filter(app => app.status === status).length;
                return (
                  <div key={status} className={`p-4 rounded-lg border ${statusConfig[status]?.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {statusConfig[status]?.icon}
                      <span className="text-sm font-semibold">{status}</span>
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                );
              })}
            </div>

            {/* Applications List */}
            <div className="space-y-4">
              {applications.map((application) => {
                const config = statusConfig[application.status] || statusConfig['Applied'];
                const daysSince = getDaysSinceApplication(application.applied_at);

                return (
                  <div
                    key={application.id}
                    className={`bg-white rounded-lg shadow-md border-l-4 p-6 transition hover:shadow-lg ${
                      application.status === 'Accepted'
                        ? 'border-l-green-500'
                        : application.status === 'Rejected'
                        ? 'border-l-red-500'
                        : application.status === 'Interviewing'
                        ? 'border-l-purple-500'
                        : 'border-l-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {/* Job Title and Company */}
                        <div className="flex items-start gap-3 mb-3">
                          <Briefcase className="text-blue-600 mt-1 shrink-0" size={24} />
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">
                              {application.job_title}
                            </h3>
                            <p className="text-slate-600 font-semibold">
                              {application.company_name}
                            </p>
                          </div>
                        </div>

                        {/* Meta Information */}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                          <span>
                            Applied: {formatDate(application.applied_at)}
                          </span>
                          <span>
                            {daysSince} day{daysSince !== 1 ? 's' : ''} ago
                          </span>
                        </div>

                        {/* Status and Actions */}
                        <div className="flex flex-wrap gap-3 items-center">
                          {/* Status Badge */}
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${config.badge}`}>
                            {config.icon}
                            {application.status}
                          </div>

                          {/* Status Dropdown */}
                          <select
                            value={application.status}
                            onChange={(e) =>
                              handleStatusChange(application.id, e.target.value)
                            }
                            className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 cursor-pointer hover:border-slate-400"
                          >
                            <option value="Applied">Applied</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Interviewing">Interviewing</option>
                            <option value="Offer">Offer</option>
                            <option value="Rejected">Rejected</option>
                          </select>

                          {/* External Link */}
                          {application.job_url && (
                            <a
                              href={application.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center gap-2 text-sm font-semibold border border-blue-200"
                            >
                              <ExternalLink size={16} />
                              View Job
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveApplication(application.id)}
                        disabled={deletingId === application.id}
                        className="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Remove from dashboard"
                      >
                        {deletingId === application.id ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <Trash2 size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppliedJobs;