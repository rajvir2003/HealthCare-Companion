export const query = async (data) => {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/google/gemma-1.1-7b-it",
      {
        headers: {
          Authorization: "Bearer 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",
          "Content-Type": "application/json", // Make sure to set the Content-Type header
        },
        method: "POST",
        body: JSON.stringify({ inputs: data }), // Wrap your data in an "inputs" property
      }
    );
    const result = await response.json();
    return result;
  }

export default query;