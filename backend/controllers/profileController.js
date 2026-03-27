import {supabase} from '../config/supabase.js';

// Get user profile
export const getProfile = async (req, res) => {
  try {
    console.log('Getting profile for user:', req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!data) {
      console.log('Profile not found for user:', req.user.id);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('✅ Profile retrieved successfully');
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getProfile:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Create or update user profile
export const saveProfile = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('💾 Saving Profile');
    console.log('========================================');
    console.log('User ID:', req.user?.id);

    if (!req.user?.id) {
      console.error('❌ User not authenticated');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const {
      full_name,
      location,
      college,
      bio,
      cgpa,
      github_username,
      linkedin_url,
      website_url,
      // resume_url,
      skills,
      experience,
      education,
      projects,
      certifications,
      internships,
      achievements
    } = req.body;

    // Validate required fields
    // if (!full_name || !location || !college) {
    //   console.error('❌ Missing required fields');
    //   return res.status(400).json({ error: 'Full Name, Location, and College are required' });
    // }

    console.log('Profile data received:', {
      full_name,
      location,
      college,
      skills: skills?.length || 0,
      experience: experience?.length || 0,
      education: education?.length || 0
    });

    // Prepare profile data matching schema
    const profileData = {
      full_name: full_name,
      location,
      college,
      bio: bio || null,
      github_username: github_username || null,
      linkedin_url: linkedin_url || null,
      website_url: website_url || null,
      cgpa: cgpa ? parseFloat(cgpa) : null,
      resume_url: [],
      skills: skills || [],
      experience: experience || [],
      education: education || [],
      projects: projects || [],
      certifications: certifications || [],
      internships: internships || [],
      achievements: achievements || [],
      updated_at: new Date().toISOString()
    };

    console.log('Updating profile...');

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: req.user.id,
          ...profileData
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error(`❌ Error saving profile:`, error);
      return res.status(500).json({ error: `Failed to save profile: ${error.message}` });
    }

    console.log(`✅ Profile saved successfully`);
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      message: 'Profile saved successfully'
    });
  } catch (error) {
    console.error('❌ Error in saveProfile:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete user profile data (but keep user record)
export const deleteProfile = async (req, res) => {
  try {
    console.log('Deleting profile for user:', req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: null,
        location: null,
        college: null,
        bio: null,
        cgpa: null,
        github_username: null,
        linkedin_url: null,
        website_url: null,
        resume_url: null,
        skills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        internships: [],
        achievements: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (error) {
      console.error('Error deleting profile:', error);
      return res.status(500).json({ error: 'Failed to delete profile' });
    }

    console.log('✅ Profile cleared successfully');
    return res.status(200).json({
      success: true,
      message: 'Profile cleared successfully'
    });
  } catch (error) {
    console.error('Error in deleteProfile:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get profile completion status
export const getProfileStatus = async (req, res) => {
  try {
    console.log('Getting profile status for user:', req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, location, college, github_username, website_url, linkedin_url, projects, experience, education, skills')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile status:', error);
      return res.status(500).json({ error: 'Failed to fetch profile status' });
    }

    const status = {
      profileExists: !!data,
      isComplete: data ? (
        data.full_name && 
        data.location && 
        (data.projects?.length > 0 || data.experience?.length > 0 || data.education?.length > 0 || data.skills?.length > 0)
      ) : false,
      fieldsCompleted: data ? [
        data.full_name ? 'name' : null,
        data.location ? 'location' : null,
        data.college ? 'college' : null,
        data.github_username ? 'github' : null,
        data.website_url ? 'website' : null,
        data.linkedin_url ? 'linkedin' : null,
        data.projects?.length > 0 ? 'projects' : null,
        data.experience?.length > 0 ? 'experience' : null,
        data.education?.length > 0 ? 'education' : null,
        data.skills?.length > 0 ? 'skills' : null
      ].filter(Boolean) : []
    };

    console.log('✅ Profile status retrieved:', status);
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error in getProfileStatus:', error);
    return res.status(500).json({ error: error.message });
  }
};