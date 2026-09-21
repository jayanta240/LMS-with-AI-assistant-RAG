import os

from openai import OpenAI

from config import settings


# Groq exposes an OpenAI-compatible API.
# Read the key from the server environment; never hard-code it
# or print it into application logs.
client = OpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)


def ask_llm(prompt: str):

    model = os.getenv(
        "GROQ_MODEL",
        "openai/gpt-oss-20b",
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content
