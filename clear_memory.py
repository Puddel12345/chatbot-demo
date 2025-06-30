#!/usr/bin/env python
"""Clear the chat memory file to fix any corruption"""
import os
import json

# Clear local memory
if os.path.exists('./data/chat_memory.json'):
    print("Clearing local memory file...")
    with open('./data/chat_memory.json', 'w') as f:
        json.dump({}, f)
    print("✅ Local memory cleared")

# Clear Docker memory
if os.path.exists('/app/data/chat_memory.json'):
    print("Clearing Docker memory file...")
    with open('/app/data/chat_memory.json', 'w') as f:
        json.dump({}, f)
    print("✅ Docker memory cleared")

print("Memory files have been reset!")