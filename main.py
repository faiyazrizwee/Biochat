from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
import os
import re

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# Full conversation memory
# Update your system prompt to be more explicit:
messages = [
    {
        "role": "system",
        "content": (
            "You are BioExpert AI, an expert AI assistant specializing in Biology, Biotechnology, "
            "Bioinformatics, and Pharmacology. You have a PhD-level understanding of these fields.\n\n"
            "IMPORTANT FORMATTING RULES:\n"
            "1. Use proper markdown formatting:\n"
            "   - For main sections use: ## Section Title\n"
            "   - For subsections use: ### Subsection Title\n"
            "   - For key concepts lists: Use ### Key Concepts heading, then bullet points (-)\n"
            "   - For sequential steps/procedures: Use actual sequential numbers (1., 2., 3.)\n"
            "   - For bullet points: Use - or * with a space after\n"
            "   - For bold: **text** ONLY for short key terms or emphasized words\n"
            "   - For italic: *text*\n"
            "2. NEVER use '1.' as a heading - use proper headings like ## DNA Replication\n"
            "3. Use numbered lists ONLY for sequential steps (like experimental procedures)\n"
            "4. Use bullet points (-) for lists of features, types, or items without specific order\n"
            "5. Always put a space after the period in numbers: '1. ' not '1.'\n"
            "6. For lists of topics/concepts (like in key features), use bullet points, NOT numbers\n\n"
            "Example of correct formatting for features:\n"
            "### Key Features\n"
            "- **Local Alignment**: The algorithm identifies...\n"
            "- **Dynamic Programming**: The algorithm employs...\n"
            "- **Scoring System**: The algorithm uses...\n\n"
            "Example of correct formatting for steps:\n"
            "### Steps\n"
            "1. **Initialization**: Create a matrix...\n"
            "2. **Matrix Filling**: Calculate scores...\n"
            "3. **Traceback**: Find optimal alignment...\n"
        )
    }
]

@app.get("/")
def home(request: Request):
    # Send last 10 messages for history display
    history = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"][-10:]
    return templates.TemplateResponse("index.html", {"request": request, "history": history})

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_input = data.get("message")
    messages.append({"role": "user", "content": user_input})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=1500
    )

    assistant_reply = response.choices[0].message.content
    
    # Post-process the AI response to fix formatting issues
    assistant_reply = fix_ai_formatting(assistant_reply)
    
    messages.append({"role": "assistant", "content": assistant_reply})

    return JSONResponse({"reply": assistant_reply})

def fix_ai_formatting(text):
    """Fix common AI formatting issues"""
    if not text:
        return text
    
    # Fix: "1.DNA Replication" -> "1. DNA Replication" (add space after number)
    text = re.sub(r'(\d+)\.([A-Z])', r'\1. \2', text)
    
    # Fix: "1.Transcription" -> "1. Transcription" (lowercase letters too)
    text = re.sub(r'(\d+)\.([a-zA-Z])', r'\1. \2', text)
    
    # Convert incorrectly numbered lists to bullet points
    lines = text.split('\n')
    fixed_lines = []
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Check if this is a numbered item that should be a bullet point
        # Look for patterns like "1. **Feature Name**:" which should be bullet points
        match = re.match(r'^(\d+)\.\s+\*\*([^*]+)\*\*:\s*', stripped)
        if match:
            # Convert to bullet point
            number = match.group(1)
            feature = match.group(2)
            rest = stripped[match.end():]
            
            # If this is part of a "Key Features" or similar section, use bullet
            if i > 0 and any(keyword in lines[i-1].lower() for keyword in 
                           ['features', 'characteristics', 'types', 'components', 'aspects']):
                fixed_lines.append(f"- **{feature}**:{rest}")
            else:
                # Otherwise keep as numbered but ensure proper spacing
                fixed_lines.append(f"{number}. **{feature}**:{rest}")
        else:
            # Check for simple numbered lists that should be bullets
            # Pattern: "1. Some Feature" without bold
            simple_match = re.match(r'^(\d+)\.\s+([A-Z][a-zA-Z\s]+[^:])$', stripped)
            if simple_match:
                number = simple_match.group(1)
                feature = simple_match.group(2)
                
                # Check context - if previous line mentions features/types/etc
                if i > 0:
                    prev_line_lower = lines[i-1].lower()
                    if any(keyword in prev_line_lower for keyword in 
                          ['features', 'types', 'characteristics', 'components', 'includes']):
                        fixed_lines.append(f"- **{feature}**")
                    else:
                        fixed_lines.append(line)
                else:
                    fixed_lines.append(line)
            else:
                fixed_lines.append(line)
    
    text = '\n'.join(fixed_lines)
    
    # Fix excessive bolding - Remove bold from entire sentences
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Remove ** from around entire lines (unless they're short terms)
        if stripped.startswith('**') and stripped.endswith('**'):
            content = stripped[2:-2]
            # Keep bold for short terms (≤ 4 words and no period)
            if len(content.split()) <= 4 and '.' not in content:
                cleaned_lines.append(line)
            else:
                cleaned_lines.append(content)
        else:
            # For lines with partial bold, ensure it's only on key terms
            # Pattern: **Some longer phrase that should not be entirely bold**
            cleaned_line = line
            # Find all bold sections
            for match in re.finditer(r'\*\*([^*]+)\*\*', line):
                bold_text = match.group(1)
                # If bold text is long (more than 3 words), remove the bold
                if len(bold_text.split()) > 3:
                    cleaned_line = cleaned_line.replace(f'**{bold_text}**', bold_text)
            cleaned_lines.append(cleaned_line)
    
    return '\n'.join(cleaned_lines)

@app.post("/new-chat")
async def new_chat():
    global messages
    # Reset memory but keep system prompt
    messages = [
        {
            "role": "system",
            "content": (
                "You are BioExpert AI, an expert AI assistant specializing in Biology, Biotechnology, "
                "Bioinformatics, and Pharmacology. You have a PhD-level understanding of these fields.\n\n"
                "IMPORTANT FORMATTING RULES:\n"
                "1. Use proper markdown formatting:\n"
                "   - For main sections use: ## Section Title\n"
                "   - For subsections use: ### Subsection Title\n"
                "   - For numbered lists: Use actual sequential numbers (1., 2., 3.)\n"
                "   - For bullet points: Use - or * with a space after\n"
                "   - For bold: **text**\n"
                "   - For italic: *text*\n"
                "2. NEVER use '1.' as a heading - use proper headings like ## DNA Replication\n"
                "3. If listing multiple concepts, use proper numbering: 1., 2., 3.\n"
                "4. Always put a space after the period in numbers: '1. ' not '1.'\n\n"
                "Guidelines:\n"
                "1. Provide accurate, detailed explanations with current research references when appropriate\n"
                "2. Use proper scientific terminology and explain complex concepts clearly\n"
                "3. Format responses with clear structure\n"
                "4. Be educational and supportive\n"
                "5. Always prioritize accuracy and scientific rigor"
            )
        }
    ]
    return JSONResponse({"status": "ok"})
