import asyncio
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv(override=True)

async def test():
    client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    print("Testing OpenAI API...")
    try:
        response = await client.chat.completions.create(
            model="gpt-5-nano",
            messages=[{"role": "user", "content": "hi"}],
        )
        print("Success:", response.choices[0].message.content)
    except Exception as e:
        print("Error with gpt-5-nano:", str(e))
        
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "hi"}],
        )
        print("Success gpt-4o:", response.choices[0].message.content)
    except Exception as e:
        print("Error with gpt-4o:", str(e))

if __name__ == "__main__":
    asyncio.run(test())
