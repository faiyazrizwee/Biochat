# BioChat – A Biology-Oriented AI Chatbot

BioChat is a web-based AI chatbot designed to assist biologists, bioinformaticians, medical professionals, and laboratory technicians in understanding concepts related to life sciences and large language models (LLMs). The chatbot provides clear, step-by-step explanations using biology-relevant examples.

## Key Features

- Biology-focused conversational assistant  
- Tailored explanations for biology, bioinformatics, medical sciences, and laboratory techniques  
- Interactive question–answer learning approach  
- Web interface built with FastAPI  
- Secure integration with OpenAI pre-trained models  
- Rate limiting and timeout handling for production stability  

## Technology Stack

- Backend: FastAPI (Python)  
- Frontend: HTML, CSS, JavaScript  
- Templating Engine: Jinja2  
- Language Model: OpenAI API (pre-trained)  
- Rate Limiting: SlowAPI  
- Server: Uvicorn  
- Version Control: Git and GitHub  

## Project Structure

Biochat/
├── main.py
├── requirements.txt
├── templates/
│   └── index.html
├── static/
│   ├── styles.css
│   └── script.js
├── .gitignore
└── README.md

## Installation and Setup

1. Clone the repository:
   git clone https://github.com/faiyazrizwee/Biochat.git

2. Install dependencies:
   pip install -r requirements.txt

3. Set OpenAI API key:
   export OPENAI_API_KEY="your_openai_api_key"

4. Run the application:
   uvicorn main:app --reload

## Usage

Enter questions related to biology, bioinformatics, or LLM concepts. The chatbot provides structured explanations and follow-up questions.

## License

This project is licensed under the MIT License.

## Disclaimer

This chatbot is intended for educational and research purposes only and does not replace professional medical or laboratory advice.

## Author

Developed by Faiyaz Rizwee
