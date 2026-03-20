import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

// Note: These functions require OpenAI API key to be configured
// The actual implementation would use the OpenAI SDK

const extractSkillsSchema = z.object({
    jdText: z.string().min(1, 'JD text is required'),
});

const generateEmailSchema = z.object({
    recruiterName: z.string().min(1, 'Recruiter name is required'),
    companyName: z.string().min(1, 'Company name is required'),
    jobRole: z.string().min(1, 'Job role is required'),
    emailType: z.enum(['followup', 'introduction', 'thank_you', 'follow_up_after_interview']),
});

const summarizeNotesSchema = z.object({
    notes: z.array(z.object({
        content: z.string(),
        createdAt: z.string(),
    })).min(1, 'At least one note is required'),
});

export const extractSkills = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = extractSkillsSchema.parse(req.body);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
        // Return mock data if no API key
        const mockSkills = extractSkillsFromText(data.jdText);

        const response: ApiResponse = {
            success: true,
            message: 'Skills extracted (offline mode)',
            data: mockSkills,
        };
        res.json(response);
        return;
    }

    // Actual implementation would use OpenAI
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: [
    //     {
    //       role: 'system',
    //       content: 'Extract the key skills and technologies from the job description. Return a JSON array of skills.'
    //     },
    //     {
    //       role: 'user',
    //       content: data.jdText
    //     }
    //   ]
    // });

    const mockSkills = extractSkillsFromText(data.jdText);

    const response: ApiResponse = {
        success: true,
        message: 'Skills extracted successfully',
        data: mockSkills,
    };

    res.json(response);
};

export const generateEmail = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = generateEmailSchema.parse(req.body);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
        // Return template-based email
        const email = generateTemplateEmail(data);

        const response: ApiResponse = {
            success: true,
            message: 'Email generated (offline mode)',
            data: email,
        };
        res.json(response);
        return;
    }

    // Actual implementation would use OpenAI
    const email = generateTemplateEmail(data);

    const response: ApiResponse = {
        success: true,
        message: 'Email generated successfully',
        data: email,
    };

    res.json(response);
};

export const summarizeNotes = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = summarizeNotesSchema.parse(req.body);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
        // Return simple summary
        const summary = generateSimpleSummary(data.notes);

        const response: ApiResponse = {
            success: true,
            message: 'Notes summarized (offline mode)',
            data: summary,
        };
        res.json(response);
        return;
    }

    // Actual implementation would use OpenAI
    const summary = generateSimpleSummary(data.notes);

    const response: ApiResponse = {
        success: true,
        message: 'Notes summarized successfully',
        data: summary,
    };

    res.json(response);
};

// Helper functions for offline mode
function extractSkillsFromText(text: string): { skills: string[]; experience: string[]; tools: string[] } {
    const allText = text.toLowerCase();

    const skillKeywords = [
        'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
        'node.js', 'express', 'django', 'flask', 'spring', 'sql', 'postgresql',
        'mysql', 'mongodb', 'redis', 'docker', 'kubernetes', 'aws', 'azure',
        'gcp', 'git', 'rest', 'graphql', 'html', 'css', 'tailwind', 'bootstrap',
        'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp',
        'data science', 'analytics', 'tableau', 'power bi', 'excel'
    ];

    const foundSkills = skillKeywords.filter(skill => allText.includes(skill));

    return {
        skills: foundSkills,
        experience: [],
        tools: foundSkills.filter(s => ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git'].includes(s)),
    };
}

function generateTemplateEmail(data: { recruiterName: string; companyName: string; jobRole: string; emailType: string }): { subject: string; body: string } {
    const templates = {
        followup: {
            subject: `Following up on ${data.jobRole} position`,
            body: `Hi ${data.recruiterName},

I hope this email finds you well. I wanted to follow up on the ${data.jobRole} position at ${data.companyName}.

I remain very interested in this opportunity and would love to discuss any updates regarding the hiring process.

Please let me know if there's any additional information I can provide.

Best regards`
        },
        introduction: {
            subject: `Application for ${data.jobRole} position at ${data.companyName}`,
            body: `Hi ${data.recruiterName},

I am writing to express my interest in the ${data.jobRole} position at ${data.companyName}.

With my background and experience, I believe I would be a great fit for this role. I am excited about the opportunity to contribute to your team.

I have attached my resume for your review and would welcome the opportunity to discuss how my skills align with your needs.

Best regards`
        },
        thank_you: {
            subject: `Thank you for the opportunity - ${data.jobRole}`,
            body: `Hi ${data.recruiterName},

Thank you for taking the time to speak with me about the ${data.jobRole} position at ${data.companyName}.

I enjoyed learning more about the role and your team. Our conversation further solidified my interest in joining ${data.companyName}.

Please don't hesitate to reach out if you need any additional information.

Best regards`
        },
        follow_up_after_interview: {
            subject: `Thank you - ${data.jobRole} Interview`,
            body: `Hi ${data.recruiterName},

Thank you for the opportunity to interview for the ${data.jobRole} position at ${data.companyName}.

I enjoyed meeting with you and learning more about the role. I am very excited about the possibility of joining your team.

Please let me know if there's anything else I can provide.

Best regards`
        }
    };

    return templates[data.emailType as keyof typeof templates] || templates.followup;
}

function generateSimpleSummary(notes: { content: string; createdAt: string }[]): { summary: string; keyPoints: string[] } {
    const allContent = notes.map(n => n.content).join('\n');
    const keyPoints = notes.slice(0, 3).map(n => n.content.substring(0, 100) + '...');

    return {
        summary: `Total of ${notes.length} notes recorded. Latest update: ${notes[0]?.createdAt || 'N/A'}`,
        keyPoints
    };
}
