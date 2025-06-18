import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function getMedicalAssistantResponse(messages: ChatMessage[]): Promise<string> {
  try {
    const systemPrompt = `You are Dr. MedAssist, a helpful AI healthcare companion. You provide general health information, symptom guidance, medication information, and wellness tips. 

IMPORTANT GUIDELINES:
- Provide accurate, evidence-based health information
- Always emphasize that you cannot replace professional medical advice
- For serious symptoms or emergencies, direct users to seek immediate medical attention
- Be empathetic and supportive in your responses
- Use clear, easy-to-understand language
- Include practical tips when appropriate
- Add relevant emojis to make responses more engaging
- Format responses with bullet points or sections when helpful

EMERGENCY KEYWORDS: If user mentions severe symptoms like chest pain, difficulty breathing, severe bleeding, loss of consciousness, or uses words like "emergency" or "urgent", immediately advise them to contact emergency services.

Respond in a helpful, professional, and caring manner while being thorough but concise.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I apologize, but I'm having trouble processing your request right now. Please try again.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("I'm currently experiencing technical difficulties. Please try again in a moment.");
  }
}

export async function getQuickActionResponse(action: string): Promise<string> {
  const quickPrompts = {
    symptoms: "Provide information about common symptoms like headaches, fever, cough, and stomach pain. Include when to seek medical attention.",
    medications: "Explain general medication safety, how to read prescription labels, common drug interactions to be aware of, and the importance of following dosing instructions.",
    wellness: "Share practical wellness tips including hydration, exercise, sleep hygiene, stress management, and healthy eating habits.",
    emergency: "Explain when to call emergency services, what constitutes a medical emergency, and basic first aid principles. Emphasize the importance of immediate professional medical help for serious conditions."
  };

  const prompt = quickPrompts[action as keyof typeof quickPrompts] || quickPrompts.symptoms;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Dr. MedAssist, a helpful AI healthcare companion. Provide clear, helpful health information with appropriate warnings about seeking professional medical care when needed."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "I apologize, but I'm having trouble providing that information right now.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("I'm currently experiencing technical difficulties. Please try again in a moment.");
  }
}
