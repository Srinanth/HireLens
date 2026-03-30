import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse'; // Correct import
import { supabase } from '../config/supabase.js';

// Initialize Google Gen AI - it will automatically use GEMINI_API_KEY from env
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Extract text from PDF using pdf-parse (updated API)
const extractTextFromPDF = async (buffer) => {
  try {
    console.log('Starting PDF text extraction...');
    
    // Create a PDF parser instance with the buffer data
    // Convert buffer to base64 or handle accordingly
    const data = new Uint8Array(buffer);
    
    // Create parser with the PDF data
    const parser = new PDFParse({
      data: data,
      type: 'buffer'
    });
 
    // Get text from PDF
    const result = await parser.getText();
    let fullText = result.text;

    // Clean up the extracted text
    fullText = fullText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters
      .trim();

    console.log('✅ Text extracted successfully');
    console.log('Extracted text length:', fullText.length);
    console.log('First 200 chars:', fullText.substring(0, 200));

    return fullText;
  } catch (error) {
    console.error('❌ Error extracting PDF text:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
};

// Alternative simpler approach if the above doesn't work
// Some versions might still support the buffer directly
const extractTextFromPDFAlternative = async (buffer) => {
  try {
    console.log('Starting PDF text extraction (alternative method)...');
    
    // Try the older API pattern if the new one fails
    // @ts-ignore - Different versions have different APIs
    const pdf = require('pdf-parse');
    const data = await pdf(buffer);
    
    let fullText = data.text
      .replace(/\s+/g, ' ')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .trim();
    
    console.log('✅ Text extracted successfully (alternative)');
    return fullText;
  } catch (error) {
    console.error('❌ Alternative extraction failed:', error);
    throw error;
  }
};

// Upload resume
export const uploadResume = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('📄 Uploading resume');
    console.log('========================================');

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    console.log('File received:', { name: file.originalname, size: file.size, mimetype: file.mimetype });

    // Validate file type
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Extract text from PDF
    let extractedText = '';
    try {
      // Try the new API first
      extractedText = await extractTextFromPDF(file.buffer);
      console.log('✅ PDF text extracted successfully');
    } catch (extractError) {
      console.log('New API failed, trying alternative method...');
      try {
        // Fall back to alternative method
        extractedText = await extractTextFromPDFAlternative(file.buffer);
      } catch (fallbackError) {
        console.error('❌ All PDF extraction methods failed:', fallbackError);
        return res.status(400).json({ error: `Failed to extract PDF text: ${extractError.message}` });
      }
    }

    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({ error: 'Could not extract sufficient text from PDF' });
    }

    // Upload to Supabase Storage
    // bro did not implement the bucket in supabase
    
    // const fileName = `${req.user.id}-${Date.now()}.pdf`;
    // const { data: uploadData, error: uploadError } = await supabase
    //   .storage
    //   .from('resumes')
    //   .upload(fileName, file.buffer, {
    //     contentType: 'application/pdf',
    //     upsert: false
    //   });

    // if (uploadError) {
    //   console.error('❌ Supabase upload error:', uploadError);
    //   return res.status(500).json({ error: `Failed to upload resume: ${uploadError.message}` });
    // }

    // // Get public URL
    // const { data: publicUrlData } = supabase
    //   .storage
    //   .from('resumes')
    //   .getPublicUrl(fileName);

    // const resumeUrl = publicUrlData.publicUrl;
    // console.log('✅ Resume uploaded to Supabase:', resumeUrl);

    // Analyze resume with Gemini using the new SDK pattern
    console.log('🤖 Analyzing resume with Gemini...');
let analysisResult = {
      personalInfo: {},
      summary: '',
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      projects: []
    };

    try {
      const prompt = `Analyze this resume and extract the following information in JSON format. 
Make sure to correctly escape all internal double quotes within strings.

{
  "personalInfo": {
    "full_name": "Candidate's full name",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State, or Country",
    "githubUrl": "GitHub Profile URL if present",
    "linkedinUrl": "LinkedIn Profile URL if present",
    "portfolioUrl": "Personal website or portfolio URL if present"
  },
  "summary": "Brief summary of the candidate (2-3 sentences)",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "duration": "Duration or dates",
      "description": "Brief description"
    }
  ],
  "education": [
    {
      "school": "School/University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "year": "Graduation Year"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuer",
      "year": "Year"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project Description",
      "technologies": ["tech1", "tech2"]
    }
  ]
}

Resume Content:
${extractedText}`;

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json' 
        }
      });
      
      const responseText = response.text;
      console.log('Raw Gemini response:', responseText);

      try {
        const parsed = JSON.parse(responseText);
        analysisResult = { ...analysisResult, ...parsed };
        console.log('✅ Resume analyzed successfully');
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError);
      }
      
    } catch (geminiError) {
      console.error('❌ Gemini analysis error:', geminiError);
    }

  const updatePayload = {
        resume_url: null,
        experience: analysisResult.experience || [],
        skills: analysisResult.skills || [],
        education: analysisResult.education || [],
        certifications: analysisResult.certifications || [],
        projects: analysisResult.projects || [],
        updated_at: new Date().toISOString()
      };

      // 2. Add the Personal Info directly to the database payload
      // We check if Gemini found them so we don't accidentally overwrite existing data with undefined
      if (analysisResult.personalInfo?.full_name) updatePayload.full_name = analysisResult.personalInfo.full_name;
      if (analysisResult.personalInfo?.location) updatePayload.location = analysisResult.personalInfo.location;
      if (analysisResult.personalInfo?.githubUrl) updatePayload.github_username = analysisResult.personalInfo.githubUrl;
      if (analysisResult.personalInfo?.linkedinUrl) updatePayload.linkedin_url = analysisResult.personalInfo.linkedinUrl;
      if (analysisResult.personalInfo?.portfolioUrl) updatePayload.website_url = analysisResult.personalInfo.portfolioUrl;

      // 3. Update the database with EVERYTHING at once
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', req.user.id)
        .select();

    if (profileError) {
      console.error('❌ Profile update error:', profileError);
      return res.status(500).json({ error: `Failed to update profile: ${profileError.message}` });
    }

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded and analyzed successfully',
      data: {
        ...analysisResult,
        resume_url: null,
        profile: profileData[0]
      }
    });
  } catch (error) {
    console.error('❌ Error in uploadResume:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get resume
export const getResume = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('📄 Fetching resume');
    console.log('========================================');

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('resume_url, experience, skills, education, certifications, projects')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching profile:', error);
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!profile.resume_url) {
      return res.status(404).json({ error: 'No resume found' });
    }

    console.log('✅ Resume fetched');
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      data: {
        resume_url: profile.resume_url,
        experience: profile.experience || [],
        skills: profile.skills || [],
        education: profile.education || [],
        certifications: profile.certifications || [],
        projects: profile.projects || []
      }
    });
  } catch (error) {
    console.error('❌ Error in getResume:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete resume
export const deleteResume = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🗑️  Deleting resume');
    console.log('========================================');

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('resume_url')
      .eq('id', req.user.id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching profile:', fetchError);
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (!profile.resume_url) {
      return res.status(404).json({ error: 'No resume found' });
    }

    // Extract file name from URL
    const fileName = profile.resume_url.split('/').pop();

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase
      .storage
      .from('resumes')
      .remove([fileName]);

    if (deleteError) {
      console.error('❌ Storage delete error:', deleteError);
      return res.status(500).json({ error: `Failed to delete resume: ${deleteError.message}` });
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        resume_url: null,
        experience: [],
        skills: [],
        education: [],
        certifications: [],
        projects: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      return res.status(500).json({ error: `Failed to update profile: ${updateError.message}` });
    }

    console.log('✅ Resume deleted');
    console.log('========================================\n');

    return res.status(200).json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteResume:', error);
    return res.status(500).json({ error: error.message });
  }
};