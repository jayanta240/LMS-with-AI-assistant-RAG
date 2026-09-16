from openai import OpenAI
from config import settings
print("GROQ KEY:", settings.GROQ_API_KEY)
client = OpenAI(
    api_key="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",
    base_url="https://api.groq.com/openai/v1"
)

def ask_llm(prompt: str):
    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    return response.choices[0].message.content