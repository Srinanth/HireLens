/**
 * Scoring Engine for calculating user rankings
 * Works with profiles table JSONB fields
 * Factors considered:
 * - Education/CGPA (30%) 
 * - Experience/Projects (20%)
 * - Skills (15%)
 * - Internships (15%)
 * - Certifications (10%)
 * - GitHub Activity (10%)
 */

export const calculateTotalScore = (profile) => {
  if (!profile) return 0;

  const scores = {
    educationScore: calculateEducationScore(profile),
    experienceScore: calculateExperienceScore(profile),
    skillsScore: calculateSkillsScore(profile),
    internshipScore: calculateInternshipScore(profile),
    certificationsScore: calculateCertificationsScore(profile),
    githubScore: calculateGitHubScore(profile)
  };

  // Weighted scoring based on updated distribution
  const totalScore = 
    (scores.educationScore * 0.30) +
    (scores.experienceScore * 0.20) +
    (scores.skillsScore * 0.15) +
    (scores.internshipScore * 0.15) +
    (scores.certificationsScore * 0.10) +
    (scores.githubScore * 0.10);

  return Math.round(totalScore * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate education score (0-100)
 * Heavily relies on normalized CGPA on a 10-point scale
 */
export const calculateEducationScore = (profile) => {
  let score = 0;

  // 1. CGPA Calculation (Max 80 points of the education score)
  if (profile.cgpa) {
    let cgpaNum = parseFloat(profile.cgpa);
    
    // Auto-normalize percentages to a 10-point scale (e.g., 85% becomes 8.5)
    if (cgpaNum > 10 && cgpaNum <= 100) {
      cgpaNum = cgpaNum / 10; 
    }
    
    if (cgpaNum <= 10 && cgpaNum > 0) {
      // Example: 8.5 CGPA yields (8.5 / 10) * 80 = 68 points
      score += (cgpaNum / 10) * 80;
    }
  }

  // 2. Education Records Presence (Max 20 points)
  const education = Array.isArray(profile.education) ? profile.education : [];
  // 10 points per degree/institution listed, capped at 2
  score += Math.min(education.length * 10, 20);

  return Math.min(score, 100);
};

/**
 * Calculate experience score (0-100)
 * Balances real experience and personal projects
 */
export const calculateExperienceScore = (profile) => {
  let score = 0;

  // Projects (Max 50 points) - 25 points per project, capped at 2
  const projects = Array.isArray(profile.projects) ? profile.projects : [];
  const projectScore = Math.min(projects.length * 25, 50);

  // Experience (Max 50 points) - 25 points per role, capped at 2
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const expScore = Math.min(experience.length * 25, 50);

  score = projectScore + expScore;
  return Math.min(score, 100);
};

/**
 * Calculate skills score (0-100)
 * Based on pure count, strictly capped to prevent keyword stuffing
 */
export const calculateSkillsScore = (profile) => {
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  
  if (skills.length === 0) return 0;

  // 10 points per skill, capped at 100 (10 skills max)
  // This prevents users from copying/pasting 50 keywords to get 100%
  return Math.min(skills.length * 10, 100);
};

/**
 * Calculate internship score (0-100)
 * Based on presence and top-tier companies
 */
export const calculateInternshipScore = (profile) => {
  const internships = Array.isArray(profile.internships) ? profile.internships : [];
  
  if (internships.length === 0) return 0;

  let score = 0;
  const prestigeCompanies = ['google', 'microsoft', 'amazon', 'apple', 'meta', 'facebook', 'netflix', 'ibm', 'tcs', 'infosys', 'wipro'];

  internships.forEach(internship => {
    // 40 base points per internship
    let currentInternScore = 40; 

    // +10 bonus points for recognized/prestige companies
    const company = (internship.company || '').toLowerCase();
    if (prestigeCompanies.some(pc => company.includes(pc))) {
      currentInternScore += 10;
    }

    score += currentInternScore;
  });

  // Cap at 100 points (effectively maxes out at 2-3 internships)
  return Math.min(score, 100);
};

/**
 * Calculate certifications score (0-100)
 * Based on count, capped to prevent spam
 */
export const calculateCertificationsScore = (profile) => {
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
  
  if (certifications.length === 0) return 0;

  // 25 points per certification, capped at 4 certifications
  return Math.min(certifications.length * 25, 100);
};

/**
 * Calculate GitHub score (0-100)
 * Rewards having a profile and having projects with linked tech/repos
 */
export const calculateGitHubScore = (profile) => {
  if (!profile.github_username || profile.github_username.trim() === '') return 0;

  // Base 50 points just for providing a GitHub username
  let score = 50; 

  // Additional 10 points per project that lists specific technologies (implies active coding)
  const projects = Array.isArray(profile.projects) ? profile.projects : [];
  const techProjects = projects.filter(p => Array.isArray(p.technologies) && p.technologies.length > 0).length;
  
  score += Math.min(techProjects * 10, 50); // Capped at 5 well-documented projects

  return Math.min(score, 100);
};

/**
 * Calculate category-specific rankings
 */
export const calculateCategoryScores = (profile) => {
  return {
    overallScore: calculateTotalScore(profile),
    skillsRank: calculateSkillsScore(profile),
    experienceRank: calculateExperienceScore(profile),
    educationRank: calculateEducationScore(profile),
    certificationsRank: calculateCertificationsScore(profile),
    githubRank: calculateGitHubScore(profile),
    internshipRank: calculateInternshipScore(profile)
  };
};

/**
 * Get ranking tier based on overall score (out of 100)
 */
export const getRankingTier = (score) => {
  if (score >= 85) return 'Legendary';
  if (score >= 75) return 'Expert';
  if (score >= 60) return 'Advanced';
  if (score >= 45) return 'Intermediate';
  if (score >= 30) return 'Developing';
  if (score >= 15) return 'Beginner';
  return 'Starter';
};

/**
 * Get ranking badge color based on tier
 */
export const getRankingBadgeColor = (tier) => {
  const colors = {
    'Legendary': 'gold',
    'Expert': 'purple',
    'Advanced': 'blue',
    'Intermediate': 'green',
    'Developing': 'orange',
    'Beginner': 'yellow',
    'Starter': 'gray'
  };
  return colors[tier] || 'gray';
};