import {PDFParse} from 'pdf-parse';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


// Function to extract text from PDF using pdf-parse
const extractTextFromPDF = async (buffer) => {
  try {
    console.log('Starting PDF text extraction with pdf-parse...');
    console.log('Buffer type:', buffer.constructor.name);
    console.log('Buffer size:', buffer.length);

    // pdf-parse works directly with Buffer
    const data = await PDFParse(buffer);
    
    console.log('PDF text extracted successfully');
    console.log('Extracted text length:', data.text.length);
    console.log('Number of pages:', data.numpages);
    console.log('First 300 chars:', data.text.substring(0, 300));

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('Extracted text is empty');
    }

    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error details:', error.message);
    throw new Error('Failed to parse PDF: ' + error.message);
  }
};

// Function to parse resume using Gemini API
const parseResumeWithGemini = async (resumeText) => {
  try {
    console.log('Starting Gemini API call...');
    console.log('Resume text length:', resumeText.length);

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert resume parser. Please analyze the following resume and extract the information in a structured JSON format. 

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.

Resume Text:
${resumeText}

Please extract and return the following information as a JSON object with these exact fields:
{
  "personalInfo": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedinUrl": "string",
    "githubUrl": "string",
    "portfolioUrl": "string"
  },
  "summary": "string (professional summary or objective)",
  "skills": ["array of skills"],
  "experience": [
    {
      "jobTitle": "string",
      "company": "string",
      "duration": "string",
      "description": "string",
      "startDate": "string",
      "endDate": "string"
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "field": "string",
      "graduationYear": "string",
      "cgpa": "string"
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "technologies": ["array of technologies"],
      "link": "string"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string",
      "link": "string"
    }
  ],
  "internships": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "description": "string",
      "startDate": "string",
      "endDate": "string"
    }
  ],
  "achievements": ["array of achievements or awards"],
  "languages": ["array of languages"]
}

If any field is not found in the resume, use null or an empty array as appropriate. Be thorough and extract all relevant information.
`;

    console.log('Calling Gemini API with gemini-1.5-flash model...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsedText = response.text();

    console.log('Gemini response received');
    console.log('Response length:', parsedText.length);

    // Clean the response - remove markdown code blocks if present
    let cleanedText = parsedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[\s\n]*/, '')
      .replace(/[\s\n]*$/, '')
      .trim();

    console.log('Cleaned text length:', cleanedText.length);

    // Parse the JSON response
    let parsedResume;
    try {
      parsedResume = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed JSON from Gemini response');
      console.log('Parsed resume keys:', Object.keys(parsedResume));
    } catch (jsonError) {
      console.error('❌ JSON parsing failed:', jsonError.message);
      console.error('Response preview:', cleanedText.substring(0, 500));
      
      // Try to find JSON in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResume = JSON.parse(jsonMatch[0]);
          console.log('✅ Extracted and parsed JSON from response');
        } catch (innerError) {
          throw new Error('Failed to parse extracted JSON: ' + innerError.message);
        }
      } else {
        throw new Error('No valid JSON found in Gemini response');
      }
    }

    return parsedResume;
  } catch (error) {
    console.error('❌ Error parsing resume with Gemini:', error);
    console.error('Error message:', error.message);
    throw new Error('Failed to parse resume with Gemini: ' + error.message);
  }
};

// Main controller function to handle resume upload and parsing
export const parseResume = async (req, res) => {
  try {
    console.log('\n=== 🚀 Resume Parse Request Started ===');
    console.log('User ID:', req.user?.id);
    console.log('File present:', !!req.file);

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📄 File received:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size + ' bytes',
      encoding: req.file.encoding
    });

    if (req.file.mimetype !== 'application/pdf') {
      console.error('❌ Invalid file type:', req.file.mimetype);
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    // Extract text from PDF
    console.log('📖 Extracting text from PDF...');
    const resumeText = await extractTextFromPDF(req.file.buffer);

    if (!resumeText || resumeText.trim().length === 0) {
      console.error('❌ No text extracted from PDF');
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    console.log('✅ Text extracted successfully, length:', resumeText.length);

    // Parse resume using Gemini API
    console.log('🤖 Parsing resume with Gemini API...');
    const parsedResume = await parseResumeWithGemini(resumeText);

    console.log('✅ Resume parsed successfully');

    // Validate and clean the data
    console.log('🧹 Validating and cleaning data...');
    const cleanedData = validateAndCleanResumeData(parsedResume);

    console.log('✅ Data validation complete');
    console.log('=== ✨ Resume Parse Request Completed Successfully ===\n');

    // Return parsed resume data
    return res.status(200).json({
      success: true,
      data: cleanedData,
      message: 'Resume parsed successfully using Gemini API'
    });
  } catch (error) {
    console.error('\n=== ❌ Resume Parse Error ===');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    console.error('=== End Error ===\n');

    res.status(500).json({
      error: 'Failed to parse resume',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Additional function to validate and clean extracted data
export const validateAndCleanResumeData = (parsedData) => {
  try {
    console.log('Starting data validation...');

    const cleaned = {
      personalInfo: {
        fullName: parsedData?.personalInfo?.fullName || '',
        email: parsedData?.personalInfo?.email || '',
        phone: parsedData?.personalInfo?.phone || '',
        location: parsedData?.personalInfo?.location || '',
        linkedinUrl: parsedData?.personalInfo?.linkedinUrl || '',
        githubUrl: parsedData?.personalInfo?.githubUrl || '',
        portfolioUrl: parsedData?.personalInfo?.portfolioUrl || ''
      },
      summary: parsedData?.summary || '',
      skills: Array.isArray(parsedData?.skills)
        ? parsedData.skills
            .filter(s => s && typeof s === 'string')
            .map(s => s.trim())
            .filter(s => s.length > 0)
        : [],
      experience: Array.isArray(parsedData?.experience)
        ? parsedData.experience.filter(exp => exp && (exp.company || exp.jobTitle))
        : [],
      education: Array.isArray(parsedData?.education)
        ? parsedData.education.filter(edu => edu && edu.institution)
        : [],
      projects: Array.isArray(parsedData?.projects)
        ? parsedData.projects.filter(proj => proj && proj.title)
        : [],
      certifications: Array.isArray(parsedData?.certifications)
        ? parsedData.certifications.filter(cert => cert && cert.name)
        : [],
      internships: Array.isArray(parsedData?.internships)
        ? parsedData.internships.filter(intern => intern && intern.company)
        : [],
      achievements: Array.isArray(parsedData?.achievements)
        ? parsedData.achievements
            .filter(ach => ach && typeof ach === 'string')
            .map(a => a.trim())
            .filter(a => a.length > 0)
        : [],
      languages: Array.isArray(parsedData?.languages)
        ? parsedData.languages
            .filter(lang => lang && typeof lang === 'string')
            .map(l => l.trim())
            .filter(l => l.length > 0)
        : []
    };

    console.log('✅ Data validation completed:', {
      skills: cleaned.skills.length,
      experience: cleaned.experience.length,
      education: cleaned.education.length,
      projects: cleaned.projects.length
    });

    return cleaned;
  } catch (error) {
    console.error('Error validating resume data:', error.message);
    throw error;
  }
};

// Export helper function for use in other parts of the app
export const extractResumeData = async (pdfBuffer) => {
  try {
    console.log('extractResumeData called');
    const resumeText = await extractTextFromPDF(pdfBuffer);
    const parsedResume = await parseResumeWithGemini(resumeText);
    const cleanedData = validateAndCleanResumeData(parsedResume);
    return cleanedData;
  } catch (error) {
    console.error('Error extracting resume data:', error.message);
    throw error;
  }
};