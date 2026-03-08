import { supabase } from '../config/supabase.js';
import { 
  calculateTotalScore, 
  calculateCategoryScores,
  getRankingTier,
  getRankingBadgeColor
} from '../utils/scoringEngine.js';

// Get global rankings
export const getGlobalRankings = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🏆 Fetching global rankings');
    console.log('========================================');

    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Fetch all profiles with only available fields
    const { data: profiles, error, count } = await supabase
      .from('profiles')
      .select('id, full_name, bio, cgpa, github_username, location, website_url, linkedin_url, resume_url, projects, experience, skills, education, certifications, internships, achievements, created_at, updated_at', { count: 'exact' });

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return res.status(500).json({ error: `Failed to fetch profiles: ${error.message}` });
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No profiles found');
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    // Calculate scores for all profiles
    const rankedProfiles = profiles
      .map((profile) => {
        const scores = calculateCategoryScores(profile);
        const score = scores.overallScore;
        const tier = getRankingTier(score);
        const badgeColor = getRankingBadgeColor(tier);

        return {
          ...profile,
          overall_score: score,
          category_scores: scores,
          tier: tier,
          badge_color: badgeColor,
          skills_count: Array.isArray(profile.skills) ? profile.skills.length : 0,
          certifications_count: Array.isArray(profile.certifications) ? profile.certifications.length : 0,
          internships_count: Array.isArray(profile.internships) ? profile.internships.length : 0,
          projects_count: Array.isArray(profile.projects) ? profile.projects.length : 0,
          experience_count: Array.isArray(profile.experience) ? profile.experience.length : 0
        };
      })
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(offset, offset + parseInt(limit))
      .map((profile, index) => ({
        ...profile,
        rank: offset + index + 1
      }));

    console.log('✅ Rankings calculated for', rankedProfiles.length, 'profiles');
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      data: rankedProfiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error in getGlobalRankings:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get user's ranking position
export const getUserRanking = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('👤 Fetching user ranking');
    console.log('========================================');

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, bio, cgpa, github_username, location, website_url, linkedin_url, resume_url, projects, experience, skills, education, certifications, internships, achievements, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Calculate user score
    const userScores = calculateCategoryScores(userProfile);
    const userScore = userScores.overallScore;

    // Fetch all profiles to calculate rank
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('id, cgpa, github_username, projects, experience, skills, education, certifications, internships, achievements');

    if (allError) {
      console.error('❌ Error fetching all profiles:', allError);
      return res.status(500).json({ error: 'Failed to calculate ranking' });
    }

    // Calculate all scores and find user's rank
    const allScores = allProfiles.map(profile => calculateTotalScore(profile));
    const userRank = allScores.filter(score => score > userScore).length + 1;
    const tier = getRankingTier(userScore);
    const badgeColor = getRankingBadgeColor(tier);

    console.log('✅ User ranking calculated - Rank:', userRank, 'Score:', userScore);
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      data: {
        user_id: req.user.id,
        rank: userRank,
        total_users: allProfiles.length,
        overall_score: userScore,
        category_scores: userScores,
        tier: tier,
        badge_color: badgeColor,
        percentile: Math.round(((allProfiles.length - userRank + 1) / allProfiles.length) * 100),
        profile: {
          full_name: userProfile.full_name,
          bio: userProfile.bio,
          skills_count: Array.isArray(userProfile.skills) ? userProfile.skills.length : 0,
          certifications_count: Array.isArray(userProfile.certifications) ? userProfile.certifications.length : 0,
          internships_count: Array.isArray(userProfile.internships) ? userProfile.internships.length : 0,
          projects_count: Array.isArray(userProfile.projects) ? userProfile.projects.length : 0,
          experience_count: Array.isArray(userProfile.experience) ? userProfile.experience.length : 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Error in getUserRanking:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Search rankings by name
export const searchRankings = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🔍 Searching rankings');
    console.log('========================================');

    const { query = '' } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, bio, cgpa, github_username, location, website_url, linkedin_url, resume_url, projects, experience, skills, education, certifications, internships, achievements')
      .ilike('full_name', `%${query}%`)
      .limit(20);

    if (error) {
      console.error('❌ Error searching:', error);
      return res.status(500).json({ error: 'Search failed' });
    }

    const results = profiles
      .map((profile) => {
        const scores = calculateCategoryScores(profile);
        const tier = getRankingTier(scores.overallScore);
        return {
          ...profile,
          overall_score: scores.overallScore,
          tier: tier,
          category_scores: scores,
          skills_count: Array.isArray(profile.skills) ? profile.skills.length : 0,
          certifications_count: Array.isArray(profile.certifications) ? profile.certifications.length : 0,
          internships_count: Array.isArray(profile.internships) ? profile.internships.length : 0,
          projects_count: Array.isArray(profile.projects) ? profile.projects.length : 0,
          experience_count: Array.isArray(profile.experience) ? profile.experience.length : 0
        };
      })
      .sort((a, b) => b.overall_score - a.overall_score)
      .map((profile, index) => ({
        ...profile,
        rank: index + 1
      }));

    console.log('✅ Search results found:', results.length);
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ Error in searchRankings:', error);
    return res.status(500).json({ error: error.message });
  }
};