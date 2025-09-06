from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from google.cloud import aiplatform
# from google.protobuf import json_format
# from google.protobuf.struct_pb2 import Value
from ..config import Settings, settings
from typing import Dict, List, Union
import json

router = APIRouter()

class Message(BaseModel):
    text: str

def get_settings():
    return settings


def predict_custom_trained_model_sample(
    project: str,
    endpoint_id: str,
    instances: List[Dict],
    location: str,
):
    print(f"[VertexAI DEBUG] Project: {project}, Location: {location}")
    
    # Initialize the Vertex AI SDK
    aiplatform.init(project=project, location=location)

    # Get a reference to the endpoint
    endpoint = aiplatform.Endpoint(endpoint_name=endpoint_id)
    
    print(f"[VertexAI DEBUG] Calling endpoint: {endpoint.resource_name}")

    try:
        response = endpoint.predict(instances=instances)
        return response
    except Exception as e:
        print(f"[VertexAI DEBUG] Exception from SDK predict call: {str(e)}")
        raise e


@router.post("/predict/")
async def get_prediction(message: Message, settings: Settings = Depends(get_settings)):
    try:
        if not all([settings.project_id, settings.endpoint_id, settings.location]):
            raise HTTPException(status_code=500, detail="Missing Vertex AI configuration.")

        prompt_template = f"""
You are an expert scam detection AI. Analyze the user's message for phishing and scam indicators.
Your response MUST be a single, valid JSON object and nothing else. Do not include any text, explanations, or markdown formatting before or after the JSON object.

The JSON object must have the following structure:
{{
  "score": <an integer risk score from 0 to 100>,
  "annotated": "<The original message with suspicious parts highlighted. You can invent simple tags like <warn>text</warn> or <bad>text</bad> but the frontend does not use them, so it is not critical.>",
  "findings": [
    {{
      "label": "<A short title for the finding, e.g., 'Urgency and Fear Appeal'>",
      "why": "<A one-sentence explanation of why this is risky.>",
      "severity": "<'warn' or 'bad'>"
    }}
  ]
}}

Now, analyze the following message:
--- MESSAGE START ---
{message.text}
--- MESSAGE END ---
"""

        instances = [{
            "@requestFormat": "chatCompletions",
            "messages": [
                {
                    "role": "user",
                    "content": prompt_template
                }
            ],
            "max_tokens": 1024,
            "temperature": 0.2,
            "top_p": 1.0,
            "top_k": -1
        }]
        
        prediction_response = predict_custom_trained_model_sample(
            project=settings.project_id,
            endpoint_id=settings.endpoint_id,
            location=settings.location,
            instances=instances,
        )
        
        # 1. Start with the prediction dictionary
        prediction_dict = prediction_response.predictions
        
        # 2. Navigate the real structure: dict -> 'choices' key -> list[0] -> 'message' key -> 'content' key
        ai_content_string = prediction_dict['choices'][0]['message']['content']
        
        cleaned_json_string = ai_content_string.replace("```json", "").replace("```", "").strip()
        
        ai_data = json.loads(cleaned_json_string)

        return ai_data

    except Exception as e:
        import traceback
        if 'prediction_response' in locals():
            print(f"[DEBUG ON ERROR] The prediction_response.predictions object was: {prediction_response.predictions}")
        print(f"An error occurred in get_prediction: {e}")
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"An error occurred while processing the AI response: {str(e)}")