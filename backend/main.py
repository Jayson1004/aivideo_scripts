import os
import json
import httpx
import aiofiles
from fastapi import FastAPI, HTTPException, Body, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from typing import List, Dict, Any
import datetime
import base64

# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str, sender: WebSocket = None):
        for connection in self.active_connections:
            if connection != sender:
                await connection.send_text(message)

manager = ConnectionManager()

# --- Configuration ---
class Settings(BaseSettings):
    storyboard_save_path: str = "storyboards"

    class Config:
        env_file = ".env"

settings = Settings()

# --- Pydantic Models for Request Body ---
class Part(BaseModel):
    text: str | None = None
    inline_data: Dict[str, Any] | None = None

class Content(BaseModel):
    role: str
    parts: List[Part]

class StoryboardRequest(BaseModel):
    theme: str = Field(..., description="The theme of the script, used for categorizing storyboards.")
    contents: List[Content] = Field(..., description="The content to be sent to the generation API.")

class UpdateSavePathRequest(BaseModel):
    new_path: str = Field(..., description="The new absolute or relative path to save storyboards.")

# --- Pydantic Models for Text Generation ---
class TextGenerateRequest(BaseModel):
    prompt: str
    model: str
    token: str

class BookwormContentPart(BaseModel):
    type: str
    text: str | None = None
    image_url: Dict[str, str] | None = None

class BookwormMessage(BaseModel):
    role: str
    content: List[BookwormContentPart]

class BookwormRequest(BaseModel):
    model: str
    stream: bool
    messages: List[BookwormMessage]
    max_tokens: int
    token: str

# --- FastAPI Application ---
app = FastAPI()

# --- Middleware ---

# CORS Middleware
# This allows the frontend (running on a different port) to communicate with the backend.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://172.30.218.241:5173", # From user's error log
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- API Endpoints ---

@app.post("/api/text/generate", response_class=PlainTextResponse)
async def generate_text(request: TextGenerateRequest):
    if not request.token:
        raise HTTPException(status_code=400, detail="API token is required")

    headers = {
        'Authorization': f'Bearer {request.token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    base_url = "http://yunwu.ai"
    url = ""
    payload = {}

    if 'gpt' in request.model:
        url = f"{base_url}/v1/responses"
        payload = {
            "model": request.model,
            "input": [{"role": "user", "content": [{"type": "input_text", "text": request.prompt}]}],
            "tools": [],
            "text": {"format": {"type": "text"}, "verbosity": "medium"},
            "reasoning": {"effort": "medium", "summary": 'auto'},
            "stream": False,
            "store": False
        }
    elif 'claude' in request.model:
        url = f"{base_url}/v1/messages"
        payload = {
            "model": request.model,
            "system": "你是一个智能AI助手。",
            "messages": [{"role": "user", "content": request.prompt}],
            "stream": False,
            "max_tokens": 8000,
            "thinking": {"type": "enabled", "budget_tokens": 5200}
        }
    elif 'gemini' in request.model:
        url = f"{base_url}/v1/chat/completions"
        payload = {
            "model": request.model,
            "messages": [{"role": "user", "content": request.prompt}],
            "temperature": 0.1,
            "top_p": 1,
            "stream": False,
            "reasoning_effort": "low"
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported model: {request.model}")

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            result_text = ""

            if 'claude' in request.model:
                if data.get('content') and len(data['content']) > 0:
                    result_text = data['content'][0].get('text', '')
            elif 'gpt' in request.model:
                if output := data.get('output'):
                    for el in output:
                        if el.get('type') == "message" and el.get('content') and el['content'][0].get('type') == "output_text":
                            result_text = el['content'][0].get('text', '')
                            break # Found the text, no need to continue loop
            elif 'gemini' in request.model:
                if choices := data.get('choices'):
                    if message := choices[0].get('message'):
                        result_text = message.get('content', '')
            
            return result_text

        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Error calling external text generation API: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"External text generation API returned an error: {e.response.text}")
        except Exception as e:
            # Catch any other unexpected errors (e.g., JSONDecodeError)
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@app.post("/api/bookworm/analyze", response_class=PlainTextResponse)
async def bookworm_analyze(request: BookwormRequest):
    if not request.token:
        raise HTTPException(status_code=400, detail="API token is required")

    headers = {
        'Authorization': f'Bearer {request.token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        "model": request.model,
        "stream": False,
        "messages": [msg.dict() for msg in request.messages],
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            response = await client.post("https://api.apimart.ai/v1/chat/completions", json=payload, headers=headers)
            print(response)
            response.raise_for_status()
            # Assuming the response is JSON and we need to extract text from it.
            # This part might need adjustment based on the actual API response structure.
            data = response.json()
            # A plausible structure based on OpenAI's format
            if choices := data.get("choices"):
                if message := choices[0].get("message"):
                    return message.get("content", "")
            return "" # Return empty string if no content found
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Error calling Bookworm API: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Bookworm API returned an error: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")




@app.get("/api/config/save-path")
def get_save_path():
    """Returns the current storyboard save path."""
    return {"storyboard_save_path": settings.storyboard_save_path}

@app.put("/api/config/save-path")
async def update_save_path(request: UpdateSavePathRequest):
    """
    Updates the storyboard save path in memory and in the .env file.
    """
    new_path = request.new_path
    if not new_path or not isinstance(new_path, str):
        raise HTTPException(status_code=400, detail="Invalid path provided.")

    # Update setting in memory for the current session
    settings.storyboard_save_path = new_path

    # Update .env file for persistence
    env_file_path = settings.Config.env_file
    try:
        lines = []
        found = False
        if os.path.exists(env_file_path):
            async with aiofiles.open(env_file_path, mode='r') as f:
                lines = await f.readlines()

        new_lines = []
        for line in lines:
            if line.strip().startswith("STORYBOARD_SAVE_PATH="):
                new_lines.append(f'STORYBOARD_SAVE_PATH="{new_path}"\n')
                found = True
            else:
                new_lines.append(line)

        if not found:
            new_lines.append(f'STORYBOARD_SAVE_PATH="{new_path}"\n')

        async with aiofiles.open(env_file_path, mode='w') as f:
            await f.writelines(new_lines)

    except Exception as e:
        # If updating the file fails, we should ideally revert the in-memory change
        # or at least warn the user. For now, we raise an error.
        raise HTTPException(status_code=500, detail=f"Failed to update .env file: {e}")

    return {"message": "Storyboard save path updated successfully.", "new_path": new_path}


# --- Pydantic Models for Image Generation ---
class BaseImage(BaseModel):
    name: str
    url: str  # Expecting a data URL from the frontend

class ExternalGenerateRequest(BaseModel):
    prompt: str
    model: str = 'gemini-2.5-flash-image-preview'
    token: str
    aspect_ratio: str = '16:9'
    size: str = '1*1'
    base_imgs: List[BaseImage] = []
    image_style: str | None = None
    image_quality: str | None = None
    return_base64: bool = False

def data_url_to_bytes(data_url: str):
    """Decodes a data URL string into a tuple of (mime_type, content_bytes)."""
    try:
        header, encoded = data_url.split(',', 1)
        mime_type = header.split(';')[0].split(':')[1]
        data = base64.b64decode(encoded)
        return mime_type, data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid data URL format: {e}")

@app.post("/api/images/generate-external")
async def generate_external_image(request: ExternalGenerateRequest):
    headers = {
        'Authorization': f'Bearer {request.token}',
        'Content-Type': 'application/json'
    }
    base_url = "http://yunwu.ai"

    async with httpx.AsyncClient(timeout=600.0) as client:
        try:
            if 'seedream' in request.model:
                payload = {
                    "model": "doubao-seedream-4-0-250828",
                    "prompt": request.prompt,
                    "size": request.size,
                    "sequential_image_generation": "disabled",
                    "stream": False,
                    "response_format": "url",
                    "watermark": True
                }
                response = await client.post(f"{base_url}/v1/images/generations", json=payload, headers=headers)
                response.raise_for_status()
                return response.json() # Assuming it returns URL directly

            elif 'dall' in request.model or 'gpt' in request.model:
                if request.base_imgs:
                    if 'dall' in request.model:
                        raise HTTPException(status_code=400, detail="DALL-E models do not support base images (image editing).")
                    
                    base_prompt = '请对应参考参数image里的图片：'
                    files = []
                    for i, img in enumerate(request.base_imgs):
                        base_prompt += f"图{i + 1} ({img.name}), "
                        mime_type, content_bytes = data_url_to_bytes(img.url)
                        files.append(("image", (f"image_{i+1}.png", content_bytes, mime_type)))
                    
                    data = {
                        "prompt": f"{base_prompt}帮我根据描述生成新的一张图: {request.prompt}",
                        "model": request.model,
                        "n": "1",
                        "size": request.size
                    }
                    
                    # httpx requires headers to be handled differently for multipart
                    edit_headers = {'Authorization': f'Bearer {request.token}'}
                    response = await client.post(f"{base_url}/v1/images/edits", data=data, files=files, headers=edit_headers)

                else: # Text-to-image
                    payload = {
                        "prompt": request.prompt,
                        "n": 1,
                        "model": request.model,
                        "size": request.size,
                        "response_format": "b64_json",
                        "style": request.image_style,
                        "quality": request.image_quality,
                    }
                    response = await client.post(f"{base_url}/v1/images/generations", json=payload, headers=headers)
                
                response.raise_for_status()
                api_data = response.json()
                # The frontend expects a direct URL or base64 string, not the full API response.
                # We will extract the relevant part.
                if api_data.get("data") and len(api_data["data"]) > 0:
                    if b64_json := api_data["data"][0].get("b64_json"):
                        return f"data:image/png;base64,{b64_json}"
                    elif url := api_data["data"][0].get("url"):
                        return url
                return api_data # Fallback

            else: # Gemini
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [{"text": f"generate a picture: {request.prompt}"}]
                        }
                    ],
                    "generationConfig": {
                        "responseModalities": ["TEXT", "IMAGE"],
                        "imageConfig": {"aspectRatio": request.aspect_ratio}
                    }
                }

                if request.base_imgs:
                    base_prompt = '请对应参考以下图片：'
                    for i, img in enumerate(request.base_imgs):
                        base_prompt += f"图{i + 1} ({img.name}), "
                    
                    image_parts = []
                    for img in request.base_imgs:
                        mime_type, content_bytes = data_url_to_bytes(img.url)
                        encoded_data = base64.b64encode(content_bytes).decode('utf-8')
                        image_parts.append({"inline_data": {"mime_type": mime_type, "data": encoded_data}})

                    payload["contents"][0]["parts"] = [
                        {"text": f"{base_prompt}帮我根据描述生成新的一张图: {request.prompt}"},
                        *image_parts
                    ]

                gemini_headers = {'Authorization': f'Bearer {request.token}', 'Content-Type': 'application/json'}
                response = await client.post(f"{base_url}/v1beta/models/{request.model}:generateContent?key=", json=payload, headers=gemini_headers)
                response.raise_for_status()
                api_data = response.json()

                # Extract image from response
                if candidates := api_data.get("candidates"):
                    if parts := candidates[0].get("content", {}).get("parts", []):
                        image_part = next((p for p in parts if "inlineData" in p), None)
                        if image_part:
                            b64_data = image_part["inlineData"]["data"]
                            mime_type = image_part["inlineData"]["mimeType"]
                            if request.return_base64:
                                return f"data:{mime_type};base64,{b64_data}"
                            else:
                                # The frontend had a function to convert this to a blob URL.
                                # The backend can't do that, so we return the data URL.
                                return f"data:{mime_type};base64,{b64_data}"
                raise HTTPException(status_code=500, detail="No image data found in Gemini response")

        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Error calling external API: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"External API returned an error: {e.response.text}")


@app.options("/api/images/generate-external")
async def options_generate_external_image():
    return Response(status_code=200)


# --- Pydantic Models for Video Generation ---
class VideoGenerateRequest(BaseModel):
    provider: str
    token: str
    prompt: str
    seconds: int | None = None
    size: str | None = None
    watermark: bool | None = None
    is_private: bool | None = None
    n_frames: int | None = None
    aspect_ratio: str | None = None
    remove_watermark: bool | None = None


# --- Video Generation Endpoints ---

@app.post("/api/videos/generate")
async def generate_video(request: VideoGenerateRequest):
    if not request.token:
        raise HTTPException(status_code=400, detail="API token is required")

    headers = {'Authorization': f'Bearer {request.token}'}
    
    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            if request.provider == "yunwu":
                data = {
                    'model': 'sora-2',
                    'prompt': request.prompt,
                    'seconds': request.seconds,
                    'size': request.size,
                    'watermark': request.watermark,
                    'private': request.is_private,
                }
                # Yunwu uses multipart/form-data
                response = await client.post("http://yunwu.ai/v1/videos", data=data, headers=headers)

            elif request.provider == "kie":
                payload = {
                    'model': 'sora-2-text-to-video',
                    'callBackUrl': '',
                    'input': {
                        'prompt': request.prompt,
                        'aspect_ratio': request.aspect_ratio,
                        'n_frames': str(request.n_frames),
                        'remove_watermark': request.remove_watermark,
                    },
                }
                headers['Content-Type'] = 'application/json'
                response = await client.post("https://api.kie.ai/api/v1/jobs/createTask", json=payload, headers=headers)
            
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported video provider: {request.provider}")

            response.raise_for_status()
            return response.json()

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Error calling external video API: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"External video API returned an error: {e.response.text}")


@app.get("/api/videos/status/{provider}/{task_id}")
async def get_video_status(provider: str, task_id: str, request: Request):
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="Authorization token is required")

    headers = {'Authorization': token} # The token from frontend is "Bearer <token>"
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if provider == "yunwu":
                url = f"http://yunwu.ai/v1/videos/{task_id}"
            elif provider == "kie":
                url = f"https://api.kie.ai/api/v1/jobs/recordInfo?taskId={task_id}"
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported video provider: {provider}")

            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Error calling external status API: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"External status API returned an error: {e.response.text}")




@app.post("/api/generate-storyboard")
async def generate_storyboard(request: StoryboardRequest = Body(...)):
    """
    Receives a theme and content, forwards it to the yunwu.ai API,
    and saves the resulting storyboard to a theme-based directory.
    """
    # 1. Prepare the request for the external API
    payload = {"contents": [content.dict(exclude_none=True) for content in request.contents]}

    # 2. Call the external yunwu.ai API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("https://yunwu.ai/api/generate", json=payload, timeout=30.0)
            response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes
            api_result = response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Error calling external API: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"External API returned an error: {e.response.text}")

    # 3. Create the save directory
    save_dir = os.path.join(settings.storyboard_save_path, request.theme)
    try:
        os.makedirs(save_dir, exist_ok=True)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Error creating storyboard directory: {e}")

    # 4. Save the result to a file
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(save_dir, f"storyboard_{timestamp}.json")

    try:
        async with aiofiles.open(file_path, mode='w', encoding='utf-8') as f:
            await f.write(json.dumps(api_result, indent=4))
    except IOError as e:
        raise HTTPException(status_code=500, detail=f"Error saving storyboard file: {e}")

    return {"message": "Storyboard generated successfully.", "file_path": file_path}


@app.options("/api/generate-storyboard")
async def options_generate_storyboard():
    return Response(status_code=200)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # When data is received, broadcast it to all other clients
            await manager.broadcast(data, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("A client disconnected.")


# --- Root endpoint for health check ---
@app.get("/")
def read_root():
    return {"status": "AIVideo Backend is running"}

# --- Pydantic Models for File Saving ---
class SaveTextRequest(BaseModel):
    topic: str = Field(..., description="The topic or theme, used as the directory name.")
    filename: str = Field(..., description="The name of the file to save.")
    content: str = Field(..., description="The text content to save.")

class SaveImageRequest(BaseModel):
    topic: str = Field(..., description="The topic or theme, used as the directory name.")
    filename: str = Field(..., description="The name of the image file to save.")
    image_data: str = Field(..., description="The Base64-encoded data URL of the image.")


# --- File Saving Endpoints ---

@app.post("/api/save-text")
async def save_text_file(request: SaveTextRequest):
    """
    Saves text content to a file in a specified topic directory.
    """
    try:
        save_dir = os.path.join(settings.storyboard_save_path, request.topic)
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, request.filename)

        async with aiofiles.open(file_path, mode='w', encoding='utf-8') as f:
            await f.write(request.content)

        return {"message": "Text file saved successfully.", "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save text file: {str(e)}")

@app.post("/api/save-image")
async def save_image_file(request: SaveImageRequest):
    """
    Saves an image/video from a data URL or a network URL to a file.
    """
    try:
        save_dir = os.path.join(settings.storyboard_save_path, request.topic)
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, request.filename)

        data_to_write = b""

        # Check if image_data is a URL
        if request.image_data.startswith(('http://', 'https://')):
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(request.image_data, follow_redirects=True)
                    response.raise_for_status()
                    data_to_write = await response.aread()
                except httpx.RequestError as e:
                    raise HTTPException(status_code=502, detail=f"Failed to download file from URL: {e}")
                except httpx.HTTPStatusError as e:
                    raise HTTPException(status_code=e.response.status_code, detail=f"Error response from URL: {e.response.text}")
        # Assume it's a data URL
        else:
            try:
                header, encoded = request.image_data.split(',', 1)
                data_to_write = base64.b64decode(encoded)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid data URL format.")

        async with aiofiles.open(file_path, mode='wb') as f:
            await f.write(data_to_write)

        return {"message": "File saved successfully.", "path": file_path}
    except Exception as e:
        # Catch-all for other potential errors like file system issues
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
