/**
 * Scoring Engine for calculating user rankings
 * Works with profiles table JSONB fields
 * Factors considered:
 * - Skills (20%)
 * - Experience/Projects (20%)
 * - Education/CGPA (15%)
 * - Certifications (15%)
 * - GitHub Activity (15%)
 * - Internships (15%)
 */

export const calculateTotalScore = (profile) => {
  if (!profile) return 0;

  const scores = {
    skillsScore: calculateSkillsScore(profile),
    experienceScore: calculateExperienceScore(profile),
    educationScore: calculateEducationScore(profile),
    certificationsScore: calculateCertificationsScore(profile),
    githubScore: calculateGitHubScore(profile),
    internshipScore: calculateInternshipScore(profile)
  };

  // Weighted scoring
  const totalScore = 
    (scores.skillsScore * 0.20) +
    (scores.experienceScore * 0.20) +
    (scores.educationScore * 0.15) +
    (scores.certificationsScore * 0.15) +
    (scores.githubScore * 0.15) +
    (scores.internshipScore * 0.15);

  return Math.round(totalScore * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate skills score (0-100)
 * Based on number of skills and their proficiency levels
 */
export const calculateSkillsScore = (profile) => {
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  
  if (!skills || skills.length === 0) return 0;

  const skillCount = skills.length || 0;
  const maxSkillsPoints = 50; // Max points from count
  const proficiencyPoints = 50; // Max points from proficiency levels

  // Points for number of skills (max 50)
  const skillCountScore = Math.min(skillCount * 5, maxSkillsPoints);

  // Points for proficiency levels
  let proficiencyScore = 0;
  if (skills.length > 0) {
    const proficiencyLevels = {
      'Beginner': 10,
      'Intermediate': 25,
      'Advanced': 40,
      'Expert': 50
    };

    proficiencyScore = skills.reduce((total, skill) => {
      const level = typeof skill === 'object' ? skill.proficiency_level : 'Beginner';
      return total + (proficiencyLevels[level] || 10);
    }, 0) / Math.max(skills.length, 1);
  }

  return Math.min(skillCountScore + proficiencyScore, 100);
};

/**
 * Calculate experience score (0-100)
 * Based on projects and experience duration
 */
export const calculateExperienceScore = (profile) => {
  let score = 0;

  // Projects score (max 50 points)
  const projects = Array.isArray(profile.projects) ? profile.projects : [];
  const projectCount = projects.length || 0;
  const projectScore = Math.min(projectCount * 10, 50);

  // Experience score (max 50 points)
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const experienceCount = experience.length || 0;
  const experienceScore = Math.min(experienceCount * 15, 50);

  score = projectScore + experienceScore;
  return Math.min(score, 100);
};

/**
 * Calculate education score (0-100)
 * Based on CGPA and education records
 */
export const calculateEducationScore = (profile) => {
  let score = 0;

  // CGPA score (max 60 points)
  // Scale: 4.0 GPA = 60 points
  const cgpa = parseFloat(profile.cgpa) || 0;
  const cgpaScore = Math.min((cgpa / 4.0) * 60, 60);

  // Education records score (max 40 points)
  const education = Array.isArray(profile.education) ? profile.education : [];
  const educationCount = education.length || 0;
  const educationScore = Math.min(educationCount * 20, 40);

  score = cgpaScore + educationScore;
  return Math.min(score, 100);
};

/**
 * Calculate certifications score (0-100)
 * Based on number and recency of certifications
 */
export const calculateCertificationsScore = (profile) => {
  const certifications = Array.isArray(profile.certifications) ? profile.certifications : [];
  
  if (!certifications || certifications.length === 0) return 0;

  const certCount = certifications.length || 0;
  const maxCertsPoints = 50; // Max points from count

  // Points for number of certifications (max 50)
  const certCountScore = Math.min(certCount * 10, maxCertsPoints);

  // Points for certification recency
  let recencyScore = 0;
  if (certifications.length > 0) {
    recencyScore = certifications.reduce((total, cert) => {
      if (!cert.issued_date) return total;

      const issueDate = new Date(cert.issued_date);
      const monthsAgo = (new Date() - issueDate) / (1000 * 60 * 60 * 24 * 30);

      // Recent certs (< 6 months) = 10 points
      // Medium (6-12 months) = 7 points
      // Older (> 12 months) = 3 points
      let points = 3;
      if (monthsAgo < 6) points = 10;
      else if (monthsAgo < 12) points = 7;

      return total + points;
    }, 0) / Math.max(certifications.length, 1);
  }

  return Math.min(certCountScore + recencyScore, 100);
};

/**
 * Calculate GitHub score (0-100)
 * Based on GitHub username presence and profile activity
 */
export const calculateGitHubScore = (profile) => {
  if (!profile.github_username) return 0;

  // For now, just having a GitHub username gives points
  // Can be expanded with GitHub API integration later
  const baseScore = 30; // Base points for having GitHub

  // Additional points based on other factors
  let additionalScore = 0;

  // Projects on GitHub (assuming projects are documented with links)
  const projects = Array.isArray(profile.projects) ? profile.projects : [];
  const githubProjects = projects.filter(p => 
    p && (p.github_url || p.repository_url)
  ).length;
  additionalScore += Math.min(githubProjects * 5, 40);

  // Experience shows activity
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  if (experience.length > 0) {
    additionalScore += Math.min(experience.length * 5, 30);
  }

  return Math.min(baseScore + additionalScore, 100);
};

/**
 * Calculate internship score (0-100)
 * Based on number and prestige of internships
 */
export const calculateInternshipScore = (profile) => {
  const internships = Array.isArray(profile.internships) ? profile.internships : [];
  
  if (!internships || internships.length === 0) return 0;

  const internshipCount = internships.length || 0;
  const maxInternshipPoints = 50; // Max points from count

  // Points for number of internships (max 50)
  const internshipCountScore = Math.min(internshipCount * 15, maxInternshipPoints);

  // Points for internship prestige and duration
  let prestigeScore = 0;
  if (internships.length > 0) {
    prestigeScore = internships.reduce((total, internship) => {
      let points = 10; // Base points

      // Add prestige points (top companies get more)
      const prestigeCompanies = ['Google', 'Microsoft', 'Facebook', 'Apple', 'Amazon', 'Netflix', 'Meta'];
      const company = internship.company || '';
      if (prestigeCompanies.some(pCompany => 
        company.toLowerCase().includes(pCompany.toLowerCase())
      )) {
        points += 15;
      }

      // Add duration points (longer = better, max 6 months = 10 points)
      if (internship.end_date && internship.start_date) {
        const duration = (new Date(internship.end_date) - new Date(internship.start_date)) / (1000 * 60 * 60 * 24 * 30);
        points += Math.min(duration * 1.67, 10);
      }

      return total + points;
    }, 0) / Math.max(internships.length, 1);
  }

  return Math.min(internshipCountScore + prestigeScore, 100);
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
 * Get ranking tier based on score
 */
export const getRankingTier = (score) => {
  if (score >= 90) return 'Legendary';
  if (score >= 80) return 'Expert';
  if (score >= 70) return 'Advanced';
  if (score >= 60) return 'Intermediate';
  if (score >= 50) return 'Developing';
  if (score >= 40) return 'Beginner';
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