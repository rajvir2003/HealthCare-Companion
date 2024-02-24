export const query = async (data) => {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/OpenAssistant/oasst-sft-4-pythia-12b-epoch-3.5",
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