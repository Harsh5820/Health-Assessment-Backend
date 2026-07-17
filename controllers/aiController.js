const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.generateInsights = async (req, res) => {
  try {
    const { user, reports } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: 'Gemini API key is not configured in .env' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const latestReport = reports && reports.length > 0 ? reports[0] : null;

    if (!latestReport) {
      return res.status(400).json({ success: false, message: 'No reports found for this user to analyze.' });
    }

    const prompt = `
You are a highly knowledgeable, empathetic, and professional AI Health and Wellness Coach.

Patient Profile:
- Name: ${user.name}
- Age: ${user.age || 'Unknown'}
- Gender: ${user.gender || 'Unknown'}
- Current Health Condition: ${user.health_condition || 'None'}
- Primary Beauty/Wellness Goal: ${user.beauty_goal || 'General Wellbeing'}

Latest Health Report Data:
- Hemoglobin: ${latestReport.hemoglobin} g/dL
- Vitamin D: ${latestReport.vitamin_d} ng/mL
- Cholesterol: ${latestReport.cholesterol} mg/dL
- Fasting Blood Sugar: ${latestReport.blood_sugar_fasting} mg/dL
- Creatinine: ${latestReport.creatinine} mg/dL
- BMI: ${latestReport.bmi} kg/m²
- Urine Protein: ${latestReport.urine_protein || 'N/A'}
- Doctor's Notes: ${latestReport.doctor_notes || 'None'}

Instructions:
1. Briefly summarize their current status based on their test results in one short paragraph. Acknowledge their health condition and beauty goal.
2. Identify any metrics that are out of standard healthy ranges.
3. Provide 3 highly actionable, specific, and concise lifestyle, diet, or supplement tips that directly address their out-of-range metrics and help them achieve their specific beauty/wellness goal.
4. Format your response in clean HTML using tags like <h3>, <p>, <ul>, <li>, and <strong>. Do NOT use markdown code blocks like \`\`\`html. Just return the raw HTML string so it can be safely injected into the DOM.
5. Keep the tone encouraging and positive. Include a brief one-sentence disclaimer at the very end that they should consult a doctor before making major changes.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    if (text.startsWith('\`\`\`html')) {
        text = text.replace('\`\`\`html', '').replace('\`\`\`', '');
    } else if (text.startsWith('\`\`\`')) {
        text = text.replace('\`\`\`', '').replace('\`\`\`', '');
    }

    res.status(200).json({
      success: true,
      data: text
    });

  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({ success: false, message: 'Failed to generate AI insights due to an internal error.' });
  }
};
