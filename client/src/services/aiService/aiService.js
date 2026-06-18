const API_URL = '/api/ai';

const chatWithAI = async (messages, plantCode) => {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, plantCode }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to communicate with AI');
  }

  const data = await response.json();
  return data.data; // this should be the anthropic response object
};

export const aiService = {
  chatWithAI,
};
