import { GoogleGenAI } from "@google/genai";
import { supabase } from '../config/supabase.js';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateRoadmap = async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('🛣️  Generating Roadmap with Gemini AI');
    console.log('========================================');

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { skills, jobTitle, company, jobId, description } = req.body;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'Skills array is required' });
    }

    if (!jobTitle) {
      return res.status(400).json({ error: 'Job title is required' });
    }

    console.log('Generating roadmap for:', { skills, jobTitle, company });

    // Create prompt for Gemini
    const prompt = `
ACT AS: A Senior Technical Architect and Career Coach.
JOB ROLE: ${jobTitle}
COMPANY: ${company || 'Unknown Company'}
REQUIRED SKILLS: ${skills.join(', ')}
JOB DESCRIPTION: ${description || 'No description provided'}

TASK: 
1. Analyze the Job Description and required skills.
2. Create a comprehensive, step-by-step weekly learning roadmap that covers ALL these skills from scratch.
3. The roadmap should be structured for a student to become job-ready for this specific position.
4. For each week, provide a clear topic and 2-3 specific free learning resources (e.g., "Web Dev Simplified YouTube", "MDN Docs", "FreeCodeCamp").
5. Estimate total weeks needed and break it into phases: Beginner, Intermediate, Advanced.
6. Include project ideas to apply learnings.

RESPONSE FORMAT (STRICT JSON):
{
  "title": "Learning Roadmap for ${jobTitle}",
  "totalWeeks": <number>,
  "estimatedMonthsToJobReady": <number>,
  "phases": [
    {
      "phase": "Phase Name",
      "duration": "<weeks>",
      "difficulty": "Beginner|Intermediate|Advanced",
      "skills": ["skill1", "skill2"],
      "weeks": [
        {
          "week": 1,
          "topic": "Topic Name",
          "learning_objective": "What will be learned",
          "resources": [
            "Resource 1 - Type (YouTube/Docs/Course)",
            "Resource 2 - Type (YouTube/Docs/Course)",
            "Resource 3 - Type (YouTube/Docs/Course)"
          ],
          "tasks": ["task1", "task2", "task3"]
        }
      ],
      "projects": ["Project idea 1", "Project idea 2"]
    }
  ],
  "finalProject": "Comprehensive project idea",
  "tips": ["tip1", "tip2", "tip3"]
}

Generate a detailed, practical roadmap now:`;

    console.log('Calling Gemini API...');

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const response = result;

    console.log('Gemini response received');

    // Extract text from response
    let roadmapText;
    if (response.candidates && response.candidates[0]) {
      const content = response.candidates[0].content;
      if (content.parts && content.parts[0]) {
        roadmapText = content.parts[0].text;
      }
    }

    if (!roadmapText) {
      console.error('❌ No text in Gemini response');
      return res.status(500).json({ 
        error: 'No response from Gemini API',
        fullResponse: response
      });
    }

    console.log('Response text received, parsing...');

    // Parse the JSON response from Gemini
    let roadmapData;
    try {
      // Extract JSON from the response (Gemini might add extra text)
      const jsonMatch = roadmapText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        roadmapData = JSON.parse(jsonMatch[0]);
        console.log('✅ JSON parsed successfully');
      } else {
        console.error('❌ No JSON found in response');
        console.log('Raw response:', roadmapText.substring(0, 500));
        return res.status(500).json({ 
          error: 'No JSON found in AI response',
          rawResponse: roadmapText.substring(0, 500)
        });
      }
    } catch (parseError) {
      console.error('❌ Error parsing Gemini response:', parseError);
      console.log('Raw response:', roadmapText.substring(0, 500));
      return res.status(500).json({ 
        error: 'Failed to parse AI response',
        details: parseError.message,
        rawResponse: roadmapText.substring(0, 500)
      });
    }

    console.log('Roadmap data structure:', roadmapData);

    // Save to user_roadmaps table
    const { data, error } = await supabase
      .from('user_roadmaps')
      .insert({
        user_id: req.user.id,
        job_title: jobTitle,
        company_name: company || 'Unknown Company',
        job_id: jobId || null,
        skills: skills,
        roadmap_data: roadmapData,
        status: 'In Progress',
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('❌ Error saving roadmap to database:', error);
      return res.status(500).json({ error: `Failed to save roadmap: ${error.message}` });
    }

    console.log('✅ Roadmap generated and saved successfully');
    console.log('========================================\n');

    return res.status(201).json({
      success: true,
      message: 'Roadmap generated successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('❌ Error in generateRoadmap:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to generate roadmap',
      details: error.message 
    });
  }
};

// Get user roadmaps
export const getUserRoadmaps = async (req, res) => {
  try {
    console.log('📋 Fetching roadmaps for user:', req.user?.id);

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabase
      .from('user_roadmaps')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching roadmaps:', error);
      return res.status(500).json({ error: 'Failed to fetch roadmaps' });
    }

    console.log('✅ Roadmaps retrieved:', data?.length || 0);
    return res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('❌ Error in getUserRoadmaps:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Get single roadmap
export const getRoadmapById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Fetching roadmap:', id);

    const { data, error } = await supabase
      .from('user_roadmaps')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching roadmap:', error);
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    console.log('✅ Roadmap retrieved');
    return res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('❌ Error in getRoadmapById:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Update roadmap progress
export const updateRoadmapProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progress_percentage, completedWeeks } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Updating roadmap progress:', { id, status, progress_percentage });

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (progress_percentage !== undefined) updateData.progress_percentage = progress_percentage;
    if (completedWeeks !== undefined) {
      updateData.completed_weeks = completedWeeks;
    }

    const { data, error } = await supabase
      .from('user_roadmaps')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) {
      console.error('❌ Error updating roadmap:', error);
      return res.status(500).json({ error: 'Failed to update roadmap' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    console.log('✅ Roadmap updated successfully');
    return res.status(200).json({
      success: true,
      message: 'Roadmap updated successfully',
      data: data[0]
    });
  } catch (error) {
    console.error('❌ Error in updateRoadmapProgress:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Delete roadmap
export const deleteRoadmap = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Deleting roadmap:', id);

    const { error } = await supabase
      .from('user_roadmaps')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('❌ Error deleting roadmap:', error);
      return res.status(500).json({ error: 'Failed to delete roadmap' });
    }

    console.log('✅ Roadmap deleted successfully');
    return res.status(200).json({
      success: true,
      message: 'Roadmap deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteRoadmap:', error);
    return res.status(500).json({ error: error.message });
  }
};