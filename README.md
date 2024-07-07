# Hotel Booking Chatbot

## Overview

The Hotel Booking Chatbot is an intelligent conversational interface designed to assist users in booking hotel rooms. Leveraging OpenAI's GPT-3.5-turbo model, this chatbot provides a seamless and interactive experience for users throughout the booking process, from collecting user details to finalizing reservations.

## Features

- 🤖 Conversational AI-powered interface for hotel booking
- 🔄 Multi-step booking process with context retention
- 🔌 Integration with external APIs for room options and booking
- ✅ User input validation and error handling
- 💾 Persistent conversation state stored in a SQLite database

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v12.x or later)
- npm (v6.x or later)
- OpenAI API key (for accessing ChatGPT API)

## Setup and Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Bprathmesh/hotel-booking-chatbot.git
   cd hotel-booking-chatbot

2. **Install Dependencies**
    ```bash
    npm install

3. **Set Up Environment Variables
Create a .env file in the root directory and add the following**
    ```bash
    OPENAI_API_KEY=your-openai-api-key
    PORT=5001
    ROOMS_API=https://bot9assignement.deno.dev/rooms
    BOOKING_API=https://bot9assignement.deno.dev/book
    (Replace OPENAI_API_KEY with your own key )

## Generating an OpenAI API Key

An OpenAI API key is required for the chatbot to interact with OpenAI's API and generate responses. Here's how to obtain your key:

**1. Log in or Sign Up:**

Visit the OpenAI platform (https://openai.com/) and either log in to your existing account or create a new one.

**2. Navigate to the API Keys:**

After logging in, access the API section by clicking on your profile picture or username in the top right corner. Select "API Keys" from the dropdown menu.

**3. Create a New Secret Key:**

Click the button labeled "Create new secret key."

**4. Copy and Secure Your Key:**

A dialog box will display your newly generated secret key. Treat this key with care, as you won't be able to view it again after closing the dialog. Click "Copy" to copy the key to your clipboard. Paste the copied key into a secure location, like a password manager, and avoid storing it directly in your code or within the project directory.

**5. Test Your Key (Optional):**

You can validate your key's functionality by using it in the OpenAI Playground (https://platform.openai.com/playground) or integrating it into your application.

**For detailed instructions, refer to the "How to Generate an OpenAI API Key" section in OpenAI's documentation.**
