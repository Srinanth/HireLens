import axios from 'axios';
import {supabase} from '../config/supabase.js';

export const getJobs = async (req, res) => {
  try {
    const { search, location } = req.query;
    const { id } = req.params; 

    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    let url;
    if (id) {
      // Fetch a specific job by ID
      url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${id}`;

    } else {
      // Fetch all jobs 
      url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=10&content-type=application/json`;
    }

    const response = await axios.get(url);

    const skillSet = [
      'JavaScript',
      'React',
      'Node.js',
      'Python',
      'Django',
      'AWS',
      'Java',
      'C++',
      'SQL',
      'HTML',
      'CSS',
      'Angular',
      'Vue.js',
      'TypeScript',
      'Kubernetes',
      'Docker',
      'Machine Learning',
      'Data Science',
    ];

    if (id) {
      // If fetching a specific job, format the job details
      const job = response.data.results.find(job => job.id == id);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const jobSkills = extractSkillsFromDescription(job.description || "", skillSet);

      const formattedJob = {
        id: job.id,
        title: job.title?.replace(/<\/?[^>]+(>|$)/g, '') || 'No Title',
        company: job.company?.display_name || 'Unknown Company',
        location: job.location?.display_name || 'Unknown Location',
        url: job.redirect_url,
        description: job.description || 'No description available',
        salary: job.salary_min && job.salary_max
          ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
          : job.salary_min
          ? `$${job.salary_min.toLocaleString()}`
          : job.salary_max
          ? `$${job.salary_max.toLocaleString()}`
          : 'Competitive',
        skills: jobSkills,
      };

      return res.status(200).json(formattedJob);
    } else {
      // If searching for jobs, format the list of jobs
      const jobs = response.data.results.map((job) => {
        const jobSkills = extractSkillsFromDescription(job.description || "", skillSet);

        return {
          id: job.id,
          title: job.title?.replace(/<\/?[^>]+(>|$)/g, '') || 'No Title',
          company: job.company?.display_name || 'Unknown Company',
          location: job.location?.display_name || 'Unknown Location',
          description: job.description || 'No description available',
          salary: job.salary_min && job.salary_max
            ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
            : job.salary_min
            ? `$${job.salary_min.toLocaleString()}`
            : job.salary_max
            ? `$${job.salary_max.toLocaleString()}`
            : 'Competitive',
          skills: jobSkills,
        };
      });

      return res.status(200).json(jobs);
    }
  } catch (error) {
    console.error('Error fetching jobs:', error.message);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

// Helper function to extract skills from job description
const extractSkillsFromDescription = (description, skillSet) => {
  if (!description) return [];
  const lowerCaseDescription = description.toLowerCase();
  return skillSet.filter(skill => lowerCaseDescription.includes(skill.toLowerCase()));
};
export const searchJobs = async (req, res) => {
  try {
    const { search, location } = req.query;

    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    // Instead of throwing error, set defaults
    const finalSearch = search || "developer";
    const finalLocation = location || "";

    const apiUrl = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=10&what=${finalSearch}&where=${finalLocation}&content-type=application/json`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch data from Adzuna API');
    }

    const data = await response.json();

    res.status(200).json(data.results || []);

  } catch (error) {
    console.error('Error in searchJobs:', error.message);
    res.status(500).json([]);
  }
};

export const applyJob = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('📝 Apply Job Request');
    console.log('========================================');
    console.log('User ID:', req.user?.id);

    if (!req.user?.id) {
      console.error('❌ User not authenticated');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      jobId,
      jobTitle,
      company,
      jobUrl,
      status = 'Applied'
    } = req.body;

    // Validate required fields
    if (!jobId || !jobTitle || !company) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: jobId, jobTitle, company' });
    }

    console.log('Job application data:', {
      jobId,
      jobTitle,
      company,
      status
    });

    // Check if already applied
    const { data: existingApplication } = await supabase
      .from('applied_jobs')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('job_id', jobId)
      .single();

    if (existingApplication) {
      console.log('⚠️ Already applied to this job');
      return res.status(400).json({ error: 'You have already applied to this job' });
    }

    // Add to applied_jobs table
    const { data, error } = await supabase
      .from('applied_jobs')
      .insert({
        user_id: req.user.id,
        job_id: jobId,
        job_title: jobTitle,
        company_name: company,
        job_url: jobUrl || null,
        status: status,
        applied_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('❌ Error saving applied job:', error);
      return res.status(500).json({ error: `Failed to save application: ${error.message}` });
    }

    console.log('✅ Job application saved successfully');
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      message: 'Job application saved successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('❌ Error in applyJob:', error);
    return res.status(500).json({ error: error.message });
  }
};

// 5. Get applied jobs for user
export const getAppliedJobs = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Note: Ensure 'supabase' is imported/available in this scope
    const { data, error } = await supabase
      .from('applied_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

      if (error) {
        console.error('--- Supabase Error Breakdown ---');
        console.log('Full Error Object:', JSON.stringify(error, null, 2));
        
        return res.status(500).json({ 
            error: 'Database query failed',
            // Use optional chaining to prevent the "undefined" crash
            message: error?.message || 'No message provided',
            code: error?.code
        });
    }

    return res.status(200).json({
      success: true,
      data: data || []
    });

  } catch (err) {
    console.error('[Critical Error] getAppliedJobs:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update application status
export const updateApplicationStatus = async (req, res) => {
  try {
    console.log('Updating application status for user:', req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { applicationId, status } = req.body;

    if (!applicationId || !status) {
      return res.status(400).json({ error: 'Missing applicationId or status' });
    }

    const { data, error } = await supabase
      .from('applied_jobs')
      .update({ status })
      .eq('id', applicationId)
      .eq('user_id', req.user.id)
      .select();

    if (error) {
      console.error('Error updating application status:', error);
      return res.status(500).json({ error: 'Failed to update application status' });
    }

    console.log('✅ Application status updated');
    return res.status(200).json({
      success: true,
      message: 'Application status updated',
      data: data[0]
    });
  } catch (error) {
    console.error('Error in updateApplicationStatus:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Remove applied job
export const removeAppliedJob = async (req, res) => {
  try {
    console.log('Removing applied job for user:', req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Missing application ID' });
    }

    const { error } = await supabase
      .from('applied_jobs')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Error removing applied job:', error);
      return res.status(500).json({ error: 'Failed to remove applied job' });
    }

    console.log('✅ Applied job removed');
    return res.status(200).json({
      success: true,
      message: 'Applied job removed successfully'
    });
  } catch (error) {
    console.error('Error in removeAppliedJob:', error);
    return res.status(500).json({ error: error.message });
  }
};