#!/usr/bin/env python
"""
Webhook-based Chat Server with Claude Opus 4 - True Streaming Version
Features:
    - Real-time streaming responses using Server-Sent Events (SSE)
    - Thinking mode with live updates
    - Conversation memory (JSON file storage)
    - Easy server deployment
"""

import asyncio
import json
import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import aiohttp
from aiohttp import web
from aiohttp_sse import sse_response
from dotenv import load_dotenv

# Configuration
MODEL = "claude-opus-4-20250514"
# Use data directory for Docker volume persistence
DATA_DIR = os.getenv('DATA_DIR', '/app/data')
MEMORY_FILE = os.path.join(DATA_DIR, "chat_memory.json")
MAX_MEMORY_SIZE = 50  # Maximum number of conversations to store
THINKING_BUDGET = 2048
MAX_TOKENS = 8192
TEMPERATURE = 1.0

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Load environment variables
load_dotenv()

class ConversationMemory:
    """Manages conversation history and memory persistence"""
    
    def __init__(self, memory_file: str = MEMORY_FILE):
        self.memory_file = Path(memory_file)
        self.conversations = self.load_memory()
    
    def load_memory(self) -> Dict[str, List[Dict]]:
        """Load conversation history from JSON file"""
        if self.memory_file.exists():
            try:
                with open(self.memory_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[WARNING] Failed to load memory: {e}")
        return {}
    
    def save_memory(self):
        """Save conversation history to JSON file"""
        try:
            # Limit memory size to prevent unbounded growth
            if len(self.conversations) > MAX_MEMORY_SIZE:
                # Keep only the most recent conversations
                sorted_convs = sorted(
                    self.conversations.items(),
                    key=lambda x: x[1][-1]['timestamp'] if x[1] else '',
                    reverse=True
                )
                self.conversations = dict(sorted_convs[:MAX_MEMORY_SIZE])
            
            with open(self.memory_file, 'w', encoding='utf-8') as f:
                json.dump(self.conversations, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[ERROR] Failed to save memory: {e}")
    
    def add_message(self, conversation_id: str, role: str, content: str, thinking: Optional[str] = None):
        """Add a message to conversation history"""
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        
        if thinking:
            message["thinking"] = thinking
        
        self.conversations[conversation_id].append(message)
        self.save_memory()
    
    def get_conversation(self, conversation_id: str) -> List[Dict]:
        """Get conversation history"""
        return self.conversations.get(conversation_id, [])
    
    def format_messages_for_claude(self, conversation_id: str) -> List[Dict]:
        """Format conversation history for Claude API"""
        messages = []
        conversation = self.get_conversation(conversation_id)
        
        for msg in conversation:
            # Only include user and assistant messages (not thinking)
            if msg['role'] in ['user', 'assistant']:
                messages.append({
                    "role": msg['role'],
                    "content": msg['content']
                })
        
        return messages

class ClaudeChat:
    """Handles Claude API interactions with streaming and thinking mode"""
    
    def __init__(self, memory: ConversationMemory):
        self.memory = memory
        self.api_key = os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    
    async def stream_response(self, conversation_id: str, user_message: str, system_prompt: Optional[str] = None):
        """Stream response from Claude with thinking mode enabled"""
        
        # Add user message to memory
        self.memory.add_message(conversation_id, "user", user_message)
        
        # Get conversation history
        messages = self.memory.format_messages_for_claude(conversation_id)
        
        # Load default system prompt if none provided
        if not system_prompt:
            prompt_file = Path(__file__).parent / 'system-prompt-integrated.txt'
            if prompt_file.exists():
                system_prompt = prompt_file.read_text(encoding='utf-8')
        
        # Prepare request payload
        payload = {
            "model": MODEL,
            "messages": messages,
            "max_tokens": MAX_TOKENS,
            "temperature": TEMPERATURE,
            "stream": True,
            "thinking": {
                "type": "enabled",
                "budget_tokens": THINKING_BUDGET
            }
        }
        
        if system_prompt:
            payload["system"] = system_prompt
        
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Track response parts
        thinking_content = []
        text_content = []
        start_time = time.time()
        first_token_time = None
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.anthropic.com/v1/messages",
                json=payload,
                headers=headers
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Claude API error {response.status}: {error_text}")
                
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith('data: '):
                        try:
                            event_data = json.loads(line[6:])
                            
                            # Track time to first token
                            if first_token_time is None and event_data.get("type") == "content_block_delta":
                                first_token_time = time.time() - start_time
                            
                            if event_data.get("type") == "content_block_delta":
                                delta = event_data.get("delta", {})
                                
                                if delta.get("type") == "thinking_delta":
                                    thinking_text = delta.get("thinking", "")
                                    thinking_content.append(thinking_text)
                                    # Yield thinking content with special marker
                                    yield {"type": "thinking", "content": thinking_text}
                                    
                                elif delta.get("type") == "text_delta":
                                    text = delta.get("text", "")
                                    text_content.append(text)
                                    # Yield text content
                                    yield {"type": "text", "content": text}
                            
                            elif event_data.get("type") == "message_stop":
                                # End of stream
                                break
                                
                        except json.JSONDecodeError:
                            continue
        
        # Save complete response to memory
        complete_thinking = "".join(thinking_content).strip()
        complete_text = "".join(text_content).strip()
        
        self.memory.add_message(
            conversation_id,
            "assistant",
            complete_text,
            thinking=complete_thinking if complete_thinking else None
        )
        
        # Yield final metadata
        yield {
            "type": "metadata",
            "ttft": first_token_time or (time.time() - start_time),
            "total_time": time.time() - start_time
        }

# Web server setup
async def handle_chat_stream(request):
    """Handle streaming chat requests with SSE"""
    try:
        data = await request.json()
        
        # Extract required fields
        message = data.get('message')
        conversation_id = data.get('conversation_id', str(uuid.uuid4()))
        system_prompt = data.get('system_prompt')
        
        if not message:
            return web.json_response({
                'error': 'Missing required field: message'
            }, status=400)
        
        # Initialize chat handler
        memory = ConversationMemory()
        chat = ClaudeChat(memory)
        
        # Create SSE response
        async with sse_response(request) as resp:
            # Send initial connection event
            await resp.send(json.dumps({
                'type': 'connected',
                'conversation_id': conversation_id
            }), event='message')
            
            # Stream response
            async for chunk in chat.stream_response(conversation_id, message, system_prompt):
                await resp.send(json.dumps(chunk), event='message')
            
            # Send completion event
            await resp.send(json.dumps({
                'type': 'complete'
            }), event='message')
        
        return resp
        
    except Exception as e:
        print(f"[ERROR] Chat request failed: {e}")
        return web.json_response({
            'error': str(e)
        }, status=500)

async def handle_chat(request):
    """Handle non-streaming chat requests (backward compatibility)"""
    try:
        data = await request.json()
        
        # Extract required fields
        message = data.get('message')
        conversation_id = data.get('conversation_id', str(uuid.uuid4()))
        system_prompt = data.get('system_prompt')
        
        if not message:
            return web.json_response({
                'error': 'Missing required field: message'
            }, status=400)
        
        # Initialize chat handler
        memory = ConversationMemory()
        chat = ClaudeChat(memory)
        
        # Collect streaming response
        response_parts = {
            'thinking': [],
            'text': [],
            'metadata': {}
        }
        
        # Collect streaming response
        async for chunk in chat.stream_response(conversation_id, message, system_prompt):
            if chunk['type'] == 'thinking':
                response_parts['thinking'].append(chunk['content'])
            elif chunk['type'] == 'text':
                response_parts['text'].append(chunk['content'])
            elif chunk['type'] == 'metadata':
                response_parts['metadata'] = chunk
        
        # Prepare response
        response_data = {
            'conversation_id': conversation_id,
            'response': ''.join(response_parts['text']),
            'thinking': ''.join(response_parts['thinking']) if response_parts['thinking'] else None,
            'metadata': {
                'model': MODEL,
                'ttft': response_parts['metadata'].get('ttft'),
                'total_time': response_parts['metadata'].get('total_time'),
                'thinking_enabled': True,
                'streaming_used': True
            }
        }
        
        return web.json_response(response_data)
        
    except Exception as e:
        print(f"[ERROR] Chat request failed: {e}")
        return web.json_response({
            'error': str(e)
        }, status=500)

async def handle_conversation_history(request):
    """Get conversation history"""
    conversation_id = request.match_info.get('conversation_id')
    
    if not conversation_id:
        return web.json_response({
            'error': 'Missing conversation_id'
        }, status=400)
    
    memory = ConversationMemory()
    history = memory.get_conversation(conversation_id)
    
    return web.json_response({
        'conversation_id': conversation_id,
        'history': history
    })

async def handle_health(request):
    """Health check endpoint"""
    return web.json_response({
        'status': 'healthy',
        'model': MODEL,
        'features': {
            'thinking': True,
            'streaming': True,
            'memory': True,
            'sse': True
        }
    })

@web.middleware
async def cors_middleware(request, handler):
    """Add CORS headers to all responses"""
    
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response = web.Response()
    else:
        response = await handler(request)
    
    # Add CORS headers
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Cache-Control'
    response.headers['Access-Control-Expose-Headers'] = '*'
    response.headers['Access-Control-Max-Age'] = '86400'
    
    return response

def create_app():
    """Create and configure the web application"""
    # Create app with CORS middleware
    app = web.Application(middlewares=[cors_middleware])
    
    # Add routes
    app.router.add_post('/chat', handle_chat)
    app.router.add_post('/chat/stream', handle_chat_stream)
    app.router.add_get('/conversation/{conversation_id}', handle_conversation_history)
    app.router.add_get('/health', handle_health)
    
    return app

if __name__ == '__main__':
    # Check for API key
    if not os.getenv('ANTHROPIC_API_KEY'):
        print("[ERROR] ANTHROPIC_API_KEY environment variable not set")
        exit(1)
    
    # Create and run app
    app = create_app()
    port = int(os.getenv('PORT', 8080))
    
    print(f"[INFO] Starting webhook chat server on port {port}")
    print(f"[INFO] Model: {MODEL}")
    print(f"[INFO] Features: Thinking mode, Streaming (SSE), Memory")
    print(f"[INFO] Endpoints:")
    print(f"  - POST /chat - Send chat message (non-streaming)")
    print(f"  - POST /chat/stream - Send chat message (SSE streaming)")
    print(f"  - GET /conversation/<id> - Get conversation history")
    print(f"  - GET /health - Health check")
    
    web.run_app(app, host='0.0.0.0', port=port)