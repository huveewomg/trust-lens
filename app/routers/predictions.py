from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from google.cloud import aiplatform
from config import Settings, settings
from typing import Dict, List, Union
import json
import traceback

router = APIRouter()

class Message(BaseModel):
    text: str

def get_settings():
    return settings

SYSTEM_INSTRUCTIONS = """
You are a security analysis expert. Your task is to understand the semantic meaning of the message and check for phishing and scam indicators. The output must be a single, valid JSON object.

JSON Schema:
{
  "risk_level": "<'safe', 'warning', or 'dangerous'>",
  "score": <integer 0-100, where 0 is safe and 100 is highly risky>,
  "confidence": <integer 0-100>,
  "annotated": "<original message with suspicious parts tagged with <bad> or <warn>>",
  "findings": [
    {
      "label": "<a short title using the input language>",
      "why": "<explanation using the input language>",
      "severity": "<'warn' or 'bad'>"
    }
  ]
}

- A message is 'safe' only if it contains no suspicious elements and should have a score of 0.
- A message is a 'warning' if it contains elements that could be part of a scam but are also common in legitimate messages (e.g., links, phone numbers). The score should be low, from 1-30.
- A message is 'dangerous' if it contains strong indicators of a scam (e.g., a direct request for money, a password reset link to a suspicious domain, or a clear threat). The score should be high, from 31-100.

IMPORTANT LANGUAGE INSTRUCTION:
- Respond with findings (the 'label' and 'why' fields) in the exact language of the input message (not country).
- The JSON keys and structure must always remain unchanged.
"""

def predict_custom_trained_model_sample(
    project: str,
    endpoint_id: str,
    instances: List[Dict],
    location: str,
    credentials=None
):
    print(f"[VertexAI DEBUG] Project: {project}, Location: {location}")
    
    # For dedicated endpoints, we need to use the dedicated domain
    # The project number is 298459812143 (from the error message)
    project_number = "298459812143"
    dedicated_endpoint_domain = f"{endpoint_id}.{location}-{project_number}.prediction.vertexai.goog"
    
    print(f"[VertexAI DEBUG] Using dedicated endpoint domain: {dedicated_endpoint_domain}")
    
    # Initialize the Vertex AI SDK with dedicated endpoint (domain only, no https://)
    aiplatform.init(
        project=project, 
        location=location, 
        credentials=credentials,
        api_endpoint=dedicated_endpoint_domain
    )

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

        # simplified, token-efficient user prompt.
        user_prompt = f"""
Analyze the message for scam indicators.

Message:
---
{message.text}
---
"""

        instances = [{
            "@requestFormat": "chatCompletions",
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_INSTRUCTIONS
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "max_tokens": 1024,
            "temperature": 0.2,
            "top_p": 1.0,
            "top_k": -1
        }]
        
        # Get credentials
        credentials = settings.get_credentials()
        
        prediction_response = predict_custom_trained_model_sample(
            project=settings.project_id,
            endpoint_id=settings.endpoint_id,
            location=settings.location,
            instances=instances,
            credentials=credentials
        )
        
        print(f"[DEBUG] Full prediction response: {prediction_response}")
        print(f"[DEBUG] Prediction response type: {type(prediction_response)}")
        
        # Handle different response formats
        if hasattr(prediction_response, 'predictions'):
            predictions_data = prediction_response.predictions
        else:
            predictions_data = prediction_response
            
        print(f"[DEBUG] Predictions data: {predictions_data}")
        
        # Extract the AI response content
        if isinstance(predictions_data, list) and len(predictions_data) > 0:
            # Handle list format
            first_prediction = predictions_data[0]
            if 'choices' in first_prediction:
                ai_content_string = first_prediction['choices'][0]['message']['content']
            elif 'content' in first_prediction:
                ai_content_string = first_prediction['content']
            else:
                ai_content_string = str(first_prediction)
        elif isinstance(predictions_data, dict):
            # Handle dict format
            if 'choices' in predictions_data:
                ai_content_string = predictions_data['choices'][0]['message']['content']
            elif 'content' in predictions_data:
                ai_content_string = predictions_data['content']
            else:
                ai_content_string = str(predictions_data)
        else:
            ai_content_string = str(predictions_data)
        
        print(f"[DEBUG] Raw AI content: {ai_content_string}")
        
        # Clean the string from potential markdown wrappers
        if ai_content_string.strip().startswith("```json"):
            cleaned_json_string = ai_content_string.replace("```json", "").replace("```", "").strip()
        else:
            cleaned_json_string = ai_content_string.strip()

        print(f"[DEBUG] Cleaned JSON string: {cleaned_json_string}")

        # Attempt to load the JSON with better error handling
        try:
            ai_data = json.loads(cleaned_json_string)
            print(f"[DEBUG] Successfully parsed JSON: {ai_data}")
        except json.JSONDecodeError as json_error:
            print(f"[DEBUG] JSON parsing failed: {json_error}")
            print(f"[DEBUG] Problematic string: {cleaned_json_string[:200]}...")
            # Return a fallback response
            ai_data = {
                "risk_level": "warning",
                "score": 50,
                "confidence": 50,
                "annotated": cleaned_json_string,
                "findings": [
                    {
                        "label": "Parse Error",
                        "why": f"AI response could not be parsed: {str(json_error)}",
                        "severity": "warn"
                    }
                ]
            }

        return ai_data

    except Exception as e:
        if 'prediction_response' in locals():
            print(f"[DEBUG ON ERROR] The prediction_response.predictions object was: {prediction_response.predictions}")
        print(f"An error occurred in get_prediction: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An error occurred while processing the AI response: {str(e)}")